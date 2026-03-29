# LLM 驱动的个人新闻聚合 + 内容分发系统 — 完整技术方案

## 一、项目定位

用 LLM 替代传统推荐算法，打造一条从信息采集到多平台分发的个人内容生产线。

用户通过 JSON 配置定义数据源和兴趣偏好，系统每天自动抓取 → 筛选 → 摘要 → 生成日报网页 + 播客音频 + 社媒文案 → 分发到多个平台。

```
信息源 → LLM 筛选/摘要 → 日报网页 → 多格式内容生产 → 多平台分发
                                      ├── 播客音频 → 小宇宙
                                      ├── 图文笔记 → 小红书（半自动）
                                      ├── 短视频脚本 → 抖音（半自动）
                                      └── Webhook → Telegram / 微信
```

---

## 二、技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 管线编排 | **LangGraph.js** | `@langchain/langgraph`，graph-based workflow |
| 语言 | **TypeScript** | 全栈统一，前后端一致 |
| 配置格式 | **JSON** | TS 原生 import，零解析成本 |
| 数据采集 | **Folo API + rss-parser** | Folo 为主，直接 RSS 为辅 |
| LLM 主力 | **Google Gemini API** | Flash 模型批量处理，Pro 模型深度任务 |
| LLM 降级 | **OpenAI API** | Gemini 失败自动切换 |
| TTS | **Gemini 2.5 TTS** | 多说话人、中文支持、和 LLM 同 API Key |
| 音频存储 | **Cloudflare R2** | 免费 10GB，全球 CDN |
| 内容存储 | **Git + Markdown** | 零成本，版本追踪，GitHub 上可直接阅读 |
| 前端 | **Next.js (SSG) + Tailwind** | 静态生成，性能好 |
| 配置管理 | **GitHub API + OAuth** | 前端读写 Git 仓库中的 JSON 配置 |
| 定时任务 | **GitHub Actions Cron** | 免费，原生 Git 集成 |
| 网站部署 | **Vercel** | Next.js 最佳搭档 |
| 播客分发 | **Podcast RSS Feed** | 标准协议，小宇宙自动同步 |
| 消息通知 | **Telegram Bot / 企业微信 Webhook** | 免费即时推送 |
| 社媒发布 | **social-auto-upload (Selenium)** | 半自动，人工审核后执行 |

---

## 三、整体架构

### 三层架构

**Layer 1 — LLM 层（决策推理大脑）**

直接调用 Gemini / OpenAI API，承担 5 个角色：

| 角色 | 用途 | 推荐模型 |
|------|------|---------|
| 筛选打分 | 根据用户偏好对新闻评分 0-100 | Gemini Flash |
| 内容摘要 | 每条新闻 → 3 句中文摘要 | Gemini Flash |
| 日报综述 | 所有摘要 → 今日总结段落 | Gemini Pro |
| 播客脚本 | 所有摘要 → 双人对话脚本 | Gemini Pro |
| 平台文案 | 日报 → 小红书笔记 / 抖音脚本 / 简报 | Gemini Pro |

双平台降级：每次 LLM 调用封装 try-catch，Gemini 失败自动切 OpenAI。

**Layer 2 — 后端服务层（数据管线）**

TypeScript 脚本，用 LangGraph.js 编排，运行在 GitHub Actions 中。不需要持久服务器——纯 CI/CD Pipeline。

**Layer 3 — 前端展示层（静态网站）**

Next.js SSG，部署到 Vercel。包含日报阅读、播客播放、配置管理、待发布队列。

### 架构流程图

