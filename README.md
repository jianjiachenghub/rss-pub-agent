# LLM News Flow

> 不追求信息最多，只追求信息更准、更快、更有用。

LLM 驱动的个人新闻聚合 + 多平台分发系统。每天自动通过 **Folo API** 从 20+ 数据源抓取上千条资讯，经过 **三阶六维决策引擎** 层层筛选，最终产出精选日报、播客音频和多平台分发内容。

## 核心亮点

### 三阶决策引擎

```
1000+ 条原始新闻
    │
    ▼
┌─────────────────────────────────┐
│  Stage 1: Gate Keeper           │  LLM Flash
│  快速去噪 — PASS / DROP / MERGE │  过滤 70-80%
└─────────────┬───────────────────┘
              ▼
┌─────────────────────────────────┐
│  Stage 2: Value Analyst         │  LLM Flash
│  六维打分 → 加权排序 → Top N    │  精选 8-12 条
└─────────────┬───────────────────┘
              ▼
┌─────────────────────────────────┐
│  Stage 3: Insight Generator     │  LLM Pro
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

### 多 LLM 提供商自动降级

系统内置 **5 家 LLM 提供商**，通过环境变量 `LLM_PROVIDERS` 配置优先级链。当主力模型不可用（429/503）时，自动切换到下一个提供商，确保管线永不中断。

| 提供商 | Flash 模型 | Pro 模型 | 备注 |
|--------|-----------|---------|------|
| 智谱 (zhipu) | GLM-4-Flash | GLM-5 | 国内首选，速度快 |
| Gemini | Gemini 2.0 Flash | Gemini 2.5 Pro | Google 免费额度 |
| OpenAI | GPT-4o Mini | GPT-4o | 效果最好，贵 |
| DeepSeek | DeepSeek-Chat | DeepSeek-Reasoner | 国产开源，便宜 |
| SiliconFlow | Qwen3-8B | DeepSeek-V3 | 中转推理平台 |

## 数据源

通过 [Folo API](https://follow.is) 统一拉取，无需部署 RSS 解析基础设施：

| 分类 | 数据源 |
|------|--------|
| AI 实验室 | OpenAI Blog, Anthropic News, Google DeepMind, Google AI, Microsoft Research, NVIDIA Blog |
| 开源社区 | Hugging Face, LangChain, GitHub Blog |
| AI 新闻 | TechCrunch AI, VentureBeat AI, The Verge, Wired AI, MIT Technology Review, Ars Technica |
| 技术博客 | Simon Willison, Last Week in AI, Latent Space |
| 社区讨论 | Hacker News (AI/LLM) |
| 中文热搜 | 微博热搜, 知乎热榜, 抖音热搜 (via RSSHub) |
| 中文科技 | 36氪 AI |

## 项目结构

```
rss-pub-agent/
├── scripts/                    # Pipeline 核心
│   ├── graph.ts                # LangGraph 管线入口 + dotenv 初始化
│   ├── state.ts                # LangGraph State Annotation
│   ├── nodes/                  # 10 个管线节点
│   │   ├── load-config.ts      #   加载 feeds + interests + platforms 配置
│   │   ├── fetch.ts            #   Folo API / RSS 并发抓取 (concurrency=5)
│   │   ├── gate-keep.ts        #   阶段1: 快速去噪 (PASS/DROP/MERGE)
│   │   ├── score.ts            #   阶段2: 六维评估 + 加权排序
│   │   ├── insight.ts          #   阶段3: 结构化洞察生成
│   │   ├── generate-daily.ts   #   Markdown 日报生成
│   │   ├── podcast.ts          #   播客脚本 + TTS 合成
│   │   ├── platforms.ts        #   多平台文案 (小红书/抖音)
│   │   ├── publish.ts          #   文件写入 + index.json 更新
│   │   └── notify.ts           #   Telegram / 微信推送
│   └── lib/                    # 工具库
│       ├── llm.ts              #   统一 LLM 接入层 (5 提供商 + 自动降级)
│       ├── prompts.ts          #   三阶决策引擎 Prompt 模板
│       ├── rss.ts              #   RSS 直连解析 (备用方案)
│       ├── folo.ts             #   Folo API 客户端 (主力数据源)
│       ├── tts.ts              #   TTS 语音合成
│       ├── r2.ts               #   Cloudflare R2 音频上传
│       └── types.ts            #   TypeScript 类型定义
├── configs/
│   ├── feeds.json              # 数据源配置 (23 个源)
│   ├── prompt.json             # 用户兴趣 + 评分偏好
│   └── platforms.json          # 平台分发开关
├── content/                    # 自动生成的日报内容 (勿手动编辑)
│   ├── index.json              #   日期索引
│   └── YYYY-MM-DD/             #   每日目录
│       ├── daily.md            #     日报 Markdown
│       ├── insights.json       #     结构化洞察数据
│       ├── podcast.json        #     播客脚本
│       └── platforms.json      #     各平台文案
├── frontend/                   # Next.js 16 SSG 前端
│   ├── app/
│   │   ├── page.tsx            #   首页 (重定向至最新日报)
│   │   ├── [date]/page.tsx     #   日报详情页
│   │   └── podcast/page.tsx    #   播客列表页
│   ├── components/
│   │   ├── Sidebar.tsx         #   年→月→日 可折叠导航树
│   │   ├── DailyReport.tsx     #   日报渲染组件
│   │   └── PodcastPlayer.tsx   #   播客播放器
│   └── lib/content-loader.ts   #   内容加载 + 年月分组
├── .github/workflows/
│   └── daily-pipeline.yml      # GitHub Actions 每日定时任务
└── .env.example                # 环境变量模板
```

## Pipeline 流程

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

### 各节点说明

| 节点 | 功能 | LLM |
|------|------|-----|
| loadConfig | 加载 feeds.json / prompt.json / platforms.json | - |
| fetch | 通过 Folo API 并发拉取 23 个数据源 (并发度 5)，URL 去重 | - |
| gateKeep | LLM 批量判断 PASS/DROP/MERGE，过滤 70-80% 噪声 | Flash |
| score | 六维打分 (novelty/utility/impact/credibility/timeliness/uniqueness) | Flash |
| insight | 为 Top N 新闻生成结构化洞察 (one-liner/why/who/advice/deep-dive) | Pro |
| generateDaily | 将洞察组装为 Markdown 日报 | Flash |
| podcastGen | 生成播客对话脚本 + TTS 音频 | Pro + TTS |
| platformsGen | 生成小红书/抖音等平台分发文案 | Flash |
| publish | 写入 content/ 目录，更新 index.json | - |
| notify | 推送 Telegram / 微信通知 | - |

## 技术栈

| 层 | 技术 |
|----|------|
| 管线编排 | LangGraph.js (@langchain/langgraph) |
| 语言 | TypeScript (ESM) |
| LLM | 5 提供商统一接入 (zhipu/gemini/openai/deepseek/siliconflow) |
| 数据采集 | Folo API (主力) + RSS 直连 (备用) + RSSHub (中文源) |
| TTS | Gemini TTS (多角色对话) |
| 前端 | Next.js 16 (SSG, `output: "export"`) + Tailwind CSS |
| 部署 | Vercel (前端) + GitHub Actions (管线) |
| 音频存储 | Cloudflare R2 |
| 内容存储 | Git + Markdown + JSON |

## 快速开始

### 1. 安装依赖

```bash
cd scripts && npm install
cd ../frontend && npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

