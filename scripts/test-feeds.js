const FOLO_API = "https://api.follow.is";

const urls = [
  "https://rsshub.app/36kr/motif/ai",
  "https://rsshub.app/qbitai",
  "https://rsshub.app/leiphone/category/ai",
  "https://rsshub.app/sspai/matrix",
  "https://rsshub.app/github/trending/daily/any",
  "https://rsshub.app/hellogithub/volume",
  "https://rsshub.app/36kr/newsflashes",
  "https://rsshub.app/wallstreetcn/news/global",
  "https://rsshub.app/cls/telegraph",
  "https://rsshub.app/xueqiu/hots",
  "https://rsshub.app/eastmoney/report",
  "https://rsshub.app/twitter/user/elonmusk",
  "https://rsshub.app/reddit/subreddit/MachineLearning",
  "https://rsshub.app/douyin/trending"
];

async function testFeeds() {
  for (const url of urls) {
    try {
      const foloUrl = `${FOLO_API}/feeds?url=${encodeURIComponent(url)}`;
      const res = await fetch(foloUrl, { 
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) {
        console.log(`[FAIL] ${url} (HTTP ${res.status})`);
        continue;
      }
      const json = await res.json();
      if (json.code === 0 && json.data?.entries?.length > 0) {
        console.log(`[OK]   ${url} (${json.data.entries.length} entries)`);
      } else {
        console.log(`[EMPTY]${url} (Code: ${json.code})`);
      }
    } catch (err) {
      console.log(`[ERR]  ${url} (${err.message})`);
    }
  }
}

testFeeds();
