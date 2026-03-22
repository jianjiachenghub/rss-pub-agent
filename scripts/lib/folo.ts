import type { RawNewsItem } from "./types.js";

const FOLO_API = "https://api.follow.is";

/**
 * 通过 Folo API 获取 RSS 源的最新条目
 * 使用 GET /feeds?url=<rss_url>，不需要认证
 * Folo 会返回解析好的条目，部分条目还有 AI 生成的 summary
 */
export async function fetchViaFolo(
  feedUrl: string,
  sourceId: string,
  sourceName: string,
  category: string
): Promise<RawNewsItem[]> {
  const now = new Date().toISOString();

  const res = await fetch(
    `${FOLO_API}/feeds?url=${encodeURIComponent(feedUrl)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 LLM-News-Flow/1.0",
      },
      signal: AbortSignal.timeout(20000),
    }
  );

  if (!res.ok) {
    throw new Error(`Folo API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json() as {
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

  return json.data.entries.map((entry) => ({
    id: `folo-${entry.id}`,
    title: entry.title ?? "Untitled",
    url: entry.url ?? "",
    content: entry.summary || entry.content || entry.description || "",
    source: sourceName,
    sourceId,
    category,
    publishedAt: entry.publishedAt ?? now,
    fetchedAt: now,
  }));
}

/**
 * Folo 列表条目接口
 */
interface FoloListEntry {
  id: string;
  title?: string;
  url?: string;
  content?: string;
  description?: string;
  summary?: string;
  publishedAt?: string;
  author?: string;
  feed?: {
    id: string;
    title: string;
    url: string;
  };
}

/**
 * 通过 Folo API 按 listId 拉取（需要 session token 认证）
 * 
 * 从 Follow 列表中获取所有订阅源的最新条目
 * 每个条目会保留原始 feed 信息（source）
 * 
 * @param sessionToken - Follow 的 session token（从浏览器 Cookie 获取）
 * @param listId - Follow 列表 ID
 * @param sourceId - 配置中的源 ID
 * @param sourceName - 配置中的源名称（列表名称）
 * @param category - 分类
 * @returns 原始新闻条目数组
 */
export async function fetchFoloByList(
  sessionToken: string,
  listId: string,
  sourceId: string,
  sourceName: string,
  category: string
): Promise<RawNewsItem[]> {
  if (!sessionToken) {
    throw new Error("FOLO_SESSION_TOKEN not set");
  }

  if (!listId) {
    throw new Error("listId is required for folo-list type");
  }

  const now = new Date().toISOString();

  console.log(`[folo-list] Fetching list: ${sourceName} (listId: ${listId})`);

  const res = await fetch(`${FOLO_API}/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `authjs.session-token=${sessionToken}`,
      "User-Agent": "Mozilla/5.0 LLM-News-Flow/1.0",
    },
    body: JSON.stringify({ listId }),
    signal: AbortSignal.timeout(30000), // 列表可能内容较多，增加超时
  });

  if (res.status === 401) {
    throw new Error("Folo session token expired or invalid");
  }

  if (!res.ok) {
    throw new Error(`Folo API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json() as {
    code: number;
    data?: {
      entries?: FoloListEntry[];
    };
  };

  if (json.code !== 0) {
    throw new Error(`Folo API returned code ${json.code}`);
  }

  const entries = json.data?.entries ?? [];

  console.log(`[folo-list] Got ${entries.length} entries from list: ${sourceName}`);

  // 过滤最近 24 小时的内容
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentEntries = entries.filter((entry) => {
    if (!entry.publishedAt) return true;
    return new Date(entry.publishedAt).getTime() > oneDayAgo;
  });

  console.log(`[folo-list] ${recentEntries.length} entries within 24h`);

  return recentEntries.map((entry, i) => ({
    id: `folo-list-${entry.id || i}-${Date.now()}`,
    title: entry.title ?? "Untitled",
    url: entry.url ?? "",
    content: entry.summary || entry.content || entry.description || "",
    // 使用原始 feed 的名称作为 source，让用户知道内容来自哪个具体源
    source: entry.feed?.title || sourceName,
    sourceId: `${sourceId}-${entry.feed?.id || i}`,
    category,
    publishedAt: entry.publishedAt ?? now,
    fetchedAt: now,
  }));
}