至少配置一个 LLM 提供商的 API Key：

```bash
# 推荐：智谱 GLM（国内快，免费额度大）
LLM_PROVIDERS=zhipu,gemini,openai
ZHIPU_API_KEY=your_key_here

# 可选：Folo 列表需要 session token
# FOLO_SESSION_TOKEN=your_token

# 可选：通知推送
# TELEGRAM_BOT_TOKEN=xxx
# TELEGRAM_CHAT_ID=xxx
```

### 3. 运行管线

```bash
cd scripts
npx tsx graph.ts
```

运行完成后，`content/` 目录会自动生成当日的日报文件。

### 4. 启动前端

```bash
cd frontend
npm run dev
```

访问 http://localhost:3000 查看日报。

### 5. 部署

**GitHub Actions 自动运行：** 已配置每日北京时间 7:00 自动执行。在 GitHub 仓库 Settings → Secrets 中配置环境变量。

**前端部署到 Vercel：** 关联 GitHub 仓库，Vercel 自动检测 `frontend/` 目录并部署。

## 自定义配置

### 数据源 (`configs/feeds.json`)

```json
{
  "feeds": [
    {
      "id": "openai-blog",
      "type": "folo",
      "url": "https://openai.com/blog/rss.xml",
      "category": "ai_labs",
      "name": "OpenAI Blog",
      "weight": 95
    }
  ]
}
```

支持的数据源类型：
- `folo` — 通过 Folo API 拉取 RSS（推荐，无需认证，有 AI 摘要）
- `folo-list` — 通过 Folo 列表拉取（需要 session token）
- `rss` — 直连 RSS 解析（备用方案）

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

### LLM 提供商 (`.env`)

通过 `LLM_PROVIDERS` 配置优先级链，逗号分隔。只有配了对应 API Key 的提供商才会激活。

```bash
# 示例：先试智谱，不行用 Gemini，最后 OpenAI
LLM_PROVIDERS=zhipu,gemini,openai

# 示例：只用 DeepSeek
LLM_PROVIDERS=deepseek
```

添加新的 OpenAI-compatible 提供商只需在 `scripts/lib/llm.ts` 中调用 `createOpenAICompatibleProvider()` 即可。

## License

MIT
