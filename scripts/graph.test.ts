import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PipelineStateType } from "./state.js";

const mocks = vi.hoisted(() => ({
  loadConfig: vi.fn(async () => ({ date: "2026-10-27" })),
  fetchPrimaryNode: vi.fn(async () => ({})),
  preFilterNode: vi.fn(async () => ({})),
  fetchCoverageNode: vi.fn(async () => ({})),
  editorialAgendaNode: vi.fn(async () => ({})),
  gateKeepNode: vi.fn(async () => ({})),
  scoreNode: vi.fn(async () => ({})),
  enrichSelectedNode: vi.fn(async () => ({})),
  insightNode: vi.fn(async () => ({})),
  generateDailyNode: vi.fn(async () => ({ dailyMarkdown: "完整日报" })),
  podcastNode: vi.fn<() => Promise<Partial<PipelineStateType>>>(),
  podcastSoloNode: vi.fn<() => Promise<Partial<PipelineStateType>>>(),
  platformsNode: vi.fn<() => Promise<Partial<PipelineStateType>>>(),
  publishNode: vi.fn(async (_state: PipelineStateType) => ({})),
  notifyNode: vi.fn(async () => ({})),
}));

vi.mock("./nodes/load-config.js", () => ({ loadConfig: mocks.loadConfig }));
vi.mock("./nodes/fetch-primary.js", () => ({ fetchPrimaryNode: mocks.fetchPrimaryNode }));
vi.mock("./nodes/pre-filter.js", () => ({ preFilterNode: mocks.preFilterNode }));
vi.mock("./nodes/fetch-coverage.js", () => ({ fetchCoverageNode: mocks.fetchCoverageNode }));
vi.mock("./nodes/editorial-agenda.js", () => ({ editorialAgendaNode: mocks.editorialAgendaNode }));
vi.mock("./nodes/gate-keep.js", () => ({ gateKeepNode: mocks.gateKeepNode }));
vi.mock("./nodes/score.js", () => ({ scoreNode: mocks.scoreNode }));
vi.mock("./nodes/enrich-selected.js", () => ({ enrichSelectedNode: mocks.enrichSelectedNode }));
vi.mock("./nodes/insight.js", () => ({ insightNode: mocks.insightNode }));
vi.mock("./nodes/generate-daily.js", () => ({ generateDailyNode: mocks.generateDailyNode }));
vi.mock("./nodes/podcast.js", () => ({ podcastNode: mocks.podcastNode }));
vi.mock("./nodes/podcast-solo.js", () => ({ podcastSoloNode: mocks.podcastSoloNode }));
vi.mock("./nodes/platforms.js", () => ({ platformsNode: mocks.platformsNode }));
vi.mock("./nodes/publish.js", () => ({ publishNode: mocks.publishNode }));
vi.mock("./nodes/notify.js", () => ({ notifyNode: mocks.notifyNode }));

import { pipeline } from "./graph.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("parallel podcast output graph", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts all three output branches together and publishes their merged state exactly once", async () => {
    const duo = deferred<Partial<PipelineStateType>>();
    const solo = deferred<Partial<PipelineStateType>>();
    const platforms = deferred<Partial<PipelineStateType>>();
    const allStarted = deferred<void>();
    let started = 0;
    const branch = (gate: typeof duo) => async () => {
      started += 1;
      if (started === 3) allStarted.resolve();
      return gate.promise;
    };
    mocks.podcastNode.mockImplementation(branch(duo));
    mocks.podcastSoloNode.mockImplementation(branch(solo));
    mocks.platformsNode.mockImplementation(branch(platforms));

    const running = pipeline.invoke({});
    await allStarted.promise;
    expect(mocks.publishNode).not.toHaveBeenCalled();
    solo.resolve({ podcastSoloScript: "完整单播稿" });
    duo.resolve({ podcast: { script: "双人稿" } });
    expect(mocks.publishNode).not.toHaveBeenCalled();
    platforms.resolve({ platformContents: { brief: "简报" } });
    const result = await running;

    expect(result.podcast.script).toBe("双人稿");
    expect(result.podcastSoloScript).toBe("完整单播稿");
    expect(result.platformContents.brief).toBe("简报");
    expect(mocks.publishNode).toHaveBeenCalledTimes(1);
    expect(mocks.notifyNode).toHaveBeenCalledTimes(1);
    expect(mocks.publishNode.mock.calls[0][0]).toMatchObject({
      podcast: { script: "双人稿" },
      podcastSoloScript: "完整单播稿",
      platformContents: { brief: "简报" },
    });
  });

  it("still publishes legacy outputs when the solo branch records an isolated failure", async () => {
    mocks.podcastNode.mockResolvedValue({ podcast: { script: "双人稿" } });
    mocks.podcastSoloNode.mockResolvedValue({
      podcastSoloScript: "",
      errors: [{ node: "podcastSolo", message: "invalid date", timestamp: "2026-10-28T14:00:00Z" }],
    });
    mocks.platformsNode.mockResolvedValue({ platformContents: { brief: "简报" } });

    const result = await pipeline.invoke({});
    expect(result.errors).toHaveLength(1);
    expect(result.podcast.script).toBe("双人稿");
    expect(result.platformContents.brief).toBe("简报");
    expect(mocks.publishNode).toHaveBeenCalledTimes(1);
  });
});
