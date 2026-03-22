async function test() {
  const feeds = [
    "https://openai.com/blog/rss",
    "https://deepmind.google/blog/rss.xml",
    "https://huggingface.co/blog/feed.xml",
    "https://www.jiqizhixin.com/rss",
    "https://lastweekin.ai/feed",
    "https://rsshub.app/qbitai"
  ];

  for (const url of feeds) {
    console.log(`Testing feed: ${url}`);
    try {
      const res = await fetch(`https://api.follow.is/feeds?url=${encodeURIComponent(url)}`, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 LLM-News-Flow/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        const j = await res.json();
        console.log(`Success, code: ${j.code}, entries: ${j.data?.entries?.length || 0}`);
      }
    } catch (e) {
      console.log(`Failed: ${e.message}`);
    }
    console.log("---");
  }
}
test();