```
┌──────────────────────────────────────────────────────────────────┐
│                       GitHub Repository                           │
│                                                                    │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │              GitHub Actions（每日 07:00 定时触发）           │    │
│  │                                                             │    │
│  │  loadConfig → fetch → score → summarize → generateDaily    │    │
│  │                                                 │           │    │
│  │                                    ┌────────────┼────────┐  │    │
│  │                                    ▼            ▼        │  │    │
│  │                                 podcast    platforms      │  │    │
│  │                                    │            │        │  │    │
│  │                                    └─────┬──────┘        │  │    │
│  │                                          ▼               │  │    │
│  │                                       publish            │  │    │
│  │                                          ▼               │  │    │
│  │                                       notify             │  │    │
│  │                                                             │    │
│  │  ──→ Git Push content/ ──→ 触发 Vercel 部署 ──→ Webhook   │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌────────────┐  ┌────────────────┐  ┌────────────────────┐      │
│  │ configs/   │  │ content/       │  │ frontend/          │      │
│  │ feeds.json │  │  2026-03-16/   │  │ (Next.js SSG)      │      │
│  │ prompt.json│  │   daily.md     │  │  日报阅读页         │      │
│  │ platforms. │  │   podcast.mp3  │  │  播客播放页         │      │
│  │   json     │  │   xhs.md      │  │  配置管理页         │      │
│  └────────────┘  │   douyin.md   │  │  待发布队列         │      │
│                  └────────────────┘  └────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 四、LangGraph.js 管线设计

### 核心概念

- **State**：共享数据结构，在所有 Node 间传递
- **Node**：函数，接收 State → 做具体工作 → 返回更新后的 State
- **Edge**：连接 Node，定义执行顺序（支持并行和条件分支）

### 管线 Graph 结构

```
START
  │
  ▼
loadConfig ──→ fetch ──→ score ──→ summarize ──→ generateDaily
                                                      │
                                          ┌───────────┴───────────┐
                                          ▼                       ▼
                                       podcast               platforms
                                          │                       │
                                          └──────────┬────────────┘
                                                     ▼
                                                  publish
                                                     │
                                                     ▼
                                                  notify
                                                     │
                                                     ▼
                                                    END
```

### 各 Node 职责

| Node | 输入 | 输出 | 说明 |
|------|------|------|------|
| loadConfig | — | config | 读取 configs/ 下的 JSON 文件，替换环境变量 |
| fetch | config | rawItems[] | 并行抓取 Folo API / RSSHub / 直接 RSS，合并去重 |
| score | rawItems + config.prompt | scoredItems[] | 把用户偏好 JSON 拼成自然语言，LLM 对每条新闻打分，取 Top N |
| summarize | scoredItems | summaries[] | 逐条生成中文摘要，英文内容先翻译；生成全局综述 |
| generateDaily | summaries | dailyMarkdown | 按分类分组，渲染成 Markdown，写入 frontmatter |
| podcast | summaries | podcastScript, audioUrl | LLM 生成双人对话脚本 → Gemini TTS 合成 → 上传 R2 |
| platforms | dailyMarkdown | platformContents | LLM 生成小红书笔记、抖音脚本、简报，各存为独立文件 |
| publish | 所有上游数据 | — | 写文件到 content/YYYY-MM-DD/，更新 index.json，Git Push |
| notify | dailyMarkdown + brief | — | Telegram Bot / 企业微信 Webhook 推送简报 |

### 错误隔离策略

- 每个 Node 内部 try-catch，失败写入 `state.errors`，不阻塞后续节点
- podcast 失败 → 日报照常发布，只是没有音频
- platforms 失败 → 日报照常发布，只是没有社媒文案
- fetch 中单个源失败 → 跳过该源，其他源正常

### State 类型定义

```
PipelineState {
  config:           PipelineConfig        // JSON 配置
  rawItems:         RawNewsItem[]         // 原始新闻
  scoredItems:      ScoredNewsItem[]      // 打分后
  summaries:        Summary[]             // 摘要
  dailyMarkdown:    string                // 日报 MD
  podcastScript:    string                // 播客脚本
  podcastAudioUrl:  string                // 音频 URL
  platformContents: PlatformContents      // 各平台文案
  errors:           string[]              // 错误收集
}
```

---

## 五、数据采集层

### 三种数据源并行支持

| 类型 | 实现 | 优先级 |
|------|------|--------|
| Folo API | POST `https://api.follow.is/entries`，Cookie 认证，JSON 返回 | 最高（一个 API 拿多个源） |
| RSSHub | 标准 RSS，通过 rss-parser 库解析 | 中（Folo 未覆盖的源） |
| 直接 API | 自定义 HTTP 请求（如 GitHub Trending） | 补充 |

### Folo API 要点

- 认证：Cookie `authjs.session-token`
- 分页：`publishedAfter` 游标
- 反检测：随机 User-Agent、请求间 1-3 秒延迟
- 返回 JSON，不用处理 XML

