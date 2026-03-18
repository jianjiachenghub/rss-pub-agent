import type { RawNewsItem } from "./types.js";

const FOLO_API = "https://api.follow.is";

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min) + min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchFolo(
  sessionToken: string,
  sourceId: string,
  sourceName: string,
  category: string,
  listId?: string
): Promise<RawNewsItem[]> {
  if (!sessionToken) {
    throw new Error("FOLO_SESSION_TOKEN not set");
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  await randomDelay(500, 1500);

  const body: Record<string, unknown> = {
    publishedAfter: yesterday,
  };
  if (listId) {
    body.listId = listId;
  }

  const res = await fetch(`${FOLO_API}/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `authjs.session-token=${sessionToken}`,
      "User-Agent": "Mozilla/5.0 LLM-News-Flow/1.0",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (res.status === 401) {
    throw new Error("Folo session token expired - please update FOLO_SESSION_TOKEN");
  }

  if (!res.ok) {
    throw new Error(`Folo API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const entries = (data as { data?: unknown[] }).data ?? [];

  return entries.map((entry: any, i: number) => ({
    id: `${sourceId}-${i}-${Date.now()}`,
    title: entry.title ?? "Untitled",
    url: entry.url ?? "",
    content: entry.content ?? entry.description ?? "",
    source: sourceName,
    sourceId,
    category,
    publishedAt: entry.publishedAt ?? now,
    fetchedAt: now,
  }));
}
