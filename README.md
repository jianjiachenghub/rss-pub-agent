# LLM News Flow

> AI 驱动的个人新闻聚合 + 多平台分发系统。每天自动从 27+ RSS 源抓取资讯，经过 LLM 多阶段筛选、六维评分、深度解读，生成结构化日报、周报、播客脚本和平台分发文案。

**线上地址：** [rss-pub-agent.vercel.app](https://rss-pub-agent.vercel.app)

---

## 核心价值

**不是又一个 RSS 阅读器**，而是一个完整的**编辑部自动化系统**：

- **智能筛选** — 每天从 200+ 条原始资讯中，经过 Gate-Keep（去噪）→ Score（六维评分）→ Insight（深度解读）三层 LLM 处理，最终精选 ~20 条高价值信号
- **编辑决策引擎** — 不是简单的关键词过滤。系统会生成每日编辑议程（Editorial Agenda），动态调整各分类权重，确保重大事件（如政策突变、市场异动）能突破默认优先级
- **多维度覆盖** — 7 大分类（AI、投资金融、科技、软件工程、商业、政策地缘、社交媒体），每个分类有最低覆盖保障，不会因为 AI 新闻太多而淹没其他重要信号
- **多格式输出** — 一次 pipeline 同时产出日报 Markdown、播客脚本、小红书/抖音分发文案
- **全自动运行** — GitHub Actions 每日定时触发，生成内容自动 commit → Vercel 自动部署

---

## 系统架构

```
数据采集（27+ RSS 源）
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    LangGraph.js Pipeline                    │
│                                                             │
│  loadConfig → fetchPrimary → preFilter → fetchCoverage      │
│      → buildEditorialAgenda → gateKeep → score              │
│      → enrichSelected → insight → generateDaily             │
│      → podcastGen + platformsGen（并行）→ publish → notify  │
│                                                             │
│  每个节点独立 try-catch，失败写入 state.errors 不阻塞后续    │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────┐    ┌──────────────────────────┐
│  content/YYYY-MM-DD/      │    │  Next.js 16 SSG 前端     │
│  ├── daily.md             │───→│  日报 / 周报 / 时间线    │
│  ├── meta.json            │    │  Vercel 自动部署         │
│  ├── podcast-script.md    │    └──────────────────────────┘
│  ├── brief.md             │
│  ├── douyin.md            │
│  └── xhs.md               │
└───────────────────────────┘
```

### Pipeline 各阶段详解

| 阶段 | 输入 | 输出 | 说明 |
|------|------|------|------|
| **fetchPrimary** | feeds.json 配置 | ~200-300 条原始资讯 | 并发抓取 Folo 列表 + 各 RSS 源，URL/标题去重 |
| **preFilter** | 原始资讯 | ~120-140 条事件候选 | 标题相似度去重、分类修正、覆盖度检查 |
| **fetchCoverage** | 事件候选 + 覆盖缺口 | 补充抓取结果 | 对覆盖不足的分类定向补充抓取 |
| **editorialAgenda** | 事件候选 + 配置 | 编辑议程 | LLM 生成当日叙事角度、必覆盖主题、分类权重微调 |
| **gateKeep** | 事件候选 | ~50-80 条通过筛选 | LLM 批量 PASS/DROP/MERGE 决策，去除广告、水文、重复报道 |
| **score** | 通过筛选的条目 | Top ~36 条（含 secondary） | 六维评分 + 分类权重加成 + 编辑议程加持，保证最低分类覆盖 |
| **enrichSelected** | 精选条目 | 全文补充 | 抓取原文正文，为 insight 提供更丰富的上下文 |
| **insight** | 精选条目 + 全文 | 结构化洞察 | LLM 为每条生成事件摘要、深度解读、配图提取 |
| **generateDaily** | 洞察结果 | daily.md + meta.json | 按分类组织，生成完整 Markdown 日报 |
| **podcastGen** | 日报内容 | podcast-script.md | 生成播客对话脚本 |
| **platformsGen** | 日报内容 | brief/douyin/xhs.md | 生成各平台分发文案 |
| **publish** | 所有产物 | Git commit | 写入 content/ 目录，更新 index.json |
| **notify** | 发布结果 | Telegram/微信通知 | 可选的消息推送 |

---

## 六维评分体系

每条资讯在 0-100 分范围内综合评分：

| 维度 | 权重 | 评估内容 |
|------|------|---------|
| **信号强度** signalStrength | 24% | 是否包含真正的新信息，还是旧闻翻炒？ |
| **未来影响** futureImpact | 23% | 能否帮助判断未来几天到几周的趋势？ |
| **个人相关** personalRelevance | 18% | 与用户核心兴趣（AI > 投资 > 科技）的匹配度 |
| **决策价值** decisionUsefulness | 17% | 是否帮助读者形成更好的判断或抓住机会？ |
| **信源可信** credibility | 12% | 来源权威性、证据充分性 |
| **时效紧迫** timeliness | 6% | 是否必须今天知道，还是可以等？ |

在基础评分之上，还有：
- **分类权重加成**：AI(1.0) > 投资金融(0.95) > 科技(0.75) > 软件(0.7) > 商业(0.6) > 政策(0.55) > 社交(0.25)
- **编辑议程加持**：当日重点主题获得额外 boost
- **必覆盖保障**：AI ≥3 条、投资金融 ≥4 条、科技 ≥2 条、软件 ≥2 条...

---

## 数据源（27 个 RSS 订阅）

### AI（7 源）
| 源 | 类型 | 层级 |
|----|------|------|
| Follow AI 列表（Folo 聚合） | folo-list | core |
| OpenAI Blog | folo | core |
| Google DeepMind | folo | core |
| Hugging Face Blog | folo | core |
| 机器之心 | folo | signal |
| 量子位 | folo | signal |
| Last Week in AI | folo | signal |

### 投资金融（4 源）
| 源 | 类型 | 层级 |
|----|------|------|
| 雪球热门 | folo | core |
| 财联社电报 | folo | core |
| 华尔街见闻 | folo | core |
| 金十数据 | folo | signal |

### 科技（4 源）
| 源 | 类型 | 层级 |
|----|------|------|
| Hacker News | folo | signal |
| Solidot | folo | signal |
| Ars Technica | folo | core |
| TechCrunch AI | folo | signal |

### 软件工程（3 源）
| 源 | 类型 | 层级 |
|----|------|------|
| GitHub Blog | folo | core |
| LangChain Blog | folo | signal |
| HelloGitHub | folo | signal |

### 商业财经（3 源）
| 源 | 类型 | 层级 |
|----|------|------|
| FT 中文网 | folo | core |
| 路透中文网 | folo | core |
| 日经中文网 | folo | signal |

### 政策地缘（4 源）
| 源 | 类型 | 层级 |
|----|------|------|
| 纽约时报中文网 | folo | signal |
| BBC News 中文 | folo | signal |
| 澎湃新闻 | folo | signal |
| 联合早报 | folo | signal |

### 社交媒体（3 源）
| 源 | 类型 | 层级 |
|----|------|------|
| 微博热搜 | folo | watch |
| 知乎热榜 | folo | watch |
| X: Elon Musk | folo | watch |

> **层级说明：** core（核心源，优先保留）> signal（信号源，按分数竞争）> watch（观察源，仅作为补充趋势）

---

## LLM 提供商

系统支持多提供商自动切换，按优先级链依次尝试：

| 提供商 | flash 模型 | pro 模型 | 用途 |
|--------|-----------|----------|------|
| 智谱 GLM | glm-4-flash | glm-4-plus | 默认首选，国内低延迟 |
| Google Gemini | gemini-2.0-flash | gemini-2.0-pro | 备选，效果好 |
| OpenAI | gpt-4o-mini | gpt-4o | 备选 |
| DeepSeek | deepseek-chat | deepseek-chat | 备选，性价比高 |
| SiliconFlow | 多模型 | 多模型 | 备选 |

- 只有配了 API Key 的提供商才会激活
- 单个提供商 429/503 时自动 fallback 到下一个
- `LLM_PROVIDERS` 环境变量控制优先级顺序

---

## 前端

基于 **Next.js 16 (App Router) + Tailwind CSS 4** 的静态生成站点：

- **周报视图** — 按月均分 4 周，每周聚合日报生成周报摘要、重点提炼、指标统计
- **时间线视图** — 按天展示，纵向时间轴浏览近期日报
- **日报详情** — Markdown 渲染 + 右侧 TOC 目录（桌面端 sticky 固定）
- **移动端适配** — 顶部精简导航 + 右上角目录面板，适配刘海/安全区域
- **播客归档** — 播客脚本浏览
- **刊期导航** — 侧栏树形结构：年 → 月 → 周 → 日
- **全局搜索** — Ctrl+K 快速搜索日报/周报

部署在 Vercel，GitHub Actions push 后自动触发构建。

---

## 快速开始

### 1. 克隆 & 安装

```bash
git clone https://github.com/jianjiachenghub/rss-pub-agent.git
cd rss-pub-agent

# 安装 pipeline 依赖
cd scripts && npm install && cd ..

# 安装前端依赖
cd frontend && npm install && cd ..
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

**必需配置：** 至少一个 LLM 提供商的 API Key

```bash
# 推荐配置（国内优先）
LLM_PROVIDERS=zhipu,gemini,openai
ZHIPU_API_KEY=your_key_here
```

**可选配置：**

```bash
# Folo 数据源（Follow AI 列表抓取需要）
FOLO_SESSION_TOKEN=your_session_token

# 消息通知
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# 播客音频存储（Cloudflare R2）
R2_ACCESS_KEY=your_key
R2_SECRET_KEY=your_secret
R2_ACCOUNT_ID=your_id
R2_BUCKET=llm-news-flow
R2_PUBLIC_DOMAIN=your_domain
```

### 3. 运行 Pipeline

```bash
# 在仓库根目录
npm run graph

# 或进入 scripts 目录
cd scripts && npx tsx graph.ts
```

Pipeline 会自动抓取**昨天**的新闻，经过完整处理链后输出到 `content/YYYY-MM-DD/` 目录。

### 4. 启动前端

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看生成的日报。

### 5. 构建 & 部署

```bash
npm run build    # 静态构建
```

推送到 GitHub 后 Vercel 自动部署。也可通过 GitHub Actions 定时运行 pipeline + 自动部署。

---

## 仓库结构

```
rss-pub-agent/
├── configs/                 配置文件
│   ├── feeds.json           RSS 订阅源（27 个源，7 大分类）
│   ├── prompt.json          编辑偏好、兴趣、评分权重、分类覆盖要求
│   └── platforms.json       平台分发配置
│
├── scripts/                 LangGraph.js Pipeline
│   ├── graph.ts             主入口，编排 14 个节点
│   ├── state.ts             LangGraph State 定义
│   ├── nodes/               各处理节点
│   │   ├── fetch-primary.ts     主力源抓取
│   │   ├── pre-filter.ts        预过滤 & 去重
│   │   ├── fetch-coverage.ts    覆盖度补充抓取
│   │   ├── editorial-agenda.ts  编辑议程生成
│   │   ├── gate-keep.ts         LLM 噪音过滤
│   │   ├── score.ts             六维评分 & 选品
│   │   ├── enrich-selected.ts   全文抓取补充
│   │   ├── insight.ts           深度解读生成
│   │   ├── generate-daily.ts    日报 Markdown 生成
│   │   ├── podcast.ts           播客脚本生成
│   │   ├── platforms.ts         平台文案生成
│   │   ├── publish.ts           写入文件系统
│   │   └── notify.ts            消息推送
│   └── lib/                 工具库
│       ├── llm.ts               多提供商 LLM 层（自动 fallback）
│       ├── folo.ts              Folo API 客户端
│       ├── prompts.ts           所有 LLM prompt 模板
│       ├── feed-fetch.ts        RSS 抓取 & 分类限额
│       ├── pre-filter.ts        去重 & 覆盖度检查
│       ├── types.ts             共享类型定义
│       └── runtime-options.ts   运行时参数
│
├── frontend/                Next.js 16 SSG 前端
│   ├── app/
│   │   ├── page.tsx             首页（周报 + 时间线）
│   │   ├── [date]/page.tsx      日报详情页
│   │   ├── weekly/[week]/       周报详情页
│   │   ├── podcast/page.tsx     播客归档
│   │   └── about/page.tsx       项目说明
│   ├── components/
│   │   ├── HomeTabs.tsx         首页标签切换（周报/时间线）
│   │   ├── DailyReport.tsx      日报 Markdown 渲染
│   │   ├── DailyReportOutline.tsx  右侧 TOC 目录
│   │   ├── WeeklyDigest.tsx     周报详情
│   │   ├── PublicationShell.tsx 全局布局（桌面 + 移动端）
│   │   ├── IssueRail.tsx        侧栏刊期导航树
│   │   └── HeaderSearch.tsx     全局搜索
│   └── lib/
│       ├── content-loader.ts    内容加载 & 周报聚合
│       ├── daily-report-parser.ts  Markdown 结构解析
│       └── display-text.ts      显示文本 & 分周算法
│
├── content/                 自动生成的内容（勿手动编辑）
│   ├── YYYY-MM-DD/
│   │   ├── daily.md
│   │   ├── meta.json
│   │   ├── podcast-script.md
│   │   ├── brief.md
│   │   ├── douyin.md
│   │   └── xhs.md
│   └── index.json
│
├── docs/                    文档
│   ├── ARCHITECTURE.md
│   └── archive/             历史设计文档
│
└── .github/workflows/       GitHub Actions 定时任务
```

---

## 常用命令

```bash
# 根目录
npm run dev          # 启动前端 dev server
npm run build        # 构建静态站点
npm run graph        # 运行完整 pipeline

# scripts/
cd scripts
npx tsx graph.ts                     # 运行 pipeline
npx tsx graph.ts --date 2026-03-30   # 指定日期运行
npx tsc --noEmit -p tsconfig.json    # 类型检查
node ./node_modules/vitest/vitest.mjs run  # 运行测试

# frontend/
cd frontend
npm run dev          # 开发模式
npm run build        # 生产构建
npm run lint         # ESLint 检查
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| Pipeline 编排 | LangGraph.js (@langchain/langgraph) + TypeScript |
| LLM 调用 | 多提供商统一层（OpenAI 兼容协议），支持 zhipu / gemini / openai / deepseek / siliconflow |
| 数据抓取 | Folo API + RSSHub + RSS Parser |
| 前端 | Next.js 16 (App Router) + React 19 + Tailwind CSS 4 |
| 内容渲染 | react-markdown + remark-gfm |
| 日期处理 | dayjs |
| 部署 | Vercel (前端 SSG) + GitHub Actions (Pipeline 定时触发) |
| 存储 | Git (内容) + Cloudflare R2 (播客音频) |
| 通知 | Telegram Bot / 微信 Webhook |

---

## License

MIT
