# Codebase Guide

这份文档面向维护者，目标不是重复架构图，而是回答三个更实际的问题：

- 这个仓库从哪里开始读
- 关键模块各自负责什么
- 改某类需求时应该先看哪个文件

## Recommended Reading Order

如果你要快速接手代码，建议顺序如下：

1. `scripts/graph.ts`
   - 看清整条 LangGraph 管线怎么串起来，以及哪里开始分叉并行
2. `scripts/state.ts`
   - 理解节点之间通过什么状态字段通信
3. `scripts/nodes/*.ts`
   - 顺着 graph 顺序看每个节点的输入、输出和失败回退
4. `scripts/lib/*.ts`
   - 遇到节点里真正的核心逻辑，再进入共享库
5. `frontend/lib/content-loader.ts`
   - 理解前端如何消费 `content/` 契约

## Runtime Entry Points

| Entry | File | Purpose |
|---|---|---|
| Pipeline CLI | `scripts/graph.ts` | 本地或 CI 执行整条日报生成管线 |
| Runtime options | `scripts/lib/runtime-options.ts` | 解析 `--date`、`--resume-from-raw`、`PIPELINE_DATE` |
| Runtime paths | `scripts/lib/runtime-paths.ts` | 统一解析 `content/`、`configs/`、`.runtime/` |
| GitHub Actions | `.github/workflows/daily-pipeline.yml` | 定时运行 pipeline 并提交产物 |
| Frontend app | `frontend/app/` | 读取 `content/` 展示站点内容 |

## Pipeline Node Map

| Stage | File | Responsibility | Key outputs |
|---|---|---|---|
| `loadConfig` | `scripts/nodes/load-config.ts` | 读取 `feeds.json`、`prompt.json`、`platforms.json`，并解析运行日期 | `config`, `platformConfig`, `date` |
| `fetchPrimary` | `scripts/nodes/fetch-primary.ts` | 从主 `folo-list` 拉取当日主输入快照，支持从 raw 恢复 | `primaryRawItems`, `fetchCheckpoint`, `fetchMetrics` |
| `preFilter` | `scripts/nodes/pre-filter.ts` | 把主输入压缩成事件候选，并计算覆盖缺口 | `eventCandidates`, `coverageStats` |
| `fetchCoverage` | `scripts/nodes/fetch-coverage.ts` | 对覆盖不足的类别做补抓取 | `rawItems`, `coverageStats`, `fetchMetrics` |
| `buildEditorialAgenda` | `scripts/nodes/editorial-agenda.ts` | 生成当天的叙事主线、must-cover、category boost | `editorialAgenda` |
| `gateKeep` | `scripts/nodes/gate-keep.ts` | 对候选做 PASS / DROP / MERGE 的快速筛选 | `passedItems`, `gateKeepResults` |
| `score` | `scripts/nodes/score.ts` | 六维打分，并按类别覆盖规则选出主候选和 secondary pool | `scoredItems`, `secondaryItems` |
| `enrichSelected` | `scripts/nodes/enrich-selected.ts` | 只对入选项补抓正文、图片和更完整摘要 | 更新 `scoredItems` 内容质量 |
| `insight` | `scripts/nodes/insight.ts` | 生成日报条目的 one-liner / event / interpretation | `insights`, 更新 `secondaryItems` |
| `generateDaily` | `scripts/nodes/generate-daily.ts` | 把 insight 渲染成正式日报 Markdown，并尝试生成英文版 | `dailyMarkdown`, `dailyMarkdownEn`, `dailySummary` |
| `podcastGen` | `scripts/nodes/podcast.ts` | 生成播客脚本和可选音频 | `podcast` |
| `platformsGen` | `scripts/nodes/platforms.ts` | 生成 brief、抖音、小红书等平台内容 | `platformContents` |
| `publish` | `scripts/nodes/publish.ts` | 写入 `content/<date>/`，补写英文 companion files，并更新索引 | `content/` 文件系统产物 |
| `notify` | `scripts/nodes/notify.ts` | 发送飞书 / Telegram / 微信通知并记录投递状态 | `.runtime/delivery/<date>.json` |

## Shared Library Map

下面这些共享库最值得优先理解：

