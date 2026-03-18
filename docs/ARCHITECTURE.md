# LLM News Flow — 架构设计文档

## 1. 系统概述

LLM News Flow 是一个 LLM 驱动的个人新闻聚合系统，每日自动运行以下流程：

1. **数据采集** — 通过 Folo API 从 20+ 数据源并发拉取新闻
2. **三阶筛选** — Gate-Keep 去噪 → Score 六维评分 → Insight 深度洞察
3. **内容生成** — Markdown 日报 + 播客脚本 + 多平台文案
4. **分发推送** — 文件写入 + Telegram/微信通知

## 2. 管线架构

### 2.1 LangGraph 编排

管线采用 [LangGraph.js](https://github.com/langchain-ai/langgraphjs) 编排，10 个节点形成 DAG：

```
START → loadConfig → fetch → gateKeep → score → insight → generateDaily
                                                              │
                                                      ┌───────┴───────┐
                                                      ▼               ▼
                                                 podcastGen      platformsGen
                                                      │               │
                                                      └───────┬───────┘
                                                              ▼
                                                          publish → notify → END
```

- **顺序段**：loadConfig → fetch → gateKeep → score → insight → generateDaily
- **并行扇出**：generateDaily 完成后，podcastGen 和 platformsGen 并行执行
- **扇入汇合**：两者都完成后进入 publish → notify

### 2.2 State 定义 (`scripts/state.ts`)

使用 LangGraph `Annotation.Root` 定义管线状态：

| 字段 | 类型 | 说明 |
|------|------|------|
| `config` | `PipelineConfig` | feeds + interests 配置 |
| `platformConfig` | `PlatformConfig` | 平台分发配置 |
| `rawItems` | `RawNewsItem[]` | 原始抓取的新闻条目 |
| `gateKeepResults` | `GateKeepResult[]` | Gate-Keep 判定结果 |
| `passedItems` | `RawNewsItem[]` | 通过筛选的条目 |
| `scoredItems` | `ScoredNewsItem[]` | 带六维评分的条目 |
| `insights` | `NewsInsight[]` | 结构化洞察 |
| `dailyMarkdown` | `string` | 日报 Markdown |
| `podcast` | `PodcastData` | 播客脚本 + 音频 URL |
| `platformContents` | `PlatformContents` | 各平台分发文案 |
| `date` | `string` | 当天日期 (YYYY-MM-DD) |
| `errors` | `PipelineError[]` | 累积错误 (concat reducer) |
| `tokenUsage` | `number` | LLM token 消耗 (sum reducer) |

## 3. 数据采集层

### 3.1 Folo API（主力方案）

所有数据源默认通过 [Folo API](https://follow.is) 拉取：

```
GET https://api.follow.is/feeds?url={rss_url}
```

优势：
- **无需认证** — 公开 API，直接传 RSS URL
- **无需部署** — Folo 服务端完成 RSS 解析、缓存
- **AI 摘要** — 部分条目自带 Folo 生成的 `summary` 字段
- **稳定性高** — Folo 有容错和重试机制

### 3.2 数据源类型

| 类型 | 方式 | 认证 | 场景 |
|------|------|------|------|
| `folo` | `GET /feeds?url=<rss_url>` | 无 | 大部分 RSS 源 |
| `folo-list` | `POST /entries` + session token | 需要 | Folo 列表订阅 |
| `rss` | 直连 RSS 解析 (xml2js) | 无 | 备用方案 |

### 3.3 中文数据源

通过 [RSSHub](https://docs.rsshub.app/) 提供的公开路由接入国内平台：

- 微博热搜: `https://rsshub.app/weibo/search/hot`
- 知乎热榜: `https://rsshub.app/zhihu/hotlist`
- 抖音热搜: `https://rsshub.app/douyin/trending`
- 36氪 AI: `https://rsshub.app/36kr/motif/ai`

这些 RSSHub URL 同样通过 Folo API 代理拉取。

### 3.4 并发控制

`fetch.ts` 使用自定义 `runWithConcurrency()` 限制并发度为 5，避免对 Folo API 造成过大压力。抓取后按 URL + Title 去重。

## 4. LLM 统一接入层

### 4.1 架构设计 (`scripts/lib/llm.ts`)

```
┌────────────────────────────────────────────┐
│             callLLM() / callLLMJson()      │  统一入口
├────────────────────────────────────────────┤
│             Provider Chain                 │  按优先级尝试
│  ┌─────┐  ┌──────┐  ┌──────┐  ┌────────┐  │
│  │zhipu│→ │gemini│→ │openai│→ │deepseek│  │  auto-fallback
│  └─────┘  └──────┘  └──────┘  └────────┘  │
├────────────────────────────────────────────┤
│         callWithRetry() per provider       │  429/503 自动重试
└────────────────────────────────────────────┘
```

### 4.2 Provider 抽象

每个 Provider 实现统一的 `ProviderConfig` 接口：

```typescript
interface ProviderConfig {
  name: string;
  envKey: string;
  models: { flash: string; pro: string };
  call: (req: LLMRequest) => Promise<LLMResponse>;
}
```

- **Flash 模型** — 用于 gate-keep、score 等高吞吐低成本场景
- **Pro 模型** — 用于 insight、播客脚本等需要深度推理的场景

### 4.3 OpenAI-Compatible 工厂

智谱、DeepSeek、SiliconFlow 都兼容 OpenAI API 协议，通过 `createOpenAICompatibleProvider()` 工厂函数一行即可接入：

```typescript
const provider = createOpenAICompatibleProvider({
  name: "zhipu",
  envKey: "ZHIPU_API_KEY",
  baseURL: "https://open.bigmodel.cn/api/paas/v4/",
  models: { flash: "glm-4-flash", pro: "glm-5" },
});
```

### 4.4 JSON 响应解析

`callLLMJson<T>()` 包含智能 JSON 解析：
1. 去除 markdown 代码围栏 (\`\`\`json ... \`\`\`)
2. 如果解析结果是对象但期望数组，自动提取第一个数组属性
3. 首次失败后追加强化 prompt 重试一次

## 5. 三阶决策引擎

### 5.1 Stage 1: Gate-Keep

- **输入**: 全部 rawItems
- **输出**: 每条的 PASS / DROP / MERGE 判定
- **模型**: Flash（速度优先）
- **过滤率**: 约 70-80%

### 5.2 Stage 2: Score

- **输入**: 通过 gate-keep 的条目
- **输出**: 六维评分 + 加权总分
- **模型**: Flash
- **排序**: 按加权总分取 Top N（默认 10 条）

六维评分：
- `novelty` (20%) — 新颖性
- `utility` (25%) — 实用性
- `impact` (20%) — 影响力
- `credibility` (15%) — 可信度
- `timeliness` (10%) — 时效性
- `uniqueness` (10%) — 独特性

### 5.3 Stage 3: Insight

- **输入**: Top N 高分新闻
- **输出**: 结构化洞察
- **模型**: Pro（深度推理）

每条洞察包含：
- `oneLiner` — 一句话摘要
- `whyItMatters` — 为什么重要
- `whoShouldCare` — 谁应该关注
- `actionableAdvice` — 可执行建议
- `deepDive` — 200 字深度解读

## 6. 前端架构

### 6.1 技术选型

- **Next.js 16** — Static Site Generation (`output: "export"`)
- **Tailwind CSS** — 样式
- **`generateStaticParams`** — 基于 `content/index.json` 生成静态路由

### 6.2 页面结构

| 路由 | 功能 |
|------|------|
| `/` | 重定向到最新日报 |
| `/[date]` | 日报详情页 |
| `/podcast` | 播客列表页 |

### 6.3 侧边栏导航

客户端组件 `Sidebar.tsx`，实现年→月→日三级可折叠导航树：

```
▼ 2026
  ▼ 3月
    • 03-18 ✦
    • 03-16
  ▶ 2月
  ▶ 1月
```

- 当前年/月自动展开
- 当前日期高亮标记

## 7. 部署架构

```
┌──────────────┐    每日 7:00 UTC+8    ┌──────────────┐
│ GitHub       │ ──────────────────── │ GitHub       │
│ Actions      │    npx tsx graph.ts   │ Actions      │
│ (Cron)       │                      │ (Runner)     │
└──────┬───────┘                      └──────┬───────┘
       │                                      │
       │  git push content/                   │
       ▼                                      ▼
┌──────────────┐                      ┌──────────────┐
│ GitHub Repo  │ ──── auto-deploy ──→ │   Vercel     │
│ (content/)   │                      │  (Next.js    │
│              │                      │   SSG)       │
└──────────────┘                      └──────────────┘
       │
       ▼
┌──────────────┐         ┌──────────────┐
│ Cloudflare   │         │ Telegram /   │
│ R2           │         │ 微信         │
│ (播客音频)    │         │ (通知推送)    │
└──────────────┘         └──────────────┘
```

## 8. 配置文件说明

### `configs/feeds.json`

数据源配置，每个源包含：
- `id` — 唯一标识
- `type` — `folo` | `folo-list` | `rss`
- `url` — RSS 源 URL
- `category` — 分类标签
- `name` — 显示名称
- `weight` — 源权重 (0-100)，影响评分

### `configs/prompt.json`

用户兴趣配置：
- `interests[]` — 兴趣列表，`level` 支持 `must` / `high` / `medium` / `low`
- `topN` — 每日精选数量
- `language` — 输出语言 (`zh` / `en`)
- `outputStyle` — 风格 (`professional` / `casual`)

### `configs/platforms.json`

各平台分发开关（Telegram、微信、小红书、抖音、播客）。

### `.env`

环境变量，参见 `.env.example`。核心配置：
- `LLM_PROVIDERS` — 提供商优先级链
- `ZHIPU_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY` 等 — API 密钥
- `FOLO_SESSION_TOKEN` — Folo 列表认证（可选）