---

## 六、播客生成管线

```
日报摘要 → LLM 生成播客脚本（双人对话格式）→ Gemini TTS 合成 → 上传 R2 → 更新 Podcast RSS Feed
```

### TTS 方案

首选 **Gemini 2.5 TTS**：原生多说话人、中文支持、和 LLM 同 API Key、免费额度内。

降级选项：OpenAI gpt-4o-mini-tts 或 MiniMax TTS。

### 播客分发

生成标准 Podcast RSS Feed XML，提交到小宇宙后台。每次更新 Feed，新播客自动上架。

---

## 七、多平台内容分发

### 内容适配

同一份日报，LLM 自动生成各平台适配版本：

| 平台 | 风格要求 | 输出文件 |
|------|---------|---------|
| 小红书 | emoji 多、口语化、标签矩阵、500-800 字 | xhs.md |
| 抖音 | 60 秒短视频脚本、hook 开头、画面标注 | douyin.md |
| Telegram/微信 | 280 字简报、只保留 Top 3 新闻 | brief.md |

### 发布策略

| 平台 | 方式 | 自动化程度 |
|------|------|-----------|
| 网站 | Git Push → Vercel 自动部署 | 全自动 |
| 小宇宙 | Podcast RSS Feed 自动同步 | 全自动 |
| Telegram/微信 | Webhook API 推送 | 全自动 |
| 小红书 | 生成文案 → 待发布队列 → 人工审核后一键发布 | 半自动 |
| 抖音 | 生成脚本 → 待发布队列 → 人工审核后发布 | 半自动 |

> 小红书 2026 年 3 月已发公告打击 AI 托管账号，全自动发布有风险，建议半自动。

---

## 八、前端网站

### 页面结构

```
/                      → 重定向到今日日报
/2026-03-16            → 日报阅读页
/podcast               → 播客列表 + 在线播放器
/settings              → 设置首页
/settings/feeds        → 数据源管理（增删改查）
/settings/prompt       → 兴趣偏好编辑（表单 UI）
/settings/platforms    → 平台分发开关
/settings/publish      → 待发布队列（审核 + 一键发布）
```

### 核心交互

- **日报页**：左侧日期导航，右侧 Markdown 渲染，按分类分组，新闻卡片带评分和来源
- **播客页**：音频播放器，播客列表
- **配置页**：通过 GitHub API 读写仓库中的 JSON 配置文件，GitHub OAuth 保护
- **发布队列**：展示 LLM 生成的小红书/抖音文案，支持在线编辑和一键复制

### 技术要点

- Next.js SSG 静态生成，构建时读取 content/ 目录
- Tailwind CSS 样式，暗色模式支持
- react-markdown 渲染日报内容
- GitHub OAuth 登录保护配置页面

---

## 九、存储方案

### 目录结构

```
content/
├── index.json                    # 全局索引（所有日期列表）
├── 2026-03-16/
│   ├── daily.md                  # 日报正文
│   ├── meta.json                 # 元数据（分类、条数、评分统计）
│   ├── podcast-script.md         # 播客脚本
│   ├── xhs.md                    # 小红书文案
│   ├── douyin.md                 # 抖音脚本
│   ├── brief.md                  # 简报（Webhook 用）
│   └── publish-status.json       # 各平台发布状态
└── 2026-03-15/
    └── ...
```

### 音频文件

MP3 存 Cloudflare R2（免费 10GB），不放 Git。content/ 里只记录 URL。

---

## 十、配置文件

全部 JSON，位于 `configs/` 目录。

### feeds.json — 数据源

定义从哪里抓取、分类、权重（0-100）。支持 folo / rss / api 三种类型。

### prompt.json — 用户兴趣

结构化定义：身份、优先级列表（topic + level + include/exclude）、输出风格。代码在发给 LLM 前拼成自然语言 prompt。

### platforms.json — 平台分发

每个平台独立开关，配置 TTS 声音、文案风格、Webhook 密钥（环境变量占位符）。

---

## 十一、GitHub Actions

