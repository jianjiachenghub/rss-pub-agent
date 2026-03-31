import type { FetchCheckpoint, RawNewsItem } from "./types.js";

const FOLO_API = "https://api.folo.is";

// Pagination stays serial so the primary list fetch remains stable under rate limits.
const MAX_PAGES = 30;
const PAGE_DELAY_MS = 2000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RETRIES = 3;
const MAX_CONSECUTIVE_FAILURES = 5;
const DEFAULT_PAGE_LIMIT = 100;
const MAX_CONSECUTIVE_OLD_PAGES = 2;

interface FoloListFetchOptions {
  maxItems?: number;
  maxPages?: number;
  maxRetries?: number;
  maxConsecutiveFailures?: number;
  maxConsecutiveOldPages?: number;
  pageTimeoutMs?: number;
  pageLimit?: number;
  withContent?: boolean;
}

interface FoloListFetchDetailedResult {
  items: RawNewsItem[];
  checkpoint: FetchCheckpoint;
}

interface FoloEntry {
  id: string;
  title?: string;
  url?: string;
  content?: string;
  description?: string;
  summary?: string;
  publishedAt?: string;
  insertedAt?: string;
  author?: string;
}

interface FoloFeed {
  id: string;
  title: string;
  url: string;
}

interface FoloEntryEnvelope {
  entries?: FoloEntry;
  feeds?: FoloFeed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomUserAgent(): string {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function buildFoloHeaders(sessionToken: string): Record<string, string> {
  return {
    "User-Agent": getRandomUserAgent(),
    "Content-Type": "application/json",
    accept: "application/json",
    "accept-language": "zh-CN,zh;q=0.9",
    origin: "https://app.folo.is",
    "sec-ch-ua": '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "x-app-name": "Folo Web",
    "x-app-version": "0.4.9",
    Cookie: `__Secure-better-auth.session_token=${sessionToken}`,
  };
}

function getEntryTimestamp(entry?: {
  publishedAt?: string;
  insertedAt?: string;
}): string | null {
  return entry?.publishedAt ?? entry?.insertedAt ?? null;
}

export async function fetchViaFolo(
  feedUrl: string,
  sourceId: string,
  sourceName: string,
  category: string,
  maxItems = 100
): Promise<RawNewsItem[]> {
  const now = new Date().toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = todayStart.getTime() - ONE_DAY_MS;
  const yesterdayEnd = todayStart.getTime();

  const res = await fetch(`${FOLO_API}/feeds?url=${encodeURIComponent(feedUrl)}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": getRandomUserAgent(),
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    throw new Error(`Folo API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as {
    code: number;
    data?: {
      feed?: { id: string; title: string };
      entries?: Array<{
        id: string;
        title?: string;
        url?: string;
        content?: string;
        description?: string;
        summary?: string;
        publishedAt?: string;
        author?: string;
      }>;
    };
  };

  if (json.code !== 0 || !json.data?.entries) {
    throw new Error(`Folo API returned code ${json.code}`);
  }

  return json.data.entries
    .filter((entry) => {
      if (!entry.publishedAt) return false;
      const t = new Date(entry.publishedAt).getTime();
      return t >= yesterdayStart && t < yesterdayEnd;
    })
    .map((entry) => ({
      id: `folo-${entry.id}`,
      title: entry.title ?? "Untitled",
      url: entry.url ?? "",
      content: entry.summary || entry.content || entry.description || "",
      source: sourceName,
      sourceId,
      category,
      publishedAt: entry.publishedAt ?? now,
      fetchedAt: now,
    }))
    .sort((a, b) => {
      const timeA = new Date(a.publishedAt).getTime();
      const timeB = new Date(b.publishedAt).getTime();
      return timeB - timeA;
    })
    .slice(0, maxItems);
}

export async function fetchFoloByList(
  sessionToken: string,
  listId: string,
  sourceId: string,
  sourceName: string,
  category: string,
  maxItems = 120
): Promise<RawNewsItem[]> {
  const result = await fetchFoloByListDetailed(
    sessionToken,
    listId,
    sourceId,
    sourceName,
    category,
    { maxItems }
  );

  return result.items;
}

export async function fetchFoloByListDetailed(
  sessionToken: string,
  listId: string,
  sourceId: string,
  sourceName: string,
  category: string,
  options: FoloListFetchOptions = {}
): Promise<FoloListFetchDetailedResult> {
  if (!sessionToken) {
    throw new Error("FOLO_SESSION_TOKEN not set");
  }

  if (!listId) {
    throw new Error("listId is required for folo-list type");
  }

  const now = new Date().toISOString();
  const allEntries: RawNewsItem[] = [];
  const maxItems = options.maxItems ?? 120;
  const maxPages = options.maxPages ?? MAX_PAGES;
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const maxConsecutiveFailures =
    options.maxConsecutiveFailures ?? MAX_CONSECUTIVE_FAILURES;
  const maxConsecutiveOldPages =
    options.maxConsecutiveOldPages ?? MAX_CONSECUTIVE_OLD_PAGES;
  const pageTimeoutMs = options.pageTimeoutMs ?? 30000;
  const pageLimit = options.pageLimit ?? DEFAULT_PAGE_LIMIT;
  // Metadata-first fetch is more reliable for large read-heavy lists: Folo can return
  // empty `entries` objects for read items when `withContent: true` is requested.
  const withContent = options.withContent ?? false;
  // Strict previous-day window: running on Mar 30 fetches Mar 29 00:00 ~ 23:59:59 only.
  // News from today (Mar 30) is excluded so the daily report covers exactly one calendar day.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = todayStart.getTime() - ONE_DAY_MS;  // lower bound (inclusive)
  const yesterdayEnd = todayStart.getTime();                   // upper bound (exclusive)

  console.log(`[folo-list] Fetching list: ${sourceName} (listId: ${listId})`);
  console.log(`[folo-list] Using session token: ${sessionToken.substring(0, 20)}...`);
  console.log(
    `[folo-list] Target: fetch yesterday's news (${new Date(yesterdayStart).toISOString()} ~ ${new Date(yesterdayEnd).toISOString()}), up to ${maxPages} pages, ${pageLimit} items/page and ${maxItems} items total`
  );

  let publishedAfter: string | null = null;
  let consecutiveOldPages = 0;
  const checkpoint: FetchCheckpoint = {
    sourceId,
    listId,
    publishedAfter,
    pagesFetched: 0,
    pagesSucceeded: 0,
    consecutiveFailures: 0,
    stoppedReason: "running",
    degradedMode: "none",
    updatedAt: now,
  };

  for (let page = 0; page < maxPages; page++) {
    checkpoint.pagesFetched = page + 1;
    checkpoint.updatedAt = new Date().toISOString();

    const body: Record<string, unknown> = {
      listId,
      view: 0,
      withContent,
      limit: pageLimit,
    };

    if (publishedAfter) {
      body.publishedAfter = publishedAfter;
    }

    console.log(`[folo-list] Fetching page ${page + 1}/${maxPages}...`);
    console.log(`[folo-list] POST body:`, JSON.stringify(body));

    let pageData: FoloEntryEnvelope[] | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(`${FOLO_API}/entries`, {
          method: "POST",
          headers: buildFoloHeaders(sessionToken),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(pageTimeoutMs),
        });

        console.log(`[folo-list] HTTP status: ${res.status} ${res.statusText}`);

        if (res.status === 401) {
          checkpoint.degradedMode = "hard";
          throw new Error("Folo session token expired or invalid");
        }

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(
            `Folo API error: ${res.status} ${res.statusText} | ${errorText.substring(0, 200)}`
          );
        }

        const json = (await res.json()) as {
          code: number;
          data?: FoloEntryEnvelope[];
        };

        console.log(
          `[folo-list] Response code: ${json.code}, data length: ${Array.isArray(json.data) ? json.data.length : "N/A"}`
        );

        if (json.code !== 0) {
          throw new Error(`Folo API returned code ${json.code}`);
        }

        pageData = Array.isArray(json.data) ? json.data : [];
        checkpoint.pagesSucceeded += 1;
        checkpoint.consecutiveFailures = 0;
        break;
      } catch (error) {
        console.error(
          `[folo-list] Error on page ${page + 1}, attempt ${attempt}/${maxRetries}:`,
          error
        );

        if (attempt < maxRetries) {
          checkpoint.degradedMode = "soft";
          await sleep(attempt === 1 ? 2000 : attempt === 2 ? 5000 : 10000);
          continue;
        }

        checkpoint.consecutiveFailures += 1;
        if (checkpoint.consecutiveFailures >= maxConsecutiveFailures) {
          checkpoint.degradedMode = "hard";
          checkpoint.stoppedReason = "consecutive_failures";
          checkpoint.updatedAt = new Date().toISOString();
          console.error("[folo-list] Too many consecutive failures, stopping primary fetch.");
          pageData = null;
          break;
        }
      }
    }

    if (pageData === null) {
      if (checkpoint.degradedMode === "hard") break;
      continue;
    }

    if (pageData.length === 0) {
      checkpoint.stoppedReason = "no_more_data";
      console.log(`[folo-list] No more data on page ${page + 1}, stopping.`);
      break;
    }

    let recentCount = 0;
    let tooOldCount = 0;
    let tooNewCount = 0;
    let missingEntryCount = 0;
    let missingTimestampCount = 0;

    for (const item of pageData) {
      const entry = item.entries;
      const feed = item.feeds;

      if (!entry?.id) {
        missingEntryCount++;
        continue;
      }

      const publishedAt = getEntryTimestamp(entry);
      if (!publishedAt) {
        missingTimestampCount++;
        continue;
      }

      const publishedTime = new Date(publishedAt).getTime();
      if (Number.isNaN(publishedTime)) {
        missingTimestampCount++;
        continue;
      }

      if (publishedTime < yesterdayStart) {
        tooOldCount++;
        continue;
      }

      if (publishedTime >= yesterdayEnd) {
        tooNewCount++;
        continue;
      }

      recentCount++;
      allEntries.push({
        id: `folo-${entry.id}`,
        title: entry.title ?? "Untitled",
        url: entry.url ?? "",
        content: entry.summary || entry.description || entry.content || "",
        source: entry.author
          ? `${feed?.title ?? sourceName} - ${entry.author}`
          : feed?.title ?? sourceName,
        sourceId: `${sourceId}-${feed?.id ?? "unknown"}`,
        category,
        publishedAt,
        fetchedAt: new Date().toISOString(),
      });
    }

    console.log(
      `[folo-list] Page ${page + 1}: ${pageData.length} items, ${recentCount} yesterday, ${tooNewCount} today (skipped), ${tooOldCount} too old, ${missingEntryCount} empty entries, ${missingTimestampCount} missing timestamps`
    );

    if (allEntries.length >= maxItems) {
      checkpoint.stoppedReason = "max_items";
      console.log(`[folo-list] Reached max item limit (${maxItems}), stopping.`);
      break;
    }

    // Only count pages where all items are older than yesterday as "old pages".
    // Pages that are all "today" (tooNew) are expected at the start — keep paginating
    // through them to reach yesterday's entries.
    const hasOnlyOldEntries = tooOldCount > 0 && recentCount === 0 && tooNewCount === 0;
    if (hasOnlyOldEntries) {
      consecutiveOldPages += 1;
      if (consecutiveOldPages >= maxConsecutiveOldPages) {
        checkpoint.stoppedReason = "older_than_24h";
        console.log(
          `[folo-list] Saw ${consecutiveOldPages} consecutive pages with only old entries, stopping.`
        );
        break;
      }
    } else {
      consecutiveOldPages = 0;
    }

    const cursorTimestamp =
      getEntryTimestamp(pageData[pageData.length - 1]?.entries) ??
      getEntryTimestamp(
        [...pageData]
          .reverse()
          .find((item) => Boolean(item.entries?.id && getEntryTimestamp(item.entries)))?.entries
      );

    if (cursorTimestamp) {
      publishedAfter = cursorTimestamp;
      checkpoint.publishedAfter = publishedAfter;
      checkpoint.lastSuccessfulPublishedAt = cursorTimestamp;
    } else {
      checkpoint.stoppedReason = "missing_cursor";
      console.log("[folo-list] No usable timestamp in page payload, stopping pagination.");
      break;
    }

    if (page < maxPages - 1) {
      await sleep(PAGE_DELAY_MS + Math.random() * 3000);
    }
  }

  if (checkpoint.stoppedReason === "running") {
    checkpoint.stoppedReason = checkpoint.pagesFetched >= maxPages ? "max_pages" : "completed";
  }
  checkpoint.updatedAt = new Date().toISOString();

  console.log(`[folo-list] Total yesterday's entries: ${allEntries.length}`);

  allEntries.sort((a, b) => {
    const timeA = new Date(a.publishedAt).getTime();
    const timeB = new Date(b.publishedAt).getTime();
    return timeB - timeA;
  });

  const finalEntries = allEntries.slice(0, maxItems);

  console.log(`[folo-list] Returning ${finalEntries.length} entries (from ${allEntries.length} total)`);

  finalEntries.slice(0, 5).forEach((entry, index) => {
    console.log(`[folo-list] Entry ${index + 1}:`);
    console.log(`  Title: ${entry.title}`);
    console.log(`  URL: ${entry.url}`);
    console.log(`  Source: ${entry.source}`);
    console.log(`  Published: ${entry.publishedAt}`);
    console.log(`  Content preview: ${entry.content.substring(0, 100)}...`);
  });

  return { items: finalEntries, checkpoint };
}
