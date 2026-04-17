# LLM News Flow One-Page Architecture

本文档是 `rss-pub-agent` 的当前生效技术架构一页版，目标是用最少的篇幅说明三件事：

- 这套系统解决什么问题
- 整条数据流如何从信息输入走到发布输出
- 关键模块、数据契约和运行方式如何协同

## 1. 项目定位

LLM News Flow 不是一个 RSS 阅读器，而是一套 AI 驱动的个人新闻编辑流水线。

它要解决的核心问题是：

- 每天输入源太多，人工无法稳定完成全量阅读
- 热门内容不等于高价值内容，单靠热度排序无法形成判断
- AI、市场、软件、政策等不同赛道信息密度失衡，容易被单一类别淹没
- 日报、播客、平台分发和站点展示如果各自维护，会迅速碎片化

系统的最终目标不是“收集更多”，而是“把过去 24 小时的信息压缩成一份有判断、有结构、可复用的内容资产”。

## 2. 整体架构

```text
configs/ + .env
        |
        v
loadConfig
        |
        v
fetchPrimary -> preFilter -> fetchCoverage -> buildEditorialAgenda
        |            |             |                  |
        |            |             |                  v
        |            |             +-----------> selection context
        |            v
        |      event candidates + coverage stats
        v
raw snapshots in content/<date>/raw/
        |
        v
gateKeep -> score -> enrichSelected -> insight -> generateDaily
                                                  |        |
                                                  |        +--> content/<date>/daily.md
                                                  |
                                                  +--> podcastGen
                                                  +--> platformsGen
                                                             |
                                                             v
                                                        publish -> notify
                                                             |
                                                             v
                                           content/<date>/ + content/index.json + .runtime/delivery/
                                                             |
                                                             v
                                                      frontend/ (Next.js)
```

架构上有三个关键决策：

- 主链路严格串行，先完成“抓取、筛选、评分、解读”，再进入输出分支
- `generateDaily` 之后才并行生成播客和平台文案，最后在 `publish` 汇总落盘
- `content/` 是统一内容契约，前端、通知和后续消费都直接读取它

## 3. 分层设计

| 层级 | 核心文件/目录 | 职责 |
|---|---|---|
| 配置层 | `configs/`, `.env` | 定义 feed、编务策略、平台配置和 provider 链 |
| 抓取层 | `scripts/nodes/fetch-primary.ts`, `fetch-coverage.ts`, `scripts/lib/folo.ts`, `feed-fetch.ts` | 拉取主输入与补抓输入，控制优先级、配额和去重 |
| 候选压缩层 | `scripts/nodes/pre-filter.ts`, `scripts/lib/pre-filter.ts` | 把原始条目压缩成事件候选，并计算覆盖缺口 |
| 编务决策层 | `editorial-agenda.ts`, `gate-keep.ts`, `score.ts` | 先形成当天叙事，再做 PASS / DROP / MERGE 与六维打分 |
| 内容生成层 | `enrich-selected.ts`, `insight.ts`, `generate-daily.ts`, `platforms.ts`, `podcast.ts` | 生成日报、播客脚本和平台文案 |
| 发布与投递层 | `publish.ts`, `notify.ts`, `scripts/lib/delivery.ts` | 写入 `content/`、更新索引、发送通知并记录状态 |
| 展示层 | `frontend/` | 读取 `content/` 展示首页、日报页、周视图、播客页 |

## 4. Pipeline 节点职责

### 4.1 输入与候选构建

- `loadConfig`
  - 读取 `feeds.json`、`prompt.json`、`platforms.json`
  - 解析运行参数，如 `PIPELINE_DATE`、`--resume-from-raw`
- `fetchPrimary`
  - 只抓主 `folo-list`
  - 把主输入快照写入 `content/<date>/raw/folo-list.jsonl`
- `preFilter`
  - 对主输入做事件聚类、去重和代表项选取
  - 生成 `eventCandidates` 与 `coverageStats`
- `fetchCoverage`
  - 根据覆盖缺口定向补抓其他主池 feed
  - 生成后续用于筛选和评分的 `rawItems`

### 4.2 编务决策与分析

- `buildEditorialAgenda`
  - 生成当天 `dominantNarrative`、`mustCoverThemes`、`watchSignals`、`categoryBoosts`
  - 它相当于“先决定今天该怎么讲，再决定讲哪些条目”
- `gateKeep`
  - 对候选做 `PASS / DROP / MERGE`
  - 先去噪，再进入更昂贵的 LLM 打分环节
- `score`
  - 通过六维评分计算 `weightedScore`
  - 叠加分类基础权重、当天 boost、must-cover bonus 和覆盖保障
- `enrichSelected`
  - 只对入选项补抓正文、图片和更完整摘要
  - 控制成本，同时提高后续 insight 质量
- `insight`
  - 生成 `oneLiner / event / interpretation`
  - 对不适合做深度条目的候选降级到 secondary pool

