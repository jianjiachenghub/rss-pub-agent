import type { RawNewsItem } from "./types.js";

const FOLO_API = "https://api.follow.is";

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
  insertedAt?: string;
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
 * 支持分页抓取，使用 publishedAfter 作为游标
 * 会抓取最近 24 小时的所有新闻
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
  let pageCount = 0;
  let hasMoreData = true;

  // 计算 24 小时前的时间戳
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  console.log(`[folo-list] Fetching list: ${sourceName} (listId: ${listId})`);
  console.log(`[folo-list] Using session token: ${sessionToken.substring(0, 20)}...`);
  console.log(`[folo-list] Target: fetch all news within 24h`);

  // 1. 首先获取订阅源列表
  const feeds = await fetchFoloListFeeds(sessionToken, listId);
  console.log(`[folo-list] Got ${feeds.length} feeds from list`);

  // 2. 逐个获取每个订阅源的新闻条目
  for (let i = 0; i < feeds.length; i++) {
    const feed = feeds[i];
    console.log(`[folo-list] Fetching feed ${i + 1}/${feeds.length}: ${feed.title} (${feed.url})`);
    
    try {
      // 使用 fetchViaFolo 函数获取每个订阅源的新闻
      const items = await fetchViaFolo(
        feed.url,
        `${sourceId}-${feed.id}`,
        feed.title,
        category
      );
      
      console.log(`[folo-list] Feed ${feed.title} returned ${items.length} items`);
      
      // 过滤 24 小时内的内容
      const recentItems = items.filter((item) => {
        if (!item.publishedAt) return false;
        const itemTime = new Date(item.publishedAt).getTime();
        return itemTime > oneDayAgo;
      });
      
      console.log(`[folo-list] Feed ${feed.title} has ${recentItems.length} items within 24h`);
      
      allEntries.push(...recentItems);
      
      // 添加延时，避免请求过快
      if (i < feeds.length - 1) {
        console.log(`[folo-list] Waiting ${PAGE_DELAY_MS}ms before next feed...`);
        await sleep(PAGE_DELAY_MS);
      }
    } catch (error) {
      console.error(`[folo-list] Error fetching feed ${feed.title}:`, error);
      // 继续处理下一个订阅源
      continue;
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

  console.log(`[folo-list] Returning ${finalEntries.length} entries (limited from ${allEntries.length})`);

  // 输出前 10 条新闻的详细信息
  finalEntries.slice(0, 10).forEach((entry, index) => {
    console.log(`[folo-list] Entry ${index + 1}:`);
    console.log(`  Title: ${entry.title}`);
    console.log(`  URL: ${entry.url}`);
    console.log(`  Source: ${entry.source}`);
    console.log(`  Published: ${entry.publishedAt}`);
    console.log(`  Content preview: ${entry.content.substring(0, 100)}...`);
    console.log(`  --------------------`);
  });

  return finalEntries;
}

/**
 * 从 Folo 列表中获取订阅源列表
 */
async function fetchFoloListFeeds(sessionToken: string, listId: string): Promise<Array<{ id: string; title: string; url: string }>> {
  const userAgent = getRandomUserAgent();
  const headers = {
    'User-Agent': userAgent,
    'Content-Type': 'application/json',
    'accept': 'application/json',
    'accept-language': 'zh-CN,zh;q=0.9',
    'origin': 'https://app.follow.is',
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

  const body = {
    listId,
    view: 1,
  };

  const res = await fetch(`${FOLO_API}/entries`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (res.status === 401) {
    throw new Error("Folo session token expired or invalid");
  }

  if (!res.ok) {
    throw new Error(`Folo API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json() as {
    code: number;
    data?: Array<{
      feeds: {
        id: string;
        title: string;
        url: string;
      };
    }>;
  };

  if (json.code !== 0) {
    throw new Error(`Folo API returned code ${json.code}`);
  }

  const pageData = Array.isArray(json.data) ? json.data : [];
  
  // 提取订阅源信息，去重
  const feedsSet = new Set<string>();
  const feeds: Array<{ id: string; title: string; url: string }> = [];
  
  for (const item of pageData) {
    if (item.feeds && item.feeds.url) {
      const feedKey = item.feeds.url;
      if (!feedsSet.has(feedKey)) {
        feedsSet.add(feedKey);
        feeds.push({
          id: item.feeds.id,
          title: item.feeds.title,
          url: item.feeds.url,
        });
      }
    }
  }

  return feeds;
}
