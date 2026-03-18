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
 * 通过 Folo API 按 listId 拉取（需要 session token 认证）
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

  const now = new Date().toISOString();

  const res = await fetch(`${FOLO_API}/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `authjs.session-token=${sessionToken}`,
      "User-Agent": "Mozilla/5.0 LLM-News-Flow/1.0",
    },
    body: JSON.stringify({ listId }),
    signal: AbortSignal.timeout(20000),
  });

  if (res.status === 401) {
    throw new Error("Folo session token expired");
  }

  if (!res.ok) {
    throw new Error(`Folo API error: ${res.status}`);
  }

  const data = await res.json();
  const entries = (data as { data?: unknown[] }).data ?? [];

  return entries.map((entry: any, i: number) => ({
    id: `folo-list-${sourceId}-${i}-${Date.now()}`,
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
