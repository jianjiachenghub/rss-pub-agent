import type { RawNewsItem } from "./types.js";

const FOLO_API = "https://api.folo.is";

// 分页配置
const MAX_PAGES = 10; // 最多抓取 10 页
const PAGE_DELAY_MS = 2000; // 每页间隔 2 秒，防止反爬

/**
 * 延时函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 生成随机用户代理
 */
function getRandomUserAgent(): string {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

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
        "User-Agent": getRandomUserAgent(),
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
 * 
 * 直接通过 POST /entries 获取列表中所有订阅源的最新条目
 * 使用 publishedAfter 游标实现分页抓取
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
  const allEntries: RawNewsItem[] = [];

  // 计算 24 小时前的时间戳
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  console.log(`[folo-list] Fetching list: ${sourceName} (listId: ${listId})`);
  console.log(`[folo-list] Using session token: ${sessionToken.substring(0, 20)}...`);
  console.log(`[folo-list] Target: fetch all news within 24h, up to ${MAX_PAGES} pages`);

  let publishedAfter: string | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const userAgent = getRandomUserAgent();
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      'Content-Type': 'application/json',
      'accept': 'application/json',
      'accept-language': 'zh-CN,zh;q=0.9',
      'origin': 'https://app.folo.is',
      'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'x-app-name': 'Folo Web',
      'x-app-version': '0.4.9',
      'Cookie': `__Secure-better-auth.session_token=${sessionToken}`,
    };

    const body: Record<string, unknown> = {
      listId,
      view: 0,
      withContent: true,
    };

    if (publishedAfter) {
      body.publishedAfter = publishedAfter;
    }

    console.log(`[folo-list] Fetching page ${page + 1}/${MAX_PAGES}...`);
    console.log(`[folo-list] POST body:`, JSON.stringify(body));

    try {
      const res = await fetch(`${FOLO_API}/entries`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });

      console.log(`[folo-list] HTTP status: ${res.status} ${res.statusText}`);

      if (res.status === 401) {
        throw new Error("Folo session token expired or invalid");
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[folo-list] API error on page ${page + 1}: ${res.status} ${res.statusText}`);
        console.error(`[folo-list] Error response body:`, errorText.substring(0, 500));
        break;
      }

      const json = await res.json() as {
        code: number;
        data?: Array<{
          entries: {
            id: string;
            title?: string;
            url?: string;
            content?: string;
            description?: string;
            publishedAt?: string;
            author?: string;
          };
          feeds: {
            id: string;
            title: string;
            url: string;
          };
        }>;
      };

      console.log(`[folo-list] Response code: ${json.code}, data length: ${Array.isArray(json.data) ? json.data.length : 'N/A'}`);

      if (json.code !== 0) {
        console.error(`[folo-list] API returned code ${json.code} on page ${page + 1}`);
        console.error(`[folo-list] Full response:`, JSON.stringify(json).substring(0, 500));
        break;
      }

      const pageData = Array.isArray(json.data) ? json.data : [];
      if (pageData.length === 0) {
        console.log(`[folo-list] No more data on page ${page + 1}, stopping.`);
        break;
      }

      // 过滤 24 小时内的条目，直接使用 entries 数据
      let recentCount = 0;
      let tooOldCount = 0;

      for (const item of pageData) {
        const entry = item.entries;
        const feed = item.feeds;

        if (!entry) continue;

        const publishedTime = entry.publishedAt
          ? new Date(entry.publishedAt).getTime()
          : 0;

        if (publishedTime < oneDayAgo) {
          tooOldCount++;
          continue;
        }

        recentCount++;
        allEntries.push({
          id: `folo-${entry.id}`,
          title: entry.title ?? "Untitled",
          url: entry.url ?? "",
          content: entry.content || entry.description || "",
          source: entry.author
            ? `${feed?.title ?? sourceName} - ${entry.author}`
            : (feed?.title ?? sourceName),
          sourceId: `${sourceId}-${feed?.id ?? "unknown"}`,
          category,
          publishedAt: entry.publishedAt ?? now,
          fetchedAt: now,
        });
      }

      console.log(
        `[folo-list] Page ${page + 1}: ${pageData.length} items, ${recentCount} within 24h, ${tooOldCount} too old`
      );

      // 如果本页数据大部分已超过 24 小时，停止翻页
      if (tooOldCount > 0 && recentCount === 0) {
        console.log(`[folo-list] All items on page ${page + 1} are older than 24h, stopping.`);
        break;
      }

      // 使用最后一条的 publishedAt 作为下一页游标
      const lastEntry = pageData[pageData.length - 1]?.entries;
      if (lastEntry?.publishedAt) {
        publishedAfter = lastEntry.publishedAt;
      } else {
        console.log(`[folo-list] No publishedAt on last entry, stopping pagination.`);
        break;
      }

      // 延时防止请求过快
      if (page < MAX_PAGES - 1) {
        await sleep(PAGE_DELAY_MS + Math.random() * 3000);
      }
    } catch (error) {
      console.error(`[folo-list] Error on page ${page + 1}:`, error);
      break;
    }
  }

  console.log(`[folo-list] Total entries within 24h: ${allEntries.length}`);

  // 按发布时间排序（最新的在前）
  allEntries.sort((a, b) => {
    const timeA = new Date(a.publishedAt).getTime();
    const timeB = new Date(b.publishedAt).getTime();
    return timeB - timeA;
  });

  // 限制总数量，避免过多
  const MAX_TOTAL_ITEMS = 300;
  const finalEntries = allEntries.slice(0, MAX_TOTAL_ITEMS);

  console.log(`[folo-list] Returning ${finalEntries.length} entries (from ${allEntries.length} total)`);

  // 输出前 5 条新闻的详细信息
  finalEntries.slice(0, 5).forEach((entry, index) => {
    console.log(`[folo-list] Entry ${index + 1}:`);
    console.log(`  Title: ${entry.title}`);
    console.log(`  URL: ${entry.url}`);
    console.log(`  Source: ${entry.source}`);
    console.log(`  Published: ${entry.publishedAt}`);
    console.log(`  Content preview: ${entry.content.substring(0, 100)}...`);
  });

  return finalEntries;
}
