# LLM News Flow

> 不追求信息最多，只追求信息更准、更快、更有用。

LLM 驱动的个人新闻聚合系统。每天自动从数十个 RSS 源和 Folo 抓取上千条资讯，经过**三阶六维决策引擎**层层筛选，最终产出 10 条精选日报、播客音频和多平台分发内容。

## 核心亮点：三阶决策引擎

```
1633 条原始新闻
    │
    ▼
┌─────────────────────────────────┐
│  Stage 1: Gate Keeper           │  Gemini Flash
│  快速去噪 — PASS / DROP / MERGE │  过滤 70-80%
└─────────────┬───────────────────┘
              ▼
┌─────────────────────────────────┐
│  Stage 2: Value Analyst         │  Gemini Flash
│  六维打分 → 加权排序 → Top N    │  精选 8-12 条
└─────────────┬───────────────────┘
              ▼
┌─────────────────────────────────┐
│  Stage 3: Insight Generator     │  Gemini Pro
│  结构化洞察 + 200 字深度解读     │  不只是摘要
└─────────────┬───────────────────┘
              ▼
    日报 / 播客 / 多平台分发
```

### 六维评估体系

| 维度 | 权重 | 评判标准 |
|------|------|---------|
| 实用性 | 25% | 能否直接用于工作/产品/投资决策？ |
| 新颖性 | 20% | 首次报道 vs 跟风？有无真正新信息？ |
| 影响力 | 20% | 对行业格局的改变程度 |
| 可信度 | 15% | 信源质量、数据支撑、可验证性 |
| 时效性 | 10% | 信息保鲜期 |
| 独特性 | 10% | 其他中文媒体没有的解读角度 |

## 架构

```
llm-news-flow/
├── scripts/                    # Pipeline 核心
│   ├── graph.ts                # LangGraph 管线入口
│   ├── state.ts                # Pipeline State 定义
│   ├── nodes/                  # 10 个管线节点
│   │   ├── load-config.ts      #   加载配置
│   │   ├── fetch.ts            #   RSS + Folo 数据抓取
│   │   ├── gate-keep.ts        #   阶段1: 快速去噪
│   │   ├── score.ts            #   阶段2: 六维评估
│   │   ├── insight.ts          #   阶段3: 结构化洞察
│   │   ├── generate-daily.ts   #   生成 Markdown 日报
│   │   ├── podcast.ts          #   播客脚本 + TTS 合成
│   │   ├── platforms.ts        #   多平台文案生成
│   │   ├── publish.ts          #   文件写入 + Git 推送
│   │   └── notify.ts           #   Telegram/微信通知
│   └── lib/                    # 工具库
│       ├── llm.ts              #   Gemini + OpenAI 双平台 fallback
│       ├── prompts.ts          #   三阶决策引擎全部 Prompt
│       ├── rss.ts              #   RSS 解析
│       ├── folo.ts             #   Folo API 客户端
│       ├── tts.ts              #   Gemini TTS 合成
│       ├── r2.ts               #   Cloudflare R2 上传
│       └── types.ts            #   TypeScript 类型定义
├── configs/
│   ├── feeds.json              # 数据源配置
│   ├── prompt.json             # 用户兴趣偏好
│   └── platforms.json          # 平台分发开关
├── content/                    # 自动生成的日报内容（勿手动编辑）
├── frontend/                   # Next.js SSG 前端
│   ├── app/
│   │   ├── page.tsx            #   首页（重定向至最新日报）
│   │   ├── [date]/page.tsx     #   日报详情页
│   │   └── podcast/page.tsx    #   播客列表页
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── DailyReport.tsx
│   │   └── PodcastPlayer.tsx
│   └── lib/content-loader.ts
└── .github/workflows/
    └── daily-pipeline.yml      # GitHub Actions 每日定时任务
```

## Pipeline 流程图

```
START
  │
  ▼
loadConfig ──▶ fetch ──▶ gateKeep ──▶ score ──▶ insight ──▶ generateDaily
                                                                │
                                                        ┌───────┴───────┐
                                                        ▼               ▼
                                                   podcastGen      platformsGen
                                                        │               │
                                                        └───────┬───────┘
                                                                ▼
                                                            publish
                                                                │
                                                                ▼
                                                             notify
                                                                │
                                                                ▼
                                                               END
```

## 技术栈

| 层 | 技术 |
|----|------|
| 管线编排 | LangGraph.js (@langchain/langgraph) |
| 语言 | TypeScript |
| LLM | Google Gemini API (主力) + OpenAI (降级) |
| TTS | Gemini TTS (多角色对话) |
| 前端 | Next.js 16 (SSG) + Tailwind CSS |
| 部署 | Vercel (前端) + GitHub Actions (管线) |
| 音频存储 | Cloudflare R2 |
| 内容存储 | Git + Markdown |

## 快速开始

### 1. 安装依赖

```bash
cd scripts && npm install
cd ../frontend && npm install
```

### 2. 配置环境变量

```bash
# 必需
export GEMINI_API_KEY="your-gemini-api-key"

# 可选（fallback / 分发）
export OPENAI_API_KEY="your-openai-api-key"
export FOLO_SESSION_TOKEN="your-folo-token"
export TELEGRAM_BOT_TOKEN="your-bot-token"
export TELEGRAM_CHAT_ID="your-chat-id"
export R2_ACCESS_KEY="your-r2-key"
export R2_SECRET_KEY="your-r2-secret"
export R2_ACCOUNT_ID="your-r2-account"
export R2_BUCKET="your-r2-bucket"
```

### 3. 运行管线

```bash
cd scripts
GEMINI_API_KEY=xxx npx tsx graph.ts
```

管线运行完成后，`content/` 目录会自动生成当日的日报文件。

### 4. 启动前端

```bash
cd frontend
npm run dev
```

访问 http://localhost:3000 查看日报。

### 5. 部署

**GitHub Actions 自动运行：** 已配置每日北京时间 7:00 自动执行。在 GitHub 仓库 Settings → Secrets 中配置上述环境变量即可。

**前端部署到 Vercel：** 关联 GitHub 仓库，Vercel 自动检测 `frontend/` 目录并部署。

## 自定义配置

### 数据源 (`configs/feeds.json`)

```json
{
  "feeds": [
    {
      "id": "openai-blog",
      "type": "rss",
      "url": "https://openai.com/blog/rss.xml",
      "category": "AI",
      "name": "OpenAI Blog",
      "weight": 95
    }
  ]
}
```

支持 `rss` 和 `folo` 两种数据源类型。

### 兴趣偏好 (`configs/prompt.json`)

```json
{
  "interests": [
    { "topic": "大语言模型", "level": "must", "keywords": ["LLM", "GPT", "Claude"] },
    { "topic": "AI 工具和应用", "level": "high", "keywords": ["AI Agent", "Copilot"] }
  ],
  "topN": 10,
  "language": "zh",
  "outputStyle": "professional"
}
```

`level` 支持 `must` / `high` / `medium`，影响评分权重。

### 平台分发 (`configs/platforms.json`)

可独立开关 Telegram、微信、小红书、抖音、播客等分发渠道。

## License

MIT
