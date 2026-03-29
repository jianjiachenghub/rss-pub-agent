# 数据采集架构与源管理策略

为了保证每日生成的 7 大分类（🤖 AI 领域 / 💻 科技 / ⚙️ 软件工程 / 💼 商业财经 / 📈 投资理财 / 🌍 时政军事 / 📱 社交媒体）内容的**广泛性**与**稳定性**，系统采用了分层的数据采集架构。

## 1. 核心采集引擎：Folo API 统一代理

所有的数据抓取流程均统一流经 `folo` 节点。通过 Folo (follow.is) 的公开 API 代理抓取有以下核心优势：
- **统一出口**：系统内无需维护复杂的 XML/JSON/HTML 解析逻辑。
- **自带缓存与 AI 摘要**：Folo 平台本身带有分布式缓存，部分订阅源还会附带 Folo 官方 AI 生成的 `summary` 字段，大幅减少后期 LLM 的 Token 消耗。
- **抗反爬**：大部分具备基础反爬策略的站点（如科技媒体博客）对 Folo 节点的抓取更为友好。

## 2. 三层数据源策略 (The 3-Layer Sourcing Strategy)

由于传统的统一公共节点（如公共 RSSHub 实例）存在极高的 404/超时 风险，我们对 `feeds.json` 实施了精细化的三层降级配置：

### ① 直连官方 RSS（最稳定层）
**适用场景**：提供官方标准 XML 订阅输出的海外科技大厂、知名开源项目。
**实现方式**：URL 指向官方 RSS，但配置为 `type: "folo"` 利用 Folo 作为解析代理。
**包含源举例**：
- *🤖 AI 领域*：OpenAI Blog, Google DeepMind, Hugging Face
- *⚙️ 软件工程*：GitHub Blog, LangChain Blog
- *💻 科技*：TechCrunch, Ars Technica

### ② FeedX 全文代理（中文核心新闻层）
**适用场景**：本身不提供 RSS，但具有极高新闻价值的顶尖中文商业、时政与国际媒体。
**实现方式**：利用著名的开源驱动代理 `feedx.net/rss/*` 提供稳定、高质量的全文 XML 数据提取，同时经过 Folo 代理。
**包含源举例**：
- *💼 商业财经*：FT中文网、路透中文网、日经中文网
- *🌍 时政军事*：纽约时报中文、BBC中文、澎湃新闻、联合早报

### ③ Folo-Proxied RSSHub（社区与热搜补充层）
**适用场景**：强依赖社区生态、无官当暴露接口的平台（如微博、知乎、GitHub Trending 等）。
**实现方式**：仅保留经过连通性严格测试后**确认存活**的极少数 RSSHub 官方提供路由。
**包含源举例**：
- *📱 社交媒体*：微博热搜 (`/weibo/search/hot`)、知乎热榜 (`/zhihu/hotlist`)、X/Twitter 个人时间线 (`/twitter/user/elonmusk`)
- *💻 科技社区*：Hacker News、Solidot、HelloGitHub

## 3. 已验证舍弃的无效源
如果在后续运营中发现数据量不足，**切勿直接恢复以下 RSSHub 路由**（经验证目前极不稳定或被永久封禁）：
❌ *36氪系列* (`/36kr/motif/ai`, `/36kr/newsflashes`)
❌ *金融短讯* (`/wallstreetcn/news/global`, `/cls/telegraph`)
❌ *社区与短视频* (`/reddit/...`, `/douyin/trending`)
❌ *国内股评* (`/xueqiu/hots`, `/eastmoney/report`)

对这些类的扩充应该侧重于寻找新的 `FeedX` 路由或者将其平迁至个人的自部署 RSSHub 实例。

## 4. `folo-list` 个人列表接管（进阶方案）

在 `feeds.json` 的顶部，系统保留了一个 `FOLO_LIST_ID` 配置项：
```json
{
  "id": "folo-ai-list",
  "type": "folo-list",
  "listId": "258516112881818624"
}
```
**工作原理**：
如果用户在环境变量中提供有效的 `FOLO_SESSION_TOKEN`，系统能够通过 `POST /entries` 直接拉取用户在 Follow App 中手动维护的任何订阅列表。
**优势**：实现代码与源配置解耦。用户可通过手机/网页端的 Follow 图形界面随时增删源，爬虫自动继承最新配置。
