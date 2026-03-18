import type { RawNewsItem } from "./types.js";

const FOLO_API = "https://api.follow.is/entries";

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min) + min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchFolo(
  sessionToken: string,
  sourceId: string,
  sourceName: string,
  category: string
): Promise<RawNewsItem[]> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  await randomDelay(1000, 3000);

  const res = await fetch(FOLO_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `authjs.session-token=${sessionToken}`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    body: JSON.stringify({
      publishedAfter: yesterday,
    }),
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