### 4.3 输出与发布

- `generateDaily`
  - 渲染正式日报 `daily.md`
  - 同时保留“更多 24h 资讯”作为次级信息层
- `podcastGen`
  - 生成播客脚本
  - 如果 TTS + R2 可用，再输出音频 URL
- `platformsGen`
  - 生成 `brief.md`、`douyin.md`、`xhs.md`
- `publish`
  - 写入 `content/<date>/`
  - 生成英文 companion artifacts，并更新 `content/index.json`
- `notify`
  - 推送飞书 / Telegram / 微信通知
  - 投递状态写入 `.runtime/delivery/<date>.json`

## 5. 决策引擎与 LLM 层

### 5.1 决策引擎

系统的真正核心不是抓取，而是“如何决定什么值得进入日报”。当前采用三层机制：

1. `Editorial Agenda`
   - 先建立当天叙事主线，避免纯热点排序
2. `Gate-Keep`
   - 先做结构化去噪，减少无效条目进入评分
3. `Score`
   - 用六维打分 + 类别覆盖规则，保证日报既有优先级，也有广度

### 5.2 LLM Provider 架构

统一入口在 `scripts/lib/llm.ts`，当前支持：

- `openrouter`
- `zhipu`
- `gemini`
- `openai`
- `deepseek`
- `siliconflow`

关键机制：

- `LLM_PROVIDERS` 控制优先级链，如 `openrouter,gemini,openai`
- 只有配置了 API Key 的 provider 才会激活
- `429 / 503 / overloaded / network` 自动重试
- provider 进入 cooldown 后调度器会跳过
- 命中内容安全拦截时，优先尝试 Gemini 兜底
- 如果仍然失败，节点保留 heuristic fallback

### 5.3 并发控制

并发由 `scripts/lib/llm-concurrency.ts` 统一调度：

- 控制总并发
- 控制单 provider 并发
- 区分 `flash` 与 `pro` 级别请求

这样既能加速 `gateKeep / score / insight`，也能避免单 provider 被瞬时打爆。

## 6. 数据契约

### 6.1 正式产物

系统对外的正式内容契约是 `content/`：

```text
content/
├── index.json
└── YYYY-MM-DD/
    ├── daily.md
    ├── daily.en.md
    ├── meta.json
    ├── brief.md
    ├── brief.en.md
    ├── douyin.md
    ├── douyin.en.md
    ├── xhs.md
    ├── xhs.en.md
    ├── podcast-script.md
    ├── podcast-script.en.md
    └── raw/
```

其中：

- `daily.md` 是主日报
- `meta.json` 提供 `itemCount`、`avgScore`、`categories`、`hasPodcast` 等元信息
- 各平台文案和播客脚本是同一内容源的派生产物
- 英文文件是 best-effort companion artifacts，不阻塞中文主产物

### 6.2 原始快照与恢复

`content/<date>/raw/` 用于调试和失败恢复，常见文件包括：

- `folo-list.jsonl`
- `fetch-metrics.json`
- `checkpoint.json`
- `event-candidates.json`
- `coverage-stats.json`
- `editorial-agenda.json`
- `enriched-candidates.json`

恢复命令：

```bash
cd scripts
npx tsx graph.ts --resume-from-raw YYYY-MM-DD
```

### 6.3 运行态状态

`.runtime/` 目前主要保存投递状态：

```text
.runtime/
└── delivery/
    └── YYYY-MM-DD.json
```

它用于通知幂等、失败重试和排查。

## 7. 前端与运维

### 7.1 前端

前端位于 `frontend/`，采用 Next.js 16 + React 19 + Tailwind CSS 4。

关键约束：

- 前端不参与内容生产，只消费 `content/`
- 首页读取 `content/index.json`
- 详情页读取 `content/<date>/daily.md`
- 周报不是预生成文件，而是运行时聚合视图

这使得生产层与展示层通过文件契约彻底解耦。

### 7.2 运行方式

```bash
npm run graph
cd frontend && npm run dev
```

常用补充命令：

```bash
cd scripts
npx tsx graph.ts --date YYYY-MM-DD
npx tsx graph.ts --resume-from-raw YYYY-MM-DD
```

### 7.3 GitHub Actions

工作流位于 `.github/workflows/daily-pipeline.yml`，当前行为是：

1. 按 `Asia/Shanghai` 计算前一天日期
2. 执行 `scripts/graph.ts`
3. 生成兼容索引 `reports/index.json`
4. 提交 `content/` 与 `reports/` 变更

## 8. 一句话总结

LLM News Flow 的技术架构本质上是一条“可恢复、可扩展、可多输出”的内容生产链：

> 用 LangGraph 驱动多阶段编辑决策，把多源新闻输入压缩成一份结构化日报，再复用同一份内容契约派生出站点、播客和平台分发结果。