```yaml
name: Daily News Pipeline
on:
  schedule:
    - cron: '0 23 * * *'    # UTC 23:00 = 北京时间 07:00
  workflow_dispatch:          # 手动触发

jobs:
  pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd scripts && npm ci
      - run: cd scripts && npx tsx graph.ts
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          FOLO_SESSION_TOKEN: ${{ secrets.FOLO_SESSION_TOKEN }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
          R2_ACCESS_KEY: ${{ secrets.R2_ACCESS_KEY }}
          R2_SECRET_KEY: ${{ secrets.R2_SECRET_KEY }}
      - run: |
          git config user.name "AI News Bot"
          git config user.email "bot@example.com"
          git add content/
          git diff --staged --quiet || git commit -m "daily: $(date +%Y-%m-%d)"
          git push
```

前端部署由 Vercel 自动监听 main 分支 push 触发，不需要额外 workflow。

---

## 十二、项目目录结构

```
llm-news-flow/
├── .github/
│   └── workflows/
│       └── daily-pipeline.yml
├── configs/
│   ├── feeds.json
│   ├── prompt.json
│   └── platforms.json
├── content/                        # 自动生成，Git 追踪
│   ├── index.json
│   └── YYYY-MM-DD/
│       ├── daily.md
│       ├── meta.json
│       ├── podcast-script.md
│       ├── xhs.md
│       ├── douyin.md
│       ├── brief.md
│       └── publish-status.json
├── scripts/
│   ├── package.json
│   ├── tsconfig.json
│   ├── graph.ts                    # LangGraph.js 管线入口
│   ├── state.ts                    # State 类型定义
│   ├── nodes/
│   │   ├── load-config.ts
│   │   ├── fetch.ts
│   │   ├── score.ts
│   │   ├── summarize.ts
│   │   ├── generate-daily.ts
│   │   ├── podcast.ts
│   │   ├── platforms.ts
│   │   ├── publish.ts
│   │   └── notify.ts
│   └── lib/
│       ├── llm-client.ts           # Gemini + OpenAI 双平台封装
│       ├── folo-client.ts          # Folo API
│       ├── rss-parser.ts           # RSS 解析
│       ├── tts-client.ts           # TTS 封装
│       ├── r2-client.ts            # Cloudflare R2 上传
│       ├── config-loader.ts        # JSON 配置加载
│       ├── podcast-feed.ts         # Podcast RSS Feed 生成
│       └── types.ts                # 共享类型
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── [date]/page.tsx
│   │   ├── podcast/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── feeds/page.tsx
│   │       ├── prompt/page.tsx
│   │       ├── platforms/page.tsx
│   │       └── publish/page.tsx
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── DailyReport.tsx
│   │   ├── NewsCard.tsx
│   │   ├── PodcastPlayer.tsx
│   │   ├── ConfigEditor.tsx
│   │   ├── PublishQueue.tsx
│   │   └── PlatformStatus.tsx
│   └── lib/
│       ├── content-loader.ts
│       ├── github-api.ts
│       └── markdown-render.ts
├── CLAUDE.md
└── README.md
```

---

## 十三、实施计划

### Phase 0：项目初始化（0.5 天）

- 创建目录结构
- 初始化 scripts/package.json（装 langgraph、core、google-genai、openai、rss-parser、dayjs）
- 初始化 frontend/（create-next-app）
- 编写 CLAUDE.md
- 创建默认 JSON 配置文件
- 定义 state.ts 和 types.ts

### Phase 1：核心管线 — 抓取 + LLM 处理（2 天）

- config-loader.ts：JSON 加载 + 环境变量替换
- folo-client.ts：Folo API 封装（认证、分页、重试）
- rss-parser.ts：RSS/Atom 解析 + 数据标准化
- llm-client.ts：Gemini/OpenAI 双平台封装 + 降级 + 结构化 JSON 输出
- nodes/load-config.ts、fetch.ts、score.ts、summarize.ts、generate-daily.ts
- graph.ts：用 StateGraph 串联以上 Node
- 端到端测试：手动运行 `npx tsx graph.ts`

### Phase 2：播客生成（1.5 天）

- nodes/podcast.ts：LLM 生成双人对话脚本
- tts-client.ts：Gemini TTS 封装（多说话人）
- r2-client.ts：音频上传到 Cloudflare R2
- podcast-feed.ts：生成 Podcast RSS Feed XML
- 在 graph.ts 中添加 podcast Node 和 Edge

