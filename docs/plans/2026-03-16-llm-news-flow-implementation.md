# LLM News Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete LLM-driven news aggregation + multi-platform distribution system with a three-stage value assessment engine.

**Architecture:** LangGraph.js pipeline running on GitHub Actions fetches RSS/Folo sources, applies a 3-stage LLM filtering engine (gate-keep → 6-dimension scoring → insight generation), produces daily reports in Markdown, podcast audio, and social media copy. Next.js SSG frontend deployed on Vercel renders daily reports, podcast player, and config management.

**Tech Stack:** TypeScript, LangGraph.js, @google/genai (Gemini), OpenAI SDK, rss-parser, Next.js 14 (App Router), Tailwind CSS, Cloudflare R2, GitHub Actions

---

## File Structure

```
llm-news-flow/
├── scripts/
│   ├── package.json
│   ├── tsconfig.json
│   ├── graph.ts                    # LangGraph pipeline entry
│   ├── state.ts                    # State Annotation definition
│   ├── nodes/
│   │   ├── load-config.ts          # Load JSON configs
│   │   ├── fetch.ts                # RSS + Folo data fetching
│   │   ├── gate-keep.ts            # Stage 1: fast noise filter
│   │   ├── score.ts                # Stage 2: 6-dimension scoring
│   │   ├── insight.ts              # Stage 3: structured insight generation
│   │   ├── generate-daily.ts       # Render Markdown daily report
│   │   ├── podcast.ts              # Podcast script + TTS
│   │   ├── platforms.ts            # Social media copy generation
│   │   ├── publish.ts              # Write files + git push
│   │   └── notify.ts               # Telegram/WeChat webhook
│   └── lib/
│       ├── llm.ts                  # Gemini + OpenAI dual-provider with fallback
│       ├── folo.ts                 # Folo API client
│       ├── rss.ts                  # RSS parser wrapper
│       ├── tts.ts                  # Gemini TTS client
│       ├── r2.ts                   # Cloudflare R2 upload
│       ├── prompts.ts              # All LLM prompt templates
│       └── types.ts                # Shared TypeScript types
├── configs/
│   ├── feeds.json                  # Data sources
│   ├── prompt.json                 # User interests & preferences
│   └── platforms.json              # Platform distribution config
├── content/                        # Auto-generated, git-tracked
│   └── index.json
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Redirect to today
│   │   ├── [date]/
│   │   │   └── page.tsx            # Daily report page
│   │   ├── podcast/
│   │   │   └── page.tsx            # Podcast list + player
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── feeds/page.tsx
│   │       ├── prompt/page.tsx
│   │       └── platforms/page.tsx
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── DailyReport.tsx
│   │   ├── NewsCard.tsx
│   │   ├── PodcastPlayer.tsx
│   │   └── ConfigEditor.tsx
│   └── lib/
│       ├── content-loader.ts
│       └── markdown-render.ts
├── .github/
│   └── workflows/
│       └── daily-pipeline.yml
├── CLAUDE.md
└── README.md
```

---

## Chunk 1: Project Scaffold + Types + LLM Client

### Task 1: Initialize project structure

**Files:**
- Create: `llm-news-flow/scripts/package.json`
- Create: `llm-news-flow/scripts/tsconfig.json`

- [ ] **Step 1: Create project directory and scripts/package.json**

```json
{
  "name": "llm-news-flow-scripts",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "pipeline": "tsx graph.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@google/genai": "^1.0.0",
    "@langchain/core": "^0.3.0",
    "@langchain/langgraph": "^0.2.0",
    "dayjs": "^1.11.0",
    "openai": "^4.0.0",
    "rss-parser": "^3.13.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create scripts/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": ".",
    "resolveJsonModule": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["*.ts", "nodes/**/*.ts", "lib/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Install dependencies**

Run: `cd llm-news-flow/scripts && npm install`

- [ ] **Step 4: Commit**

```bash
git add scripts/package.json scripts/tsconfig.json scripts/package-lock.json
git commit -m "chore: init scripts project with dependencies"
```

---

### Task 2: Define shared types

**Files:**
- Create: `llm-news-flow/scripts/lib/types.ts`

- [ ] **Step 1: Write types.ts with all shared interfaces**

```typescript
// ===== Config Types =====

export interface FeedSource {
  id: string;
  type: "folo" | "rss" | "api";
  url: string;
  category: string;
  name: string;
  weight: number; // 0-100, source credibility weight
}

export interface UserInterest {
  topic: string;
  level: "must" | "high" | "medium" | "low";
  keywords: string[];
}

export interface PipelineConfig {
  feeds: FeedSource[];
  interests: UserInterest[];
  topN: number; // how many articles to include in daily
  language: "zh" | "en";
  outputStyle: "professional" | "casual";
}

export interface PlatformConfig {
  telegram: { enabled: boolean; botToken: string; chatId: string };
  wechat: { enabled: boolean; webhookUrl: string };
  xhs: { enabled: boolean; style: string };
  douyin: { enabled: boolean; style: string };
  podcast: { enabled: boolean; voices: string[]; maxMinutes: number };
}

// ===== Pipeline Data Types =====

export interface RawNewsItem {
  id: string;
  title: string;
  url: string;
  content: string;       // full text or summary from source
  source: string;        // feed source name
  sourceId: string;      // feed source id
  category: string;
  publishedAt: string;   // ISO date
  fetchedAt: string;     // ISO date
}

export interface GateKeepResult {
  id: string;
  action: "PASS" | "DROP" | "MERGE";
  mergeWith?: string;    // id of item to merge with
  reason: string;        // why passed/dropped
}

export interface ScoredNewsItem extends RawNewsItem {
  scores: {
    novelty: number;      // 0-10
    utility: number;      // 0-10
    impact: number;       // 0-10
    credibility: number;  // 0-10
    timeliness: number;   // 0-10
    uniqueness: number;   // 0-10
  };
  weightedScore: number;  // 0-100 final score
  scoreReasoning: string; // brief explanation
}

export interface NewsInsight {
  id: string;
  title: string;
  url: string;
  source: string;
  category: string;
  publishedAt: string;
  oneLiner: string;           // 30 chars max, core info
  whyItMatters: string;       // what changed
  whoShouldCare: string[];    // developer/founder/investor/PM
  actionableAdvice: string;   // what reader can do
  deepDive: string;           // 200 chars, Chinese context analysis
  scores: ScoredNewsItem["scores"];
  weightedScore: number;
}

export interface PlatformContents {
  xhs?: string;      // Xiaohongshu copy
  douyin?: string;    // Douyin script
  brief?: string;     // Telegram/WeChat brief
}

export interface PodcastData {
  script: string;       // dual-host dialogue
  audioUrl?: string;    // R2 URL after upload
}

// ===== Pipeline Errors =====

export interface PipelineError {
  node: string;
  message: string;
  timestamp: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/types.ts
git commit -m "feat: define shared TypeScript types for pipeline"
```

---

### Task 3: Build LLM client with Gemini + OpenAI fallback

**Files:**
- Create: `llm-news-flow/scripts/lib/llm.ts`

- [ ] **Step 1: Write llm.ts with dual-provider fallback**

```typescript
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  model?: "flash" | "pro";
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  provider: "gemini" | "openai";
  tokensUsed?: number;
}

const GEMINI_MODELS = {
  flash: "gemini-2.5-flash-preview-05-20",
  pro: "gemini-2.5-pro-preview-05-06",
} as const;

const OPENAI_MODELS = {
  flash: "gpt-4o-mini",
  pro: "gpt-4o",
} as const;

async function callGemini(req: LLMRequest): Promise<LLMResponse> {
  const model = GEMINI_MODELS[req.model ?? "flash"];
  const contents = req.systemPrompt
    ? `${req.systemPrompt}\n\n---\n\n${req.prompt}`
    : req.prompt;

  const config: Record<string, unknown> = {};
  if (req.jsonSchema) {
    config.responseMimeType = "application/json";
    config.responseJsonSchema = req.jsonSchema;
  }
  if (req.maxTokens) {
    config.maxOutputTokens = req.maxTokens;
  }

  const response = await gemini.models.generateContent({
    model,
    contents,
    config,
  });

  return {
    text: response.text ?? "",
    provider: "gemini",
    tokensUsed: response.usageMetadata?.totalTokenCount,
  };
}