| File | Key methods | Why it matters |
|---|---|---|
| `scripts/lib/llm.ts` | `callLLM`, `callLLMJson`, `parseJsonResponse` | 统一封装 provider 链、重试、回退和 JSON 解析 |
| `scripts/lib/llm-concurrency.ts` | 并发调度相关方法 | 控制总并发、provider 并发和 cooldown |
| `scripts/lib/pre-filter.ts` | `compressPrimaryItems`, `buildCoverageStats` | 决定原始 feed 如何变成事件候选 |
| `scripts/lib/editorial-fallback.ts` | `buildFallbackScores` | LLM 打分不可用时的启发式兜底 |
| `scripts/lib/insight-format.ts` | `computeDailyInsightTarget`, `sanitizeInsightSections`, `buildInsightContent` | 控制 insight 的结构质量和降级规则 |
| `scripts/lib/feed-fetch.ts` | 抓取治理与去重方法 | 管理 source cap、category cap、排序和合并 |
| `scripts/lib/source-enrichment.ts` | 正文补抓取 | 控制 enrich 阶段只对入选项拉长内容 |
| `scripts/lib/english-artifacts.ts` | `translateArtifactToEnglish` | 把中文主产物翻成英文化 companion artifacts |
| `scripts/lib/delivery.ts` | 投递状态读写与去重 | 保证通知幂等，避免重复发送 |
| `scripts/lib/raw-input.ts` / `raw-output.ts` | raw snapshot 读写 | 支撑 resume-from-raw 调试与恢复 |

## Frontend Module Map

| File | Responsibility |
|---|---|
| `frontend/lib/content-loader.ts` | 从 `content/` 读取日报、聚合周报、生成时间线/目录数据 |
| `frontend/lib/daily-report-parser.ts` | 把 Markdown 日报拆成适合组件消费的结构 |
| `frontend/lib/display-text.ts` | 日期标题、周标签、issue 名称等展示文案 |
| `frontend/lib/project-guide.ts` | About 页面使用的项目说明、来源分组和评分维度说明 |
| `frontend/components/DailyReport.tsx` | 正文渲染主组件 |
| `frontend/components/WeeklyDigest.tsx` | 周聚合页面组件 |
| `frontend/components/PublicationShell.tsx` | 多页面共享外壳与布局 |

## Generated Artifacts And Raw Snapshots

运行成功后，`content/<date>/` 是当前系统唯一的正式内容契约：

- `daily.md`
- `daily.en.md`（可选）
- `meta.json`
- `brief.md` / `brief.en.md`
- `douyin.md` / `douyin.en.md`
- `xhs.md` / `xhs.en.md`
- `podcast-script.md` / `podcast-script.en.md`
- `raw/`

`raw/` 目录主要用于恢复与调试，常见文件包括：

- `folo-list.jsonl`
- `fetch-metrics.json`
- `checkpoint.json`
- `event-candidates.json`
- `coverage-stats.json`
- `editorial-agenda.json`
- `enriched-candidates.json`

## Common Change Entry Points

如果你要改下面这些能力，优先看对应文件：

- 改 provider 优先级、重试、JSON 解析
  - `scripts/lib/llm.ts`
- 改 feed 治理、候选压缩、覆盖率目标
  - `scripts/lib/pre-filter.ts`
  - `scripts/lib/feed-fetch.ts`
  - `configs/feeds.json`
  - `configs/prompt.json`
- 改日报筛选和评分策略
  - `scripts/nodes/gate-keep.ts`
  - `scripts/nodes/score.ts`
  - `scripts/lib/editorial-fallback.ts`
- 改日报文风、结构和英文产物
  - `scripts/lib/prompts.ts`
  - `scripts/nodes/insight.ts`
  - `scripts/nodes/generate-daily.ts`
  - `scripts/lib/english-artifacts.ts`
- 改通知和平台文案
  - `scripts/nodes/platforms.ts`
  - `scripts/nodes/notify.ts`
  - `scripts/lib/delivery.ts`
  - `configs/platforms.json`
- 改站点展示与内容聚合
  - `frontend/lib/content-loader.ts`
  - `frontend/components/*`

## Debugging Shortcuts

- 想复跑某一天：
  - `cd scripts && npx tsx graph.ts --date YYYY-MM-DD`
- 想从 raw 快照恢复：
  - `cd scripts && npx tsx graph.ts --resume-from-raw YYYY-MM-DD`
- 想看 pipeline 当前到底写了什么：
  - 先看 `content/<date>/raw/`
- 想确认前端为什么没显示：
  - 先看 `content/index.json`
  - 再看 `frontend/lib/content-loader.ts`