### Phase 3：多平台分发（1 天）

- nodes/platforms.ts：小红书/抖音/简报文案 LLM 生成
- nodes/notify.ts：Telegram + 企业微信 Webhook
- nodes/publish.ts：写文件 + 上传 + Git Push + 更新索引
- 在 graph.ts 中添加并行 Edge（generateDaily → podcast + platforms → publish）

### Phase 4：前端网站（2.5 天）

- 全局 Layout + 响应式 + 暗色模式
- 日报阅读页（Markdown 渲染 + 分类 + 卡片）
- 播客页面（播放器 + 列表）
- 配置管理页（JSON 编辑器 / 表单 UI + GitHub API 读写）
- 待发布队列页（文案预览 + 编辑 + 一键复制）
- GitHub OAuth 登录

### Phase 5：CI/CD + 部署（1 天）

- daily-pipeline.yml：定时 + 手动触发
- Vercel 部署配置
- GitHub Secrets 配置
- 端到端测试
- Podcast RSS 提交到小宇宙

### Phase 6：打磨（1 天）

- Pipeline 失败时发 Telegram 通知
- LLM API token 消耗统计
- 人工检查日报质量，调整 prompt.json
- README 文档

**总计约 9.5 个工作日**

---

## 十四、CLAUDE.md

```markdown
# LLM News Flow - Claude Code 指引

## 项目概述
LLM 驱动的个人新闻聚合 + 多平台内容分发系统。
用户通过 JSON 配置定义数据源和兴趣偏好，
系统每日自动抓取、筛选、摘要，
生成日报网页、播客音频、社媒文案并分发。

## 技术栈
- 管线编排：LangGraph.js (@langchain/langgraph)
- 语言：TypeScript（全栈统一）
- 配置格式：JSON（不用 YAML）
- LLM：Gemini (主) + OpenAI (降级)
- TTS：Gemini 2.5 TTS
- 前端：Next.js SSG + Tailwind
- 部署：Vercel + GitHub Actions

## 管线架构（LangGraph StateGraph）
State 定义在 scripts/state.ts
每个 Node 在 scripts/nodes/ 下
Graph 定义和编译在 scripts/graph.ts

顺序：loadConfig → fetch → score → summarize → generateDaily
并行：podcast + platforms（从 generateDaily 扇出）
汇聚：publish（等并行完成）
最后：notify → END

## 配置文件（全部 JSON）
- configs/feeds.json：数据源（type/url/category/weight）
- configs/prompt.json：用户兴趣（结构化，代码拼成自然语言发 LLM）
- configs/platforms.json：平台分发开关和参数

## 关键约定
- 每个 Node 独立 try-catch，失败写 state.errors，不阻塞其他
- LLM 调用必须做 JSON parse 容错
- 外部 API 调用带重试（3 次，指数退避）
- 环境变量用 ${VAR_NAME} 占位符，运行时替换
- content/ 由管线自动生成，不要手动编辑
- 不要装 langchain 主包，只用 @langchain/langgraph + provider 包
- Git 自动提交格式：daily: YYYY-MM-DD

## 依赖
@langchain/langgraph, @langchain/core,
@langchain/google-genai, @langchain/openai,
rss-parser, dayjs

## 命令
npx tsx scripts/graph.ts            # 运行管线
cd frontend && npm run dev          # 本地预览
```

---

## 十五、风险与注意事项

1. **小红书反 AI 托管**：2026 年 3 月已发公告。小红书/抖音走半自动模式，人工审核后发布。
2. **Folo Token 过期**：Cookie 认证会过期，Pipeline 检测 401 时发通知提醒手动更新。
3. **LLM 成本**：Gemini Flash 每天免费 1500 次调用足够。降级到 OpenAI 时注意费用。Pipeline 内记录 token 消耗。
4. **音频存储**：5 分钟播客约 5-8MB，Cloudflare R2 免费 10GB 够用数年。
5. **GitHub Actions**：免费 2000 分钟/月，单次约 3-5 分钟，每月约 100 分钟，充裕。
6. **LangGraph.js**：相比 Python 版社区资源少一些，遇到问题优先查官方 langgraphjs 仓库的 examples 目录。
