# AI News Aggregation - GitHub Projects & RSS Feeds Research

## Date: 2026-03-18

---

## Part 1: GitHub Projects Analyzed

### 1. foorilla/allainews_sources (Best curated feed list)
- **URL**: https://github.com/foorilla/allainews_sources
- **What it is**: 200+ AI/ML/Data Science news sources with RSS feed URLs
- **Data strategy**: Static curated list; was the backend for allainews.com (defunct 07-2024), now at foorilla.com/media/
- **Key pattern**: Categorized by type (news, academic, podcast, newsletter) with both website URL and RSS URL

### 2. finaldie/auto-news (Most sophisticated architecture)
- **URL**: https://github.com/finaldie/auto-news
- **What it is**: Multi-source aggregator with LLM (ChatGPT/Gemini/Ollama via LangChain)
- **Sources**: RSS, Twitter/X, YouTube, Reddit, Web Articles, personal journal notes
- **Data strategy**: Pull from multiple source types -> LLM deduplication & summarization -> Web + mobile app delivery
- **Key pattern**: Noise reduction via LLM; multi-modal input (not just RSS)

### 3. hrnrxb/AI-News-Aggregator-Bot (Telegram delivery)
- **URL**: https://github.com/hrnrxb/AI-News-Aggregator-Bot
- **What it is**: Python Telegram bot for real-time AI news
- **Sources**: HuggingFace, OpenAI, DeepMind, Google AI, Microsoft AI, Meta AI, arXiv, Hacker News, The Verge, GitHub Trending
- **Data strategy**: feedparser + BeautifulSoup4 scraping + GitHub Actions scheduled execution
- **Key pattern**: Combines RSS parsing with web scraping for sources without feeds

### 4. mehdi1514/My-AI-News-Aggregator (Email delivery)
- **URL**: https://github.com/mehdi1514/My-AI-News-Aggregator
- **What it is**: Daily AI news email digest
- **Sources**: OpenAI (rss.xml), Wired AI, Anthropic, YouTube channels
- **Data strategy**: feedparser + Gemini for summarization/ranking + email delivery
- **Key pattern**: AI-powered ranking of articles by importance before delivery

### 5. RSS-Renaissance/awesome-AI-feeds (OPML import-ready)
- **URL**: https://github.com/RSS-Renaissance/awesome-AI-feeds
- **What it is**: OPML file with 71 AI/ML feeds ready for RSS reader import
- **Data strategy**: Community-maintained OPML; importable into any RSS reader
- **Key pattern**: OPML format for easy bulk import

---

## Part 2: Patterns Worth Adopting

1. **LLM-powered deduplication & ranking**: Multiple projects use AI to filter noise. Same story appears on 5+ sources; LLM identifies duplicates and picks the best version.

2. **Hybrid collection (RSS + scraping)**: Many important sources (Anthropic, some Chinese media) lack official RSS feeds. Projects use Playwright/BeautifulSoup to scrape and generate RSS.

3. **GitHub Actions as scheduler**: Free, reliable cron. Most projects run on hourly or daily GitHub Actions schedules.

4. **RSSHub for missing feeds**: Chinese sources and many modern sites lack RSS. RSSHub (rsshub.app) generates feeds for 1000+ sites.

5. **Community-maintained RSS for sites without official feeds**: Anthropic notably has no official RSS. Community repos (taobojlen/anthropic-rss-feed, conoro/anthropic-engineering-rss-feed) scrape and publish XML via GitHub.

6. **Multi-tier delivery**: Best projects offer multiple output channels (email, Telegram, Notion, web app).

---

## Part 3: Notable Observations

- **Anthropic has NO official RSS feed** - requires community scraping solutions
- **The Batch (Andrew Ng) has no standard RSS** - email-only newsletter; may work via Ghost RSS pattern
- **Chinese AI media RSS is fragile** - 机器之心 has official RSS; 量子位 and AI科技评论 require RSSHub or WeChat scraping tools
- **arXiv feeds are high-volume** - cs.LG alone can have 100+ papers/day; needs filtering
- **Many feeds from 2020-era lists are dead** - about 30-40% of URLs from older curated lists no longer work

---

## Part 3: Complete RSS Feed List

See `ai-rss-feeds.json` for the full structured list. Summary by category:

| Category | Count | Key Sources |
|----------|-------|-------------|
| AI Research Labs | 13 | OpenAI, Anthropic*, DeepMind, Meta AI, Microsoft, AWS, NVIDIA, BAIR |
| AI News Sites | 16 | The Verge, TechCrunch, VentureBeat, MIT Tech Review, Wired, Ars Technica |
| Academic/Research | 7 | arXiv (5 categories), MIT News, JMLR, Distill |
| Open Source | 6 | HuggingFace, GitHub Blog, TensorFlow, LangChain, EleutherAI, fast.ai |
| Chinese AI Media | 5 | 机器之心, 量子位*, 雷锋网/AI科技评论*, 36氪* |
| Newsletters/Blogs | 16 | Simon Willison, The Batch*, Latent Space, Last Week in AI, Karpathy |
| Community | 6 | Reddit ML, Reddit AI, Hacker News, Towards Data Science |
| **Total** | **69** | *asterisk = requires workaround (scraping/RSSHub)* |