async function callOpenAI(req: LLMRequest): Promise<LLMResponse> {
  const model = OPENAI_MODELS[req.model ?? "flash"];
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (req.systemPrompt) {
    messages.push({ role: "system", content: req.systemPrompt });
  }
  messages.push({ role: "user", content: req.prompt });

  const params: OpenAI.Chat.ChatCompletionCreateParams = {
    model,
    messages,
    max_tokens: req.maxTokens ?? 4096,
  };

  if (req.jsonSchema) {
    params.response_format = { type: "json_object" };
  }

  const response = await openai.chat.completions.create(params);
  const choice = response.choices[0];

  return {
    text: choice?.message?.content ?? "",
    provider: "openai",
    tokensUsed: response.usage?.total_tokens,
  };
}

/**
 * Call LLM with automatic fallback: Gemini first, OpenAI if Gemini fails.
 */
export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  try {
    return await callGemini(req);
  } catch (err) {
    console.warn(
      `[LLM] Gemini failed (${req.model ?? "flash"}), falling back to OpenAI:`,
      (err as Error).message
    );
    return await callOpenAI(req);
  }
}

/**
 * Call LLM and parse JSON response. Retries once on parse failure.
 */
export async function callLLMJson<T>(req: LLMRequest): Promise<T> {
  const response = await callLLM(req);
  try {
    return JSON.parse(response.text) as T;
  } catch {
    // Retry once with explicit JSON instruction
    const retryReq = {
      ...req,
      prompt: req.prompt + "\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown, no code fences, no extra text.",
    };
    const retry = await callLLM(retryReq);
    return JSON.parse(retry.text) as T;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/llm.ts
git commit -m "feat: LLM client with Gemini/OpenAI dual-provider fallback"
```

---

### Task 4: Write all prompt templates

**Files:**
- Create: `llm-news-flow/scripts/lib/prompts.ts`

- [ ] **Step 1: Write prompts.ts with the three-stage decision engine prompts**

```typescript
import { UserInterest } from "./types.js";

/**
 * Build user interest context string from structured config
 */
function buildInterestContext(interests: UserInterest[]): string {
  const must = interests.filter((i) => i.level === "must");
  const high = interests.filter((i) => i.level === "high");
  const medium = interests.filter((i) => i.level === "medium");

  let ctx = "";
  if (must.length) {
    ctx += `【必须关注】${must.map((i) => `${i.topic}(关键词: ${i.keywords.join("、")})`).join("；")}`;
  }
  if (high.length) {
    ctx += `\n【高度关注】${high.map((i) => `${i.topic}(关键词: ${i.keywords.join("、")})`).join("；")}`;
  }
  if (medium.length) {
    ctx += `\n【一般关注】${medium.map((i) => i.topic).join("、")}`;
  }
  return ctx;
}

// ===================================================================
// Stage 1: Gate Keeper - Fast noise filter
// ===================================================================

export function gateKeepSystemPrompt(): string {
  return `你是一位资深的科技资讯编辑，拥有极强的信息鉴别能力。你的工作是从大量原始资讯中快速过滤噪音，只保留真正有价值的内容。

## 你的过滤标准

必须 DROP 的内容：
- 纯广告软文、产品推销、品牌公关稿（没有实质性新信息）
- 标题党：标题夸张但正文无实质内容
- 过时信息：事件发生已超过3天且无新进展
- 重复报道：与列表中其他条目说的是同一件事（标记 MERGE）
- 水文：大段引用无原创观点，或内容空洞缺乏信息量
- 纯观点碎片：没有事实支撑的个人感想、情绪输出
- 活动预告、招聘信息、课程推广

必须 PASS 的内容：
- 重大产品发布、技术突破、论文成果
- 行业格局变化（融资、并购、战略转型、政策法规）
- 可落地的工具、开源项目、实践经验
- 数据驱动的市场分析、行业报告
- 有独到见解的深度评论

MERGE 规则：
- 多个来源报道同一事件时，保留信息量最大的那条，其余标记 MERGE 并指向保留条目的 id

## 输出要求
对每条输入，输出 JSON 对象，包含 id、action（PASS/DROP/MERGE）、mergeWith（MERGE时填写）、reason（简要理由）。`;
}

export function gateKeepUserPrompt(
  items: { id: string; title: string; content: string; source: string }[]
): string {
  const itemsText = items
    .map(
      (item, i) =>
        `[${i + 1}] id="${item.id}"\n标题: ${item.title}\n来源: ${item.source}\n内容: ${item.content.slice(0, 500)}`
    )
    .join("\n\n---\n\n");

  return `请对以下 ${items.length} 条资讯进行快速过滤筛选：\n\n${itemsText}`;
}

// ===================================================================
// Stage 2: Value Analyst - Six-dimension scoring
// ===================================================================

export function scoreSystemPrompt(interests: UserInterest[]): string {
  const interestCtx = buildInterestContext(interests);

  return `你是一位拥有10年以上经验的资深AI行业分析师，同时也是一名信息价值评估专家。你的任务是对每条通过初筛的资讯进行六维度深度评估。

## 用户关注领域

${interestCtx}

## 六维评估框架

对每条资讯，请从以下 6 个维度打分（每维 0-10 分），并给出简要评分理由：

### 1. 新颖性 (novelty) - 权重 20%
- 10分：全球首次报道，颠覆性突破
- 7-9分：重要进展的首批报道，有显著新信息
- 4-6分：已知方向的新进展，有增量信息
- 1-3分：跟风报道，主要是重复已知信息
- 0分：旧闻翻炒

### 2. 实用性 (utility) - 权重 25%（最重要）
- 10分：读者可立即应用到工作/产品中，带来直接收益
- 7-9分：提供可操作的方法论、工具或策略
- 4-6分：提供有用的背景知识或思考框架
- 1-3分：纯理论，短期内难以落地
- 0分：与实际应用无关

### 3. 影响力 (impact) - 权重 20%
- 10分：改变整个行业格局（如 ChatGPT 发布级别）
- 7-9分：影响特定赛道的竞争态势
- 4-6分：对细分领域有明显影响
- 1-3分：影响范围有限
- 0分：无行业影响

### 4. 可信度 (credibility) - 权重 15%
- 10分：一手信源（官方公告、论文、权威媒体实地调查）
- 7-9分：可靠二手信源，有数据或事实支撑
- 4-6分：行业媒体报道，来源可追溯
- 1-3分：未经验证的爆料、传闻
- 0分：明显有误导性或虚假信息

### 5. 时效性 (timeliness) - 权重 10%
- 10分：突发，今天不看就错过关键窗口
- 7-9分：近24小时内的重要进展
- 4-6分：本周内的有价值信息
- 1-3分：信息保鲜期长，不急于当天阅读
- 0分：已经过时

### 6. 独特性 (uniqueness) - 权重 10%
- 10分：我们能提供独家视角，其他中文媒体完全没有覆盖
- 7-9分：我们能提供比大多数中文媒体更深入的解读
- 4-6分：主流媒体有报道但我们能补充不同角度
- 1-3分：各家报道大同小异
- 0分：完全同质化内容

## 输出要求
对每条资讯输出 JSON 对象：id、scores（六维分数对象）、weightedScore（加权总分，0-100）、scoreReasoning（50字以内的核心评价）。

## 评分原则
- 宁缺毋滥：不确定的维度宁可打低分
- 实用优先：实用性权重最高（25%），因为我们的核心价值是"帮用户发现真实的商业机会"
- 关注用户兴趣：与用户关注领域高度相关的内容，在实用性和影响力上酌情加分`;
}

export function scoreUserPrompt(
  items: { id: string; title: string; content: string; source: string }[]
): string {
  const itemsText = items
    .map(
      (item, i) =>
        `[${i + 1}] id="${item.id}"\n标题: ${item.title}\n来源: ${item.source}\n内容: ${item.content.slice(0, 800)}`
    )
    .join("\n\n---\n\n");

  return `请对以下 ${items.length} 条资讯进行六维度深度评估：\n\n${itemsText}`;
}

// ===================================================================
// Stage 3: Insight Generator - Structured insight extraction
// ===================================================================

export function insightSystemPrompt(): string {
  return `你是一位面向中国科技从业者的深度内容编辑。你的目标不是翻译或摘要，而是提炼洞察——帮读者理解"这件事为什么重要"以及"我该怎么做"。

## 你的输出风格

- 通俗易懂：用大白话解释技术概念，避免堆砌术语
- 观点鲜明：不要两边讨好的"一方面…另一方面…"，给出你的判断
- 实战导向：每条洞察都要落到"读者能做什么"
- 中文语境：用中国市场、中国开发者的视角来解读，而不是照搬英文世界的评价

## 输出结构（每条资讯）

1. **oneLiner**：一句话说清楚这件事（不超过30个汉字），要有信息量，不要"某某发布了某某"这种废话
2. **whyItMatters**：为什么重要——这件事改变了什么？对行业/用户/开发者意味着什么？（50-80字）
3. **whoShouldCare**：谁应该关注——从以下角色中选择1-3个最相关的：开发者、创业者、投资人、产品经理、设计师、研究员、学生、普通用户
4. **actionableAdvice**：行动建议——读者看完后可以立刻做什么？（30-50字，要具体可执行）
5. **deepDive**：深度解读——用中文语境分析这件事的技术含义和商业影响，可以类比国内的产品/公司/市场来帮助理解（150-200字）

## 质量红线

- 绝不捏造信息，所有分析必须基于原文事实
- 不用"震惊""炸裂""颠覆"等夸张词汇
- 不说"值得关注""引发热议"等空洞表述
- actionableAdvice 必须是具体动作，不能是"关注后续发展"这种废话`;
}

export function insightUserPrompt(
  items: {
    id: string;
    title: string;
    content: string;
    source: string;
    weightedScore: number;
  }[]
): string {
  const itemsText = items
    .map(
      (item, i) =>
        `[${i + 1}] id="${item.id}" (评分: ${item.weightedScore})\n标题: ${item.title}\n来源: ${item.source}\n内容: ${item.content}`
    )
    .join("\n\n---\n\n");

  return `请对以下 ${items.length} 条精选资讯生成结构化洞察：\n\n${itemsText}`;
}

// ===================================================================
// Daily Report Summary
// ===================================================================

export function dailySummarySystemPrompt(): string {
  return `你是一位资深科技媒体主编。请根据今日精选资讯的洞察，撰写一段200-300字的"今日综述"，概括今天最值得关注的趋势和变化。

要求：
- 不要逐条罗列，要提炼共性和趋势
- 用"今天最值得关注的是…"这样的引导式开头
- 语气专业但不刻板，像资深同行在跟你聊天
- 如果有多条新闻指向同一趋势，要点明这个趋势`;
}

// ===================================================================
// Podcast Script
// ===================================================================

export function podcastSystemPrompt(): string {
  return `你是一档AI科技播客的编剧。请将今日资讯洞察改编为双人对话脚本（主持人A和B）。

## 风格要求

- 自然口语化，像两个懂行的朋友在聊天，不是念稿
- 可以有轻松幽默的包袱，但不要强行搞笑
- 禁用词："炸裂""震惊""太疯狂了""细思极恐"
- 每条新闻用30-60秒的对话覆盖，总时长控制在5分钟以内
- A负责引出话题和提问，B负责分析和解读
- 自然过渡，不要"接下来我们看第二条"这种生硬转场

## 输出格式

A: [对话内容]
B: [对话内容]
...

## 开场和收尾
- 开场：简短打招呼 + 预告今天最劲爆的一条
- 收尾：一句话总结今天的感受 + 固定结束语`;
}

// ===================================================================
// Platform Copy
// ===================================================================

export function xhsSystemPrompt(): string {
  return `你是一位小红书科技博主，擅长用通俗易懂的方式分享AI领域的前沿动态。请将今日资讯改编为小红书图文笔记。

要求：
- 标题：用 emoji + 吸引眼球的短句，不超过20字
- 正文：500-800字，口语化，适当使用 emoji
- 每个要点用 emoji 子弹头标记
- 结尾加互动引导（"你觉得呢？""你会用吗？"）
- 标签矩阵：5-8个相关话题标签，用 # 标记
- 不要堆砌术语，用比喻和类比让普通人也能看懂`;
}

export function douyinSystemPrompt(): string {
  return `你是一位短视频科技博主。请将今日资讯改编为60秒短视频口播脚本。

要求：
- 开头3秒必须有hook（反问/惊人数据/反直觉结论）
- 结构：hook → 核心信息（选最重要的2-3条）→ 你的观点 → 引导关注
- 语速适中，60秒约200字
- 每句话旁标注[画面建议]
- 不用"家人们""兄弟们"等过度亲密称呼`;
}

export function briefSystemPrompt(): string {
  return `请将今日资讯精简为280字以内的简报，用于 Telegram/微信推送。

格式：
📅 AI 日报 | YYYY-MM-DD

🔥 今日 Top 3：
1. [标题] - [一句话摘要]
2. [标题] - [一句话摘要]
3. [标题] - [一句话摘要]

📝 一句话总结：[今日趋势概括]

🔗 完整日报：[链接]`;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/prompts.ts
git commit -m "feat: complete prompt templates for 3-stage decision engine"
```

---

## Chunk 2: Pipeline State + Core Nodes (Gate-Keep, Score, Insight)

### Task 5: Define LangGraph State Annotation

**Files:**
- Create: `llm-news-flow/scripts/state.ts`

- [ ] **Step 1: Write state.ts with StateAnnotation**

```typescript
import { Annotation } from "@langchain/langgraph";
import type {
  PipelineConfig,
  PlatformConfig,
  RawNewsItem,
  GateKeepResult,
  ScoredNewsItem,
  NewsInsight,
  PlatformContents,
  PodcastData,
  PipelineError,
} from "./lib/types.js";

export const PipelineState = Annotation.Root({
  // Config
  config: Annotation<PipelineConfig>,
  platformConfig: Annotation<PlatformConfig>,

  // Pipeline data - flows through stages
  rawItems: Annotation<RawNewsItem[]>({
    reducer: (_, y) => y,   // overwrite
    default: () => [],
  }),
  gateKeepResults: Annotation<GateKeepResult[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  passedItems: Annotation<RawNewsItem[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  scoredItems: Annotation<ScoredNewsItem[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
  insights: Annotation<NewsInsight[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),

  // Output artifacts
  dailyMarkdown: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  dailySummary: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  podcast: Annotation<PodcastData>({
    reducer: (_, y) => y,
    default: () => ({ script: "" }),
  }),
  platformContents: Annotation<PlatformContents>({
    reducer: (_, y) => y,
    default: () => ({}),
  }),

  // Metadata
  date: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  errors: Annotation<PipelineError[]>({
    reducer: (x, y) => x.concat(y),  // accumulate errors
    default: () => [],
  }),
  tokenUsage: Annotation<number>({
    reducer: (x, y) => x + y,        // sum up tokens
    default: () => 0,
  }),
});

export type PipelineStateType = typeof PipelineState.State;
```

- [ ] **Step 2: Commit**

```bash
git add scripts/state.ts
git commit -m "feat: define LangGraph StateAnnotation for pipeline"
```

---

### Task 6: Config loader node

**Files:**
- Create: `llm-news-flow/scripts/nodes/load-config.ts`
- Create: `llm-news-flow/configs/feeds.json`
- Create: `llm-news-flow/configs/prompt.json`
- Create: `llm-news-flow/configs/platforms.json`

- [ ] **Step 1: Create default config files**

`configs/feeds.json`:
```json
{
  "feeds": [
    {
      "id": "folo-ai",
      "type": "folo",
      "url": "https://api.follow.is/entries",
      "category": "AI",
      "name": "Folo AI Feed",
      "weight": 90
    },
    {
      "id": "huggingface-blog",
      "type": "rss",
      "url": "https://huggingface.co/blog/feed.xml",
      "category": "AI/ML",
      "name": "HuggingFace Blog",
      "weight": 85
    },
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

`configs/prompt.json`:
```json
{
  "interests": [
    {
      "topic": "大语言模型",
      "level": "must",
      "keywords": ["LLM", "GPT", "Claude", "Gemini", "Llama", "大模型"]
    },
    {
      "topic": "AI 工具和应用",
      "level": "must",
      "keywords": ["AI Agent", "Copilot", "AI 编程", "提示工程", "RAG"]
    },
    {
      "topic": "开源项目",
      "level": "high",
      "keywords": ["GitHub", "开源", "框架", "SDK"]
    },
    {
      "topic": "AI 商业化",
      "level": "high",
      "keywords": ["融资", "估值", "商业模式", "落地", "创业"]
    },
    {
      "topic": "AI 芯片和算力",
      "level": "medium",
      "keywords": ["GPU", "NVIDIA", "芯片", "算力"]
    }
  ],
  "topN": 10,
  "language": "zh",
  "outputStyle": "professional"
}
```

`configs/platforms.json`:
```json
{
  "telegram": {
    "enabled": true,
    "botToken": "${TELEGRAM_BOT_TOKEN}",
    "chatId": "${TELEGRAM_CHAT_ID}"
  },
  "wechat": {
    "enabled": false,
    "webhookUrl": "${WECHAT_WEBHOOK_URL}"
  },
  "xhs": {
    "enabled": true,
    "style": "tech-blogger"
  },
  "douyin": {
    "enabled": true,
    "style": "short-video"
  },
  "podcast": {
    "enabled": true,
    "voices": ["Kore", "Puck"],
    "maxMinutes": 5
  }
}
```

- [ ] **Step 2: Write load-config.ts**

```typescript
import { readFile } from "fs/promises";
import { join } from "path";
import type { PipelineStateType } from "../state.js";
import type { PipelineConfig, PlatformConfig } from "../lib/types.js";
import dayjs from "dayjs";

const CONFIGS_DIR = join(import.meta.dirname, "../../configs");

function resolveEnvVars(obj: unknown): unknown {
  if (typeof obj === "string") {
    return obj.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] ?? "");
  }
  if (Array.isArray(obj)) return obj.map(resolveEnvVars);
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = resolveEnvVars(v);
    }
    return result;
  }
  return obj;
}

export async function loadConfig(
  _state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  try {
    const feedsRaw = await readFile(join(CONFIGS_DIR, "feeds.json"), "utf-8");
    const promptRaw = await readFile(join(CONFIGS_DIR, "prompt.json"), "utf-8");
    const platformsRaw = await readFile(join(CONFIGS_DIR, "platforms.json"), "utf-8");

    const feeds = JSON.parse(feedsRaw);
    const prompt = JSON.parse(promptRaw);
    const platforms = resolveEnvVars(JSON.parse(platformsRaw)) as PlatformConfig;

    const config: PipelineConfig = {
      feeds: feeds.feeds,
      interests: prompt.interests,
      topN: prompt.topN ?? 10,
      language: prompt.language ?? "zh",
      outputStyle: prompt.outputStyle ?? "professional",
    };

    return {
      config,
      platformConfig: platforms,
      date: dayjs().format("YYYY-MM-DD"),
    };
  } catch (err) {
    return {
      errors: [
        {
          node: "loadConfig",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add configs/ scripts/nodes/load-config.ts
git commit -m "feat: config loader with env var substitution + default configs"
```

---

### Task 7: RSS and Folo data fetching

**Files:**
- Create: `llm-news-flow/scripts/lib/rss.ts`
- Create: `llm-news-flow/scripts/lib/folo.ts`
- Create: `llm-news-flow/scripts/nodes/fetch.ts`

- [ ] **Step 1: Write rss.ts**

```typescript
import Parser from "rss-parser";
import type { RawNewsItem } from "./types.js";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "Mozilla/5.0 LLM-News-Flow/1.0",
  },
});

export async function fetchRSS(
  url: string,
  sourceId: string,
  sourceName: string,
  category: string
): Promise<RawNewsItem[]> {
  const feed = await parser.parseURL(url);
  const now = new Date().toISOString();

  return (feed.items ?? []).map((item, i) => ({
    id: `${sourceId}-${i}-${Date.now()}`,
    title: item.title ?? "Untitled",
    url: item.link ?? "",
    content: item.contentSnippet ?? item.content ?? "",
    source: sourceName,
    sourceId,
    category,
    publishedAt: item.isoDate ?? item.pubDate ?? now,
    fetchedAt: now,
  }));
}
```

- [ ] **Step 2: Write folo.ts**

```typescript
import type { RawNewsItem } from "./types.js";

const FOLO_API = "https://api.follow.is/entries";

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min) + min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchFolo(
  sessionToken: string,
  sourceId: string,
  sourceName: string,
  category: string
): Promise<RawNewsItem[]> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  await randomDelay(1000, 3000);

  const res = await fetch(FOLO_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `authjs.session-token=${sessionToken}`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    body: JSON.stringify({
      publishedAfter: yesterday,
    }),
  });

  if (res.status === 401) {
    throw new Error("Folo session token expired - please update FOLO_SESSION_TOKEN");
  }

  if (!res.ok) {
    throw new Error(`Folo API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const entries = (data as { data?: unknown[] }).data ?? [];

  return entries.map((entry: any, i: number) => ({
    id: `${sourceId}-${i}-${Date.now()}`,
    title: entry.title ?? "Untitled",
    url: entry.url ?? "",
    content: entry.content ?? entry.description ?? "",
    source: sourceName,
    sourceId,
    category,
    publishedAt: entry.publishedAt ?? now,
    fetchedAt: now,
  }));
}
```

- [ ] **Step 3: Write nodes/fetch.ts**

```typescript
import type { PipelineStateType } from "../state.js";
import { fetchRSS } from "../lib/rss.js";
import { fetchFolo } from "../lib/folo.js";
import type { RawNewsItem, PipelineError } from "../lib/types.js";

export async function fetchNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { config } = state;
  if (!config) {
    return {
      errors: [{ node: "fetch", message: "No config loaded", timestamp: new Date().toISOString() }],
    };
  }

  const results: RawNewsItem[] = [];
  const errors: PipelineError[] = [];

  // Fetch all sources in parallel (grouped by type)
  const promises = config.feeds.map(async (feed) => {
    try {
      let items: RawNewsItem[];
      switch (feed.type) {
        case "rss":
          items = await fetchRSS(feed.url, feed.id, feed.name, feed.category);
          break;
        case "folo":
          items = await fetchFolo(
            process.env.FOLO_SESSION_TOKEN ?? "",
            feed.id,
            feed.name,
            feed.category
          );
          break;
        default:
          items = [];
      }
      return { items, error: null };
    } catch (err) {
      return {
        items: [] as RawNewsItem[],
        error: {
          node: "fetch",
          message: `[${feed.name}] ${(err as Error).message}`,
          timestamp: new Date().toISOString(),
        },
      };
    }
  });

  const settled = await Promise.all(promises);
  for (const result of settled) {
    results.push(...result.items);
    if (result.error) errors.push(result.error);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const deduped = results.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  console.log(`[fetch] Got ${results.length} items, ${deduped.length} after dedup, ${errors.length} source errors`);

  return { rawItems: deduped, errors };
}
```

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/rss.ts scripts/lib/folo.ts scripts/nodes/fetch.ts
git commit -m "feat: data fetching layer with RSS + Folo + dedup"
```

---

### Task 8: Gate-Keep node (Stage 1)

**Files:**
- Create: `llm-news-flow/scripts/nodes/gate-keep.ts`

- [ ] **Step 1: Write gate-keep.ts**

```typescript
import type { PipelineStateType } from "../state.js";
import { callLLMJson } from "../lib/llm.js";
import { gateKeepSystemPrompt, gateKeepUserPrompt } from "../lib/prompts.js";
import type { GateKeepResult, RawNewsItem } from "../lib/types.js";

const BATCH_SIZE = 20; // process 20 items per LLM call

export async function gateKeepNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { rawItems } = state;
  if (!rawItems.length) {
    return { passedItems: [], gateKeepResults: [] };
  }

  try {
    const allResults: GateKeepResult[] = [];

    // Process in batches to stay within context window
    for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
      const batch = rawItems.slice(i, i + BATCH_SIZE);
      const batchInput = batch.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        source: item.source,
      }));

      const results = await callLLMJson<GateKeepResult[]>({
        systemPrompt: gateKeepSystemPrompt(),
        prompt: gateKeepUserPrompt(batchInput),
        model: "flash",
        jsonSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              action: { type: "STRING", enum: ["PASS", "DROP", "MERGE"] },
              mergeWith: { type: "STRING" },
              reason: { type: "STRING" },
            },
            required: ["id", "action", "reason"],
          },
        },
      });

      allResults.push(...results);
    }

    // Filter to PASS items + resolve MERGE
    const passIds = new Set(
      allResults.filter((r) => r.action === "PASS").map((r) => r.id)
    );
    // For MERGE items, keep the target (mergeWith) if it passed
    for (const r of allResults) {
      if (r.action === "MERGE" && r.mergeWith) {
        passIds.add(r.mergeWith);
      }
    }

    const passedItems = rawItems.filter((item) => passIds.has(item.id));
    const dropCount = rawItems.length - passedItems.length;

    console.log(
      `[gate-keep] ${rawItems.length} → ${passedItems.length} items (dropped ${dropCount}, ${Math.round((dropCount / rawItems.length) * 100)}% noise)`
    );

    return { passedItems, gateKeepResults: allResults };
  } catch (err) {
    console.error("[gate-keep] Failed, passing all items through:", err);
    return {
      passedItems: rawItems,
      gateKeepResults: [],
      errors: [
        {
          node: "gateKeep",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/nodes/gate-keep.ts
git commit -m "feat: Stage 1 gate-keep node - fast noise filtering"
```

---

### Task 9: Score node (Stage 2)

**Files:**
- Create: `llm-news-flow/scripts/nodes/score.ts`

- [ ] **Step 1: Write score.ts**

```typescript
import type { PipelineStateType } from "../state.js";
import { callLLMJson } from "../lib/llm.js";
import { scoreSystemPrompt, scoreUserPrompt } from "../lib/prompts.js";
import type { ScoredNewsItem } from "../lib/types.js";

const BATCH_SIZE = 10;

interface ScoreResult {
  id: string;
  scores: {
    novelty: number;
    utility: number;
    impact: number;
    credibility: number;
    timeliness: number;
    uniqueness: number;
  };
  weightedScore: number;
  scoreReasoning: string;
}

export async function scoreNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { passedItems, config } = state;
  if (!passedItems.length || !config) {
    return { scoredItems: [] };
  }

  try {
    const allScores: ScoreResult[] = [];

    for (let i = 0; i < passedItems.length; i += BATCH_SIZE) {
      const batch = passedItems.slice(i, i + BATCH_SIZE);
      const batchInput = batch.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        source: item.source,
      }));

      const results = await callLLMJson<ScoreResult[]>({
        systemPrompt: scoreSystemPrompt(config.interests),
        prompt: scoreUserPrompt(batchInput),
        model: "flash",
        jsonSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              scores: {
                type: "OBJECT",
                properties: {
                  novelty: { type: "NUMBER" },
                  utility: { type: "NUMBER" },
                  impact: { type: "NUMBER" },
                  credibility: { type: "NUMBER" },
                  timeliness: { type: "NUMBER" },
                  uniqueness: { type: "NUMBER" },
                },
                required: ["novelty", "utility", "impact", "credibility", "timeliness", "uniqueness"],
              },
              weightedScore: { type: "NUMBER" },
              scoreReasoning: { type: "STRING" },
            },
            required: ["id", "scores", "weightedScore", "scoreReasoning"],
          },
        },
      });

      allScores.push(...results);
    }

    // Map scores back to items
    const scoreMap = new Map(allScores.map((s) => [s.id, s]));
    const scoredItems: ScoredNewsItem[] = passedItems
      .map((item) => {
        const score = scoreMap.get(item.id);
        if (!score) return null;
        return {
          ...item,
          scores: score.scores,
          weightedScore: score.weightedScore,
          scoreReasoning: score.scoreReasoning,
        };
      })
      .filter((x): x is ScoredNewsItem => x !== null)
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, config.topN);

    console.log(
      `[score] Scored ${allScores.length} items, selected top ${scoredItems.length} (cutoff: ${scoredItems[scoredItems.length - 1]?.weightedScore ?? 0})`
    );

    return { scoredItems };
  } catch (err) {
    console.error("[score] Failed:", err);
    // Fallback: pass all items through with default scores
    const fallback: ScoredNewsItem[] = passedItems.slice(0, config.topN).map((item) => ({
      ...item,
      scores: { novelty: 5, utility: 5, impact: 5, credibility: 5, timeliness: 5, uniqueness: 5 },
      weightedScore: 50,
      scoreReasoning: "Scoring failed, using default",
    }));
    return {
      scoredItems: fallback,
      errors: [{ node: "score", message: (err as Error).message, timestamp: new Date().toISOString() }],
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/nodes/score.ts
git commit -m "feat: Stage 2 score node - 6-dimension value assessment"
```

---

### Task 10: Insight node (Stage 3)

**Files:**
- Create: `llm-news-flow/scripts/nodes/insight.ts`

- [ ] **Step 1: Write insight.ts**

```typescript
import type { PipelineStateType } from "../state.js";
import { callLLMJson } from "../lib/llm.js";
import { insightSystemPrompt, insightUserPrompt } from "../lib/prompts.js";
import type { NewsInsight } from "../lib/types.js";

interface InsightResult {
  id: string;
  oneLiner: string;
  whyItMatters: string;
  whoShouldCare: string[];
  actionableAdvice: string;
  deepDive: string;
}

export async function insightNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { scoredItems } = state;
  if (!scoredItems.length) {
    return { insights: [] };
  }

  try {
    // Use Pro model for high-quality insight generation
    const batchInput = scoredItems.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      source: item.source,
      weightedScore: item.weightedScore,
    }));

    const results = await callLLMJson<InsightResult[]>({
      systemPrompt: insightSystemPrompt(),
      prompt: insightUserPrompt(batchInput),
      model: "pro", // Use Pro for quality
      jsonSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            oneLiner: { type: "STRING" },
            whyItMatters: { type: "STRING" },
            whoShouldCare: { type: "ARRAY", items: { type: "STRING" } },
            actionableAdvice: { type: "STRING" },
            deepDive: { type: "STRING" },
          },
          required: ["id", "oneLiner", "whyItMatters", "whoShouldCare", "actionableAdvice", "deepDive"],
        },
      },
    });

    // Merge insight results with scored item metadata
    const insightMap = new Map(results.map((r) => [r.id, r]));
    const insights: NewsInsight[] = scoredItems
      .map((item) => {
        const insight = insightMap.get(item.id);
        if (!insight) return null;
        return {
          id: item.id,
          title: item.title,
          url: item.url,
          source: item.source,
          category: item.category,
          publishedAt: item.publishedAt,
          oneLiner: insight.oneLiner,
          whyItMatters: insight.whyItMatters,
          whoShouldCare: insight.whoShouldCare,
          actionableAdvice: insight.actionableAdvice,
          deepDive: insight.deepDive,
          scores: item.scores,
          weightedScore: item.weightedScore,
        };
      })
      .filter((x): x is NewsInsight => x !== null);

    console.log(`[insight] Generated ${insights.length} structured insights`);
    return { insights };
  } catch (err) {
    console.error("[insight] Failed:", err);
    return {
      insights: [],
      errors: [{ node: "insight", message: (err as Error).message, timestamp: new Date().toISOString() }],
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/nodes/insight.ts
git commit -m "feat: Stage 3 insight node - structured value extraction"
```

---

## Chunk 3: Daily Report + Podcast + Platforms + Publish + Notify

### Task 11: Generate Daily Report markdown

**Files:**
- Create: `llm-news-flow/scripts/nodes/generate-daily.ts`

- [ ] **Step 1: Write generate-daily.ts**

```typescript
import type { PipelineStateType } from "../state.js";
import { callLLM } from "../lib/llm.js";
import { dailySummarySystemPrompt } from "../lib/prompts.js";
import dayjs from "dayjs";

export async function generateDailyNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { insights, date } = state;
  if (!insights.length) {
    return { dailyMarkdown: "" };
  }

  try {
    // Generate daily summary using Pro model
    const insightsSummary = insights
      .map((i) => `- ${i.oneLiner}: ${i.whyItMatters}`)
      .join("\n");

    const summaryResponse = await callLLM({
      systemPrompt: dailySummarySystemPrompt(),
      prompt: `今日精选资讯洞察：\n\n${insightsSummary}`,
      model: "pro",
    });

    const dailySummary = summaryResponse.text;

    // Group by category
    const byCategory = new Map<string, typeof insights>();
    for (const insight of insights) {
      const cat = insight.category || "Other";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(insight);
    }

    // Render markdown
    const displayDate = dayjs(date).format("YYYY年MM月DD日");
    let md = `---
title: "AI 日报 | ${displayDate}"
date: "${date}"
itemCount: ${insights.length}
---

# AI 日报 | ${displayDate}

## 今日综述

${dailySummary}

---

`;

    for (const [category, items] of byCategory) {
      md += `## ${category}\n\n`;
      for (const item of items) {
        const scoreBar = "★".repeat(Math.round(item.weightedScore / 20)) +
          "☆".repeat(5 - Math.round(item.weightedScore / 20));

        md += `### ${item.oneLiner}

**${scoreBar} ${item.weightedScore}分** | 来源: [${item.source}](${item.url})

**为什么重要：** ${item.whyItMatters}

**谁应该关注：** ${item.whoShouldCare.join("、")}

**行动建议：** ${item.actionableAdvice}

${item.deepDive}

---

`;
      }
    }

    console.log(`[generate-daily] Rendered ${insights.length} items across ${byCategory.size} categories`);
    return { dailyMarkdown: md, dailySummary };
  } catch (err) {
    console.error("[generate-daily] Failed:", err);
    return {
      dailyMarkdown: "",
      errors: [{ node: "generateDaily", message: (err as Error).message, timestamp: new Date().toISOString() }],
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/nodes/generate-daily.ts
git commit -m "feat: daily report markdown generator with category grouping"
```

---

### Task 12: Podcast node

**Files:**
- Create: `llm-news-flow/scripts/nodes/podcast.ts`
- Create: `llm-news-flow/scripts/lib/tts.ts`
- Create: `llm-news-flow/scripts/lib/r2.ts`

- [ ] **Step 1: Write tts.ts**

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function synthesizeSpeech(
  script: string,
  voices: string[] = ["Kore", "Puck"]
): Promise<Buffer> {
  // Parse A/B dialogue and synthesize with multi-speaker
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: script,
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: "A", voiceConfig: { prebuiltVoiceConfig: { voiceName: voices[0] } } },
            { speaker: "B", voiceConfig: { prebuiltVoiceConfig: { voiceName: voices[1] } } },
          ],
        },
      },
    },
  });

  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) throw new Error("TTS returned no audio data");

  return Buffer.from(audioData, "base64");
}
```

- [ ] **Step 2: Write r2.ts**

```typescript
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const accessKey = process.env.R2_ACCESS_KEY;
  const secretKey = process.env.R2_SECRET_KEY;
  const bucket = process.env.R2_BUCKET ?? "llm-news-flow";
  const accountId = process.env.R2_ACCOUNT_ID;

  if (!accessKey || !secretKey || !accountId) {
    throw new Error("R2 credentials not configured");
  }

  // Use S3-compatible API
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const url = `${endpoint}/${bucket}/${key}`;

  // Simple PUT upload (for production, use @aws-sdk/client-s3)
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": buffer.length.toString(),
    },
    body: buffer,
  });

  if (!res.ok) {
    throw new Error(`R2 upload failed: ${res.status}`);
  }

  // Return public URL
  const publicDomain = process.env.R2_PUBLIC_DOMAIN ?? `${bucket}.${accountId}.r2.dev`;
  return `https://${publicDomain}/${key}`;
}
```

- [ ] **Step 3: Write nodes/podcast.ts**

```typescript
import type { PipelineStateType } from "../state.js";
import { callLLM } from "../lib/llm.js";
import { podcastSystemPrompt } from "../lib/prompts.js";
import { synthesizeSpeech } from "../lib/tts.js";
import { uploadToR2 } from "../lib/r2.js";

export async function podcastNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { insights, date, platformConfig } = state;

  if (!insights.length || !platformConfig?.podcast?.enabled) {
    return { podcast: { script: "" } };
  }

  try {
    // Generate podcast script
    const insightsSummary = insights
      .map((i) => `标题: ${i.oneLiner}\n为什么重要: ${i.whyItMatters}\n深度解读: ${i.deepDive}`)
      .join("\n\n---\n\n");

    const scriptResponse = await callLLM({
      systemPrompt: podcastSystemPrompt(),
      prompt: `请根据以下今日精选资讯生成播客脚本：\n\n${insightsSummary}`,
      model: "pro",
    });

    const script = scriptResponse.text;
    console.log(`[podcast] Generated script (${script.length} chars)`);

    // TTS synthesis
    let audioUrl = "";
    try {
      const voices = platformConfig.podcast.voices ?? ["Kore", "Puck"];
      const audioBuffer = await synthesizeSpeech(script, voices);
      audioUrl = await uploadToR2(
        audioBuffer,
        `podcast/${date}.mp3`,
        "audio/mpeg"
      );
      console.log(`[podcast] Audio uploaded: ${audioUrl}`);
    } catch (ttsErr) {
      console.warn("[podcast] TTS/upload failed, script still available:", (ttsErr as Error).message);
    }

    return { podcast: { script, audioUrl } };
  } catch (err) {
    console.error("[podcast] Failed:", err);
    return {
      podcast: { script: "" },
      errors: [{ node: "podcast", message: (err as Error).message, timestamp: new Date().toISOString() }],
    };
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/tts.ts scripts/lib/r2.ts scripts/nodes/podcast.ts
git commit -m "feat: podcast pipeline - script gen + TTS + R2 upload"
```

---

### Task 13: Platforms node

**Files:**
- Create: `llm-news-flow/scripts/nodes/platforms.ts`

- [ ] **Step 1: Write platforms.ts**

```typescript
import type { PipelineStateType } from "../state.js";
import { callLLM } from "../lib/llm.js";
import {
  xhsSystemPrompt,
  douyinSystemPrompt,
  briefSystemPrompt,
} from "../lib/prompts.js";
import type { PlatformContents } from "../lib/types.js";

export async function platformsNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { insights, platformConfig, date } = state;
  if (!insights.length) {
    return { platformContents: {} };
  }

  const contents: PlatformContents = {};

  const insightsSummary = insights
    .map((i) => `- ${i.oneLiner}: ${i.whyItMatters}\n  行动建议: ${i.actionableAdvice}`)
    .join("\n");

  // Generate platform-specific content in parallel
  const tasks: Promise<void>[] = [];

  if (platformConfig?.xhs?.enabled) {
    tasks.push(
      callLLM({
        systemPrompt: xhsSystemPrompt(),
        prompt: `今日精选（${date}）：\n\n${insightsSummary}`,
        model: "flash",
      }).then((res) => { contents.xhs = res.text; })
        .catch((err) => { console.warn("[platforms] XHS failed:", err); })
    );
  }

  if (platformConfig?.douyin?.enabled) {
    tasks.push(
      callLLM({
        systemPrompt: douyinSystemPrompt(),
        prompt: `今日精选（${date}）：\n\n${insightsSummary}`,
        model: "flash",
      }).then((res) => { contents.douyin = res.text; })
        .catch((err) => { console.warn("[platforms] Douyin failed:", err); })
    );
  }

  // Brief is always generated (for webhook notifications)
  tasks.push(
    callLLM({
      systemPrompt: briefSystemPrompt(),
      prompt: `今日精选（${date}）：\n\n${insightsSummary}`,
      model: "flash",
    }).then((res) => { contents.brief = res.text; })
      .catch((err) => { console.warn("[platforms] Brief failed:", err); })
  );

  await Promise.all(tasks);
  console.log(`[platforms] Generated: ${Object.keys(contents).join(", ")}`);

  return { platformContents: contents };
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/nodes/platforms.ts
git commit -m "feat: multi-platform content generation (XHS, Douyin, brief)"
```

---

### Task 14: Publish + Notify nodes

**Files:**
- Create: `llm-news-flow/scripts/nodes/publish.ts`
- Create: `llm-news-flow/scripts/nodes/notify.ts`

- [ ] **Step 1: Write publish.ts**

```typescript
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import type { PipelineStateType } from "../state.js";

const CONTENT_DIR = join(import.meta.dirname, "../../content");

export async function publishNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { date, dailyMarkdown, podcast, platformContents, insights, errors } = state;
  if (!date || !dailyMarkdown) {
    return {};
  }

  try {
    const dayDir = join(CONTENT_DIR, date);
    await mkdir(dayDir, { recursive: true });

    // Write all content files
    const writes: Promise<void>[] = [
      writeFile(join(dayDir, "daily.md"), dailyMarkdown, "utf-8"),
      writeFile(
        join(dayDir, "meta.json"),
        JSON.stringify(
          {
            date,
            itemCount: insights.length,
            categories: [...new Set(insights.map((i) => i.category))],
            avgScore: Math.round(
              insights.reduce((sum, i) => sum + i.weightedScore, 0) / insights.length
            ),
            hasPodcast: !!podcast.audioUrl,
            errors: errors.length,
            generatedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        "utf-8"
      ),
    ];

    if (podcast.script) {
      writes.push(writeFile(join(dayDir, "podcast-script.md"), podcast.script, "utf-8"));
    }
    if (platformContents.xhs) {
      writes.push(writeFile(join(dayDir, "xhs.md"), platformContents.xhs, "utf-8"));
    }
    if (platformContents.douyin) {
      writes.push(writeFile(join(dayDir, "douyin.md"), platformContents.douyin, "utf-8"));
    }
    if (platformContents.brief) {
      writes.push(writeFile(join(dayDir, "brief.md"), platformContents.brief, "utf-8"));
    }

    await Promise.all(writes);

    // Update index.json
    const indexPath = join(CONTENT_DIR, "index.json");
    let index: { dates: string[] } = { dates: [] };
    try {
      if (existsSync(indexPath)) {
        const raw = await import("fs/promises").then((fs) => fs.readFile(indexPath, "utf-8"));
        index = JSON.parse(raw);
      }
    } catch { /* ignore */ }

    if (!index.dates.includes(date)) {
      index.dates.unshift(date);
      index.dates.sort((a, b) => b.localeCompare(a));
    }
    await writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");

    console.log(`[publish] Written ${writes.length} files to content/${date}/`);
    return {};
  } catch (err) {
    console.error("[publish] Failed:", err);
    return {
      errors: [{ node: "publish", message: (err as Error).message, timestamp: new Date().toISOString() }],
    };
  }
}
```

- [ ] **Step 2: Write notify.ts**

```typescript
import type { PipelineStateType } from "../state.js";

export async function notifyNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { platformConfig, platformContents, date, errors } = state;
  const brief = platformContents?.brief ?? `AI 日报 ${date} 已发布`;

  const notifications: Promise<void>[] = [];

  // Telegram
  if (platformConfig?.telegram?.enabled && platformConfig.telegram.botToken) {
    notifications.push(
      sendTelegram(
        platformConfig.telegram.botToken,
        platformConfig.telegram.chatId,
        brief
      )
    );
  }

  // WeChat Work
  if (platformConfig?.wechat?.enabled && platformConfig.wechat.webhookUrl) {
    notifications.push(
      sendWechat(platformConfig.wechat.webhookUrl, brief)
    );
  }

  // Report errors via notification
  if (errors.length > 0) {
    const errorMsg = `⚠️ Pipeline errors (${date}):\n${errors.map((e) => `- [${e.node}] ${e.message}`).join("\n")}`;
    if (platformConfig?.telegram?.enabled && platformConfig.telegram.botToken) {
      notifications.push(
        sendTelegram(
          platformConfig.telegram.botToken,
          platformConfig.telegram.chatId,
          errorMsg
        )
      );
    }
  }

  await Promise.allSettled(notifications);
  console.log(`[notify] Sent ${notifications.length} notifications`);
  return {};
}

async function sendTelegram(
  token: string,
  chatId: string,
  text: string
): Promise<void> {
  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    }
  );
  if (!res.ok) {
    console.warn(`[notify] Telegram error: ${res.status}`);
  }
}

async function sendWechat(webhookUrl: string, text: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msgtype: "text",
      text: { content: text },
    }),
  });
  if (!res.ok) {
    console.warn(`[notify] WeChat error: ${res.status}`);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/nodes/publish.ts scripts/nodes/notify.ts
git commit -m "feat: publish + notify nodes with Telegram and WeChat support"
```

---

### Task 15: Wire up LangGraph pipeline

**Files:**
- Create: `llm-news-flow/scripts/graph.ts`

- [ ] **Step 1: Write graph.ts with full StateGraph**

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";
import { PipelineState } from "./state.js";
import { loadConfig } from "./nodes/load-config.js";
import { fetchNode } from "./nodes/fetch.js";
import { gateKeepNode } from "./nodes/gate-keep.js";
import { scoreNode } from "./nodes/score.js";
import { insightNode } from "./nodes/insight.js";
import { generateDailyNode } from "./nodes/generate-daily.js";
import { podcastNode } from "./nodes/podcast.js";
import { platformsNode } from "./nodes/platforms.js";
import { publishNode } from "./nodes/publish.js";
import { notifyNode } from "./nodes/notify.js";

// Build the pipeline graph
const graph = new StateGraph(PipelineState)
  // Sequential: config → fetch → 3-stage LLM engine → daily report
  .addNode("loadConfig", loadConfig)
  .addNode("fetch", fetchNode)
  .addNode("gateKeep", gateKeepNode)
  .addNode("score", scoreNode)
  .addNode("insight", insightNode)
  .addNode("generateDaily", generateDailyNode)

  // Parallel: podcast + platforms (fan-out from generateDaily)
  .addNode("podcast", podcastNode)
  .addNode("platforms", platformsNode)

  // Converge: publish (fan-in)
  .addNode("publish", publishNode)
  .addNode("notify", notifyNode)

  // Edges: sequential pipeline
  .addEdge(START, "loadConfig")
  .addEdge("loadConfig", "fetch")
  .addEdge("fetch", "gateKeep")
  .addEdge("gateKeep", "score")
  .addEdge("score", "insight")
  .addEdge("insight", "generateDaily")

  // Fan-out: generateDaily → podcast + platforms (parallel)
  .addEdge("generateDaily", "podcast")
  .addEdge("generateDaily", "platforms")

  // Fan-in: podcast + platforms → publish
  .addEdge("podcast", "publish")
  .addEdge("platforms", "publish")

  // Final
  .addEdge("publish", "notify")
  .addEdge("notify", END);

const pipeline = graph.compile();

// Run the pipeline
async function main() {
  console.log("=== LLM News Flow Pipeline ===");
  console.log(`Started at: ${new Date().toISOString()}`);

  const result = await pipeline.invoke({});

  console.log("\n=== Pipeline Complete ===");
  console.log(`Date: ${result.date}`);
  console.log(`Raw items: ${result.rawItems?.length ?? 0}`);
  console.log(`After gate-keep: ${result.passedItems?.length ?? 0}`);
  console.log(`After scoring (top N): ${result.scoredItems?.length ?? 0}`);
  console.log(`Insights generated: ${result.insights?.length ?? 0}`);
  console.log(`Podcast: ${result.podcast?.audioUrl ? "✓" : "script only"}`);
  console.log(`Platforms: ${Object.keys(result.platformContents ?? {}).join(", ") || "none"}`);
  console.log(`Errors: ${result.errors?.length ?? 0}`);
  if (result.errors?.length) {
    for (const err of result.errors) {
      console.error(`  [${err.node}] ${err.message}`);
    }
  }
}

main().catch(console.error);
```

- [ ] **Step 2: Commit**

```bash
git add scripts/graph.ts
git commit -m "feat: LangGraph pipeline with 3-stage engine + parallel fan-out"
```

---

## Chunk 4: Frontend (Next.js SSG)

### Task 16: Initialize Next.js frontend

**Files:**
- Create: `llm-news-flow/frontend/package.json`
- Create: `llm-news-flow/frontend/next.config.js`
- Create: `llm-news-flow/frontend/tailwind.config.js`
- Create: `llm-news-flow/frontend/postcss.config.js`
- Create: `llm-news-flow/frontend/app/globals.css`

- [ ] **Step 1: Initialize Next.js project**

Run: `cd llm-news-flow/frontend && npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir=false --import-alias="@/*" --no-turbopack`

Or create manually:

`frontend/package.json`:
```json
{
  "name": "llm-news-flow-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-markdown": "^9.0.0",
    "dayjs": "^1.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Create next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
};

module.exports = nextConfig;
```

- [ ] **Step 3: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: { 500: "#6366f1", 600: "#4f46e5" },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: Create postcss.config.js and globals.css**

`postcss.config.js`:
```javascript
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100;
  }
}
```

- [ ] **Step 5: Install dependencies**

Run: `cd llm-news-flow/frontend && npm install`

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "chore: init Next.js frontend with Tailwind"
```

---

### Task 17: Content loader + Layout

**Files:**
- Create: `llm-news-flow/frontend/lib/content-loader.ts`
- Create: `llm-news-flow/frontend/app/layout.tsx`
- Create: `llm-news-flow/frontend/app/page.tsx`

- [ ] **Step 1: Write content-loader.ts**

```typescript
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const CONTENT_DIR = join(process.cwd(), "../content");

export interface DailyMeta {
  date: string;
  itemCount: number;
  categories: string[];
  avgScore: number;
  hasPodcast: boolean;
}

export function getAllDates(): string[] {
  const indexPath = join(CONTENT_DIR, "index.json");
  if (!existsSync(indexPath)) return [];
  const data = JSON.parse(readFileSync(indexPath, "utf-8"));
  return data.dates ?? [];
}

export function getDailyContent(date: string): string | null {
  const filePath = join(CONTENT_DIR, date, "daily.md");
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}

export function getDailyMeta(date: string): DailyMeta | null {
  const filePath = join(CONTENT_DIR, date, "meta.json");
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

export function getPodcastScript(date: string): string | null {
  const filePath = join(CONTENT_DIR, date, "podcast-script.md");
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}

export function getPlatformContent(
  date: string,
  platform: "xhs" | "douyin" | "brief"
): string | null {
  const filePath = join(CONTENT_DIR, date, `${platform}.md`);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}
```

- [ ] **Step 2: Write app/layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 日报 - 更准、更快、更有用",
  description:
    "高效降噪 · 深度解读 · 实战导向 — LLM 驱动的 AI 资讯精选",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Write app/page.tsx (redirect to latest)**

```tsx
import { redirect } from "next/navigation";
import { getAllDates } from "@/lib/content-loader";

export default function Home() {
  const dates = getAllDates();
  if (dates.length > 0) {
    redirect(`/${dates[0]}`);
  }

  return (
    <main className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">AI 日报</h1>
        <p className="text-gray-500">暂无内容，请先运行 Pipeline 生成日报</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/ frontend/app/layout.tsx frontend/app/page.tsx
git commit -m "feat: content loader + root layout + redirect page"
```

---

### Task 18: Daily report page + components

**Files:**
- Create: `llm-news-flow/frontend/components/Sidebar.tsx`
- Create: `llm-news-flow/frontend/components/DailyReport.tsx`
- Create: `llm-news-flow/frontend/app/[date]/page.tsx`

- [ ] **Step 1: Write Sidebar.tsx**

```tsx
import Link from "next/link";
import { getAllDates } from "@/lib/content-loader";

export default function Sidebar({ currentDate }: { currentDate: string }) {
  const dates = getAllDates();

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 p-4 hidden md:block">
      <div className="mb-6">
        <Link href="/" className="text-xl font-bold text-primary-600">
          AI 日报
        </Link>
        <p className="text-xs text-gray-500 mt-1">更准 · 更快 · 更有用</p>
      </div>
      <nav>
        <ul className="space-y-1">
          {dates.map((date) => (
            <li key={date}>
              <Link
                href={`/${date}`}
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  date === currentDate
                    ? "bg-primary-500 text-white"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {date}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800">
        <Link
          href="/podcast"
          className="block px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Podcast
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Write DailyReport.tsx**

```tsx
"use client";

import ReactMarkdown from "react-markdown";

export default function DailyReport({ content }: { content: string }) {
  // Strip frontmatter
  const body = content.replace(/^---[\s\S]*?---\n/, "");

  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold mb-6 pb-4 border-b">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold mt-10 mb-4 text-primary-600">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-6 mb-2">{children}</h3>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-500 hover:underline"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-6 border-gray-200 dark:border-gray-700" />,
        }}
      >
        {body}
      </ReactMarkdown>
    </article>
  );
}
```

- [ ] **Step 3: Write app/[date]/page.tsx**

```tsx
import { getAllDates, getDailyContent, getDailyMeta } from "@/lib/content-loader";
import Sidebar from "@/components/Sidebar";
import DailyReport from "@/components/DailyReport";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return getAllDates().map((date) => ({ date }));
}

export default function DailyPage({ params }: { params: { date: string } }) {
  const content = getDailyContent(params.date);
  if (!content) notFound();

  const meta = getDailyMeta(params.date);

  return (
    <>
      <Sidebar currentDate={params.date} />
      <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto overflow-y-auto">
        {meta && (
          <div className="flex gap-4 mb-6 text-sm text-gray-500">
            <span>{meta.itemCount} 条精选</span>
            <span>均分 {meta.avgScore}</span>
            {meta.hasPodcast && <span>有播客</span>}
          </div>
        )}
        <DailyReport content={content} />
      </main>
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ frontend/app/[date]/
git commit -m "feat: daily report page with sidebar navigation"
```

---

### Task 19: Podcast page

**Files:**
- Create: `llm-news-flow/frontend/components/PodcastPlayer.tsx`
- Create: `llm-news-flow/frontend/app/podcast/page.tsx`

- [ ] **Step 1: Write PodcastPlayer.tsx**

```tsx
"use client";

import { useRef, useState } from "react";

interface Props {
  date: string;
  audioUrl?: string;
  script: string;
}

export default function PodcastPlayer({ date, audioUrl, script }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showScript, setShowScript] = useState(false);

  return (
    <div className="border rounded-xl p-6 mb-4 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-2">{date}</h3>
      {audioUrl ? (
        <audio ref={audioRef} controls className="w-full mb-3" src={audioUrl} />
      ) : (
        <p className="text-sm text-gray-400 mb-3">音频生成中...</p>
      )}
      <button
        onClick={() => setShowScript(!showScript)}
        className="text-sm text-primary-500 hover:underline"
      >
        {showScript ? "收起脚本" : "查看脚本"}
      </button>
      {showScript && (
        <pre className="mt-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm whitespace-pre-wrap">
          {script}
        </pre>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write app/podcast/page.tsx**

```tsx
import { getAllDates, getDailyMeta, getPodcastScript } from "@/lib/content-loader";
import Sidebar from "@/components/Sidebar";
import PodcastPlayer from "@/components/PodcastPlayer";

export default function PodcastPage() {
  const dates = getAllDates();
  const podcasts = dates
    .map((date) => {
      const meta = getDailyMeta(date);
      const script = getPodcastScript(date);
      return script ? { date, script, hasPodcast: meta?.hasPodcast ?? false } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <>
      <Sidebar currentDate="" />
      <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Podcast</h1>
        {podcasts.length === 0 ? (
          <p className="text-gray-500">暂无播客内容</p>
        ) : (
          podcasts.map((p) => (
            <PodcastPlayer
              key={p.date}
              date={p.date}
              script={p.script}
            />
          ))
        )}
      </main>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/PodcastPlayer.tsx frontend/app/podcast/
git commit -m "feat: podcast page with audio player and script toggle"
```

---

## Chunk 5: CI/CD + Project Files

### Task 20: GitHub Actions workflow

**Files:**
- Create: `llm-news-flow/.github/workflows/daily-pipeline.yml`

- [ ] **Step 1: Write daily-pipeline.yml**

```yaml
name: Daily News Pipeline

on:
  schedule:
    - cron: '0 23 * * *'  # UTC 23:00 = Beijing 07:00
  workflow_dispatch:

jobs:
  pipeline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: cd scripts && npm ci

      - name: Run pipeline
        run: cd scripts && npx tsx graph.ts
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          FOLO_SESSION_TOKEN: ${{ secrets.FOLO_SESSION_TOKEN }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
          R2_ACCESS_KEY: ${{ secrets.R2_ACCESS_KEY }}
          R2_SECRET_KEY: ${{ secrets.R2_SECRET_KEY }}
          R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
          R2_BUCKET: ${{ secrets.R2_BUCKET }}

      - name: Commit and push content
        run: |
          git config user.name "AI News Bot"
          git config user.email "bot@example.com"
          git add content/
          git diff --staged --quiet || git commit -m "daily: $(date +%Y-%m-%d)"
          git push
```

- [ ] **Step 2: Commit**

```bash
git add .github/
git commit -m "feat: GitHub Actions daily pipeline workflow"
```

---

### Task 21: CLAUDE.md + README + content index

**Files:**
- Create: `llm-news-flow/CLAUDE.md`
- Create: `llm-news-flow/content/index.json`

- [ ] **Step 1: Write CLAUDE.md**

```markdown
# LLM News Flow - Claude Code Guide

## Project Overview
LLM-driven personal news aggregation + multi-platform distribution.
Three-stage decision engine: Gate-Keep → Score → Insight.
Daily pipeline: fetch → filter → score → insight → daily report → podcast + platforms → publish → notify.

## Tech Stack
- Pipeline: LangGraph.js (@langchain/langgraph) + TypeScript
- LLM: @google/genai (Gemini primary) + OpenAI (fallback)
- Frontend: Next.js 14 SSG + Tailwind CSS
- Deploy: Vercel + GitHub Actions
- Storage: Git (content), Cloudflare R2 (audio)

## Pipeline Graph (scripts/graph.ts)
Sequential: loadConfig → fetch → gateKeep → score → insight → generateDaily
Parallel fan-out: generateDaily → podcast + platforms
Fan-in: podcast + platforms → publish → notify → END

## Key Files
- scripts/lib/prompts.ts — All LLM prompt templates
- scripts/lib/llm.ts — Gemini/OpenAI dual-provider with fallback
- scripts/lib/types.ts — Shared TypeScript types
- scripts/state.ts — LangGraph State Annotation
- configs/ — JSON configs (feeds, interests, platforms)
- content/ — Auto-generated daily reports (do NOT edit manually)

## Conventions
- Each node has independent try-catch, writes errors to state.errors
- LLM calls always attempt Gemini first, fall back to OpenAI
- content/ is auto-generated by pipeline, never edit manually
- Git commit format: daily: YYYY-MM-DD

## Commands
npx tsx scripts/graph.ts         # Run pipeline
cd frontend && npm run dev       # Local preview
cd frontend && npm run build     # Static build
```

- [ ] **Step 2: Write content/index.json**

```json
{
  "dates": []
}
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md content/index.json
git commit -m "chore: add CLAUDE.md and initial content index"
```

---

## Summary

| Chunk | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | 1-4 | Project scaffold, types, LLM client, all prompts |
| 2 | 5-10 | State, config loader, fetch, gate-keep, score, insight nodes |
| 3 | 11-15 | Daily report, podcast, platforms, publish, notify, graph wiring |
| 4 | 16-19 | Next.js frontend with daily page, sidebar, podcast |
| 5 | 20-21 | GitHub Actions CI/CD, CLAUDE.md, README |

Total: 21 tasks, ~45 steps.
