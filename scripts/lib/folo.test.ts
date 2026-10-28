import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchFoloByListDetailed } from "./folo.js";

vi.mock("./runtime-options.js", () => ({
  getTargetDate: () => "2026-10-27",
}));

const options = { maxPages: 1, maxRetries: 1, pageDelayMs: 0, maxItems: 100 };

function entry(id: string, feedId = "101", publishedAt = "2026-10-27T10:00:00.000Z") {
  return {
    entries: {
      id,
      title: `News ${id}`,
      url: `https://example.test/news/${id}`,
      summary: `Summary ${id}`,
      publishedAt,
    },
    feeds: { id: feedId, title: `Source ${feedId}` },
  };
}

function rows(data: ReturnType<typeof entry>[], status = 200) {
  return new Response(JSON.stringify({ code: status === 200 ? 0 : 1, data }), { status });
}

function membership(feedIds: string[]) {
  return new Response(JSON.stringify({ code: 0, data: { list: { id: "999", feedIds } } }));
}

function fetchList(overrides = {}) {
  return fetchFoloByListDetailed("test-session", "999", "primary", "Daily", "ai", {
    ...options,
    ...overrides,
  });
}

describe("Folo list reconciliation", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("recovers missing member-feed news, deduplicates URLs, and keeps only the Shanghai target day", async () => {
    const existing = entry("existing");
    const duplicate = entry("duplicate");
    duplicate.entries.url = existing.entries.url;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/lists?")) return membership(["101", "102", "101"]);
      const body = JSON.parse(String(init?.body));
      if (body.listId) return rows([existing]);
      if (body.feedId === "101") {
        return rows([
          entry("today", "101", "2026-10-27T16:00:00.000Z"),
          duplicate,
          entry("recovered", "101", "2026-10-26T17:00:00.000Z"),
          entry("too-old", "101", "2026-10-26T15:59:59.999Z"),
        ]);
      }
      return rows([entry("second-source", "102")]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchList();

    expect(result.items.map((item) => item.id).sort()).toEqual([
      "folo-existing", "folo-recovered", "folo-second-source",
    ]);
    expect(result.checkpoint).toMatchObject({
      memberFeedsChecked: 2,
      memberFeedsFailed: 0,
      memberItemsAdded: 2,
    });
    expect(result.sourceErrors).toEqual([]);
    const memberRequests = fetchMock.mock.calls
      .filter(([, init]) => init?.body)
      .map(([, init]) => JSON.parse(String(init?.body)))
      .filter((body) => body.feedId);
    expect(memberRequests.map((body) => body.feedId)).toEqual(["101", "102"]);
    expect(memberRequests.every((body) => body.publishedAfter === "2026-10-27T16:00:00.000Z")).toBe(true);
  });

  it("keeps the normal list path for a healthy aggregate", async () => {
    const fetchMock = vi.fn(async () => rows(Array.from({ length: 20 }, (_, i) => entry(`${i}`))));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchList();

    expect(result.items).toHaveLength(20);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.checkpoint.memberFeedsChecked).toBeUndefined();
  });

  it("preserves recovered news and reports individual member failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/lists?")) return membership(["101", "102"]);
      const body = JSON.parse(String(init?.body));
      if (body.listId) return rows([entry("existing")]);
      if (body.feedId === "101") return rows([], 503);
      return rows([entry("recovered", "102")]);
    }));

    const result = await fetchList();

    expect(result.items).toHaveLength(2);
    expect(result.checkpoint).toMatchObject({ memberFeedsFailed: 1, degradedMode: "soft" });
    expect(result.sourceErrors).toHaveLength(1);
    expect(result.sourceErrors![0]).toContain("101");
  });

  it("keeps original items and exposes a list-metadata failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      url.includes("/lists?") ? rows([], 404) : rows([entry("existing")])
    ));

    const result = await fetchList();

    expect(result.items.map((item) => item.id)).toEqual(["folo-existing"]);
    expect(result.checkpoint.degradedMode).toBe("soft");
    expect(result.sourceErrors).toEqual(["Folo list membership: Folo list metadata returned HTTP 404"]);
  });

  it("paginates member feeds and stops when the target date has been exhausted", async () => {
    const cursors: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/lists?")) return membership(["101"]);
      const body = JSON.parse(String(init?.body));
      if (body.listId) return rows([]);
      cursors.push(body.publishedAfter);
      return cursors.length === 1
        ? rows([entry("a", "101", "2026-10-27T12:00:00.000Z"), entry("b", "101", "2026-10-27T11:00:00.000Z")])
        : rows([entry("c", "101", "2026-10-26T17:00:00.000Z"), entry("old", "101", "2026-10-26T15:00:00.000Z")]);
    }));

    const result = await fetchList({ maxPages: 3, pageLimit: 2 });

    expect(result.items.map((item) => item.id)).toEqual(["folo-a", "folo-b", "folo-c"]);
    expect(cursors).toEqual(["2026-10-27T16:00:00.000Z", "2026-10-27T11:00:00.000Z"]);
  });

  it("honors the final item cap after reconciliation", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/lists?")) return membership(["101"]);
      const body = JSON.parse(String(init?.body));
      return body.listId ? rows([]) : rows([entry("a"), entry("b"), entry("c")]);
    }));

    expect((await fetchList({ maxItems: 2 })).items).toHaveLength(2);
  });

  it("stops immediately on rejected authentication instead of checking all members", async () => {
    const fetchMock = vi.fn(async () => rows([], 401));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchList({ maxRetries: 3 })).rejects.toThrow("Folo session token expired or invalid");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports primary fetch exhaustion rather than returning zero source errors", async () => {
    const fetchMock = vi.fn(async () => rows([], 503));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchList({ maxConsecutiveFailures: 1 });

    expect(result.checkpoint.degradedMode).toBe("hard");
    expect(result.sourceErrors).toEqual(["Folo list 999: consecutive_failures"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
