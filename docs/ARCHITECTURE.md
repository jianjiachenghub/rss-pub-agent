# LLM News Flow Architecture

本文档描述仓库当前生效的系统架构，而不是历史方案或重构草案。

## 1. System Overview

系统目标是把每日新闻处理成一套可发布资产：

- 抓取原始新闻与候选事件
- 用 LLM 完成筛选、评分、正文补全和解读
- 生成日报、播客脚本和平台文案
- 在前端基于日报动态聚合周报与时间线视图
- 写入 `content/`，由前端直接读取展示

当前生产路径的核心组件：

- `scripts/`：LangGraph 编排的数据管线
- `configs/`：抓取源、兴趣偏好、平台配置
- `content/`：每日生成产物与索引
- `.runtime/`：运行时投递状态
- `frontend/`：Next.js 16 展示站点
- `.github/workflows/daily-pipeline.yml`：定时执行与提交产物

## 2. Runtime Topology

当前 graph 定义在 [scripts/graph.ts](../scripts/graph.ts)：

```text
START
  -> loadConfig
  -> fetchPrimary
  -> preFilter
  -> fetchCoverage
  -> buildEditorialAgenda
  -> gateKeep
  -> score
  -> enrichSelected
  -> insight
  -> generateDaily
  -> podcastGen ----\
  -> platformsGen --+-> publish
  -> notify
  -> END
```

说明：

- `generateDaily` 之后分叉执行 `podcastGen` 和 `platformsGen`
- `publish` 是扇入点，等待两个分支结果后统一落盘
- 每个节点独立处理错误，并把错误追加到 `state.errors`

## 3. Pipeline Stages

### 3.1 Input and Candidate Building

`loadConfig`
- 读取 `configs/feeds.json`、`configs/prompt.json`、`configs/platforms.json`
- 解析运行期选项，例如 `PIPELINE_DATE`、`PIPELINE_RESUME_FROM_RAW`

`fetchPrimary`
- 使用 `feeds.json` 中优先级最高的 `folo-list` 作为主力输入
- 把主列表抓取结果写入 `content/<date>/raw/folo-list.jsonl`
- 支持从 raw 快照恢复，避免失败后重新抓取

`preFilter`
- 压缩主列表结果，产出事件候选
- 同时计算各分类覆盖统计和覆盖缺口

`fetchCoverage`
- 根据覆盖缺口，挑选非 `folo-list` 的主池 feed 做补抓
- 合并事件候选和 backfill 结果，产出 `rawItems`

`buildEditorialAgenda`
- 基于 `rawItems` 和覆盖统计生成当天的编务主线
- 输出叙事角度、must-cover IDs、watch signals 与 category boosts

### 3.2 Selection and Analysis

`gateKeep`
- 对候选做快速去噪、合并与丢弃
- 目标是保留值得进入评分环节的条目

`score`
- 对通过项做价值评分与排序
- 当前支持动态主列表，而不是硬编码单一条数

`enrichSelected`
- 只对精选候选补抓源站正文、原站图片和更完整摘要
- 这是“只抓摘要”与“可写解读”之间的关键补全层

`insight`
- 生成主日报条目的 `事件 + 解读`
- 对内容过薄或模型把握不足的条目，不强行写解读

### 3.3 Output Generation

`generateDaily`
- 把主条目渲染为 `daily.md`
- 将不适合深度解读但仍值得保留的条目放入 `更多 24h 资讯`

`podcastGen`
- 生成播客脚本
- 如果 TTS 可用，再产出音频 URL；否则保留脚本

`platformsGen`
- 生成 `brief`、`douyin`、`xhs` 等分发文案

`publish`
- 写入 `content/YYYY-MM-DD/`
- 更新 `content/index.json`
- 不负责 git commit；提交发生在 GitHub Actions 工作流

`notify`
- 发送飞书 / Telegram / 微信通知
- 飞书去重与投递状态记录到 `.runtime/delivery/<date>.json`

## 4. LLM Layer

统一入口在 [scripts/lib/llm.ts](../scripts/lib/llm.ts)。

### 4.1 Provider Strategy

支持的 provider：

- `zhipu`
- `gemini`
- `openai`
- `deepseek`
- `siliconflow`

默认优先级由 `LLM_PROVIDERS` 控制，未显式配置时默认为：

```text
zhipu,gemini,openai
```

### 4.2 Reliability Rules

- `429/503/overloaded/network` 走自动重试
- provider 进入短暂 cooldown 后，调度器会跳过该 provider
- 命中内容安全拦截时，非 Gemini provider 会优先尝试 Gemini 兜底
- 如果所有 provider 都失败，节点仍保留本地 heuristic fallback

### 4.3 Concurrency

LLM 调用已接入全局受控并发调度：

- 总并发、单 provider 并发、`flash/pro` 并发分开控制
- 重点提速节点是 `gateKeep`、`score`、`insight`

## 5. Data and Storage Model

### 5.1 Primary Output

当前对外主数据目录是 `content/`：

```text
content/
├── index.json
└── YYYY-MM-DD/
    ├── daily.md
    ├── brief.md
    ├── douyin.md
    ├── xhs.md
    ├── podcast-script.md
    ├── meta.json
    └── raw/
```

`raw/` 里的快照用于失败恢复，不是前端直接消费的内容。

当前 raw 快照通常包括：

- `folo-list.jsonl`
- `fetch-metrics.json`
- `checkpoint.json`
- `event-candidates.json`
- `coverage-stats.json`
- `raw-candidates.json`
- `editorial-agenda.json`
- `enriched-candidates.json`

### 5.2 Compatibility Artifacts

`reports/` 目录仍存在，用于历史兼容和 `scripts/generate-index.ts` 维护的旧索引；但当前前端主路径读取的是 `content/`，不是 `reports/`。

### 5.3 Runtime State

运行时状态目录是 `.runtime/`：

```text
.runtime/
└── delivery/
    └── YYYY-MM-DD.json
```

目前这里主要保存飞书投递记录，用于避免重复发送并保留失败重试上下文。

## 6. Frontend Architecture

当前前端是 [frontend/](../frontend/) 下的 Next.js 16 应用。

关键事实：

- 仓库根 `package.json` 目前只提供 `graph` / `pipeline` 脚本，不代理前端命令
- 首页读取 `content/index.json`
- 详情页按日期读取 `content/YYYY-MM-DD/daily.md`
- 周报页面不是独立构建产物，而是运行时由 `frontend/lib/content-loader.ts` 基于日报聚合
- 内容加载逻辑集中在 [frontend/lib/content-loader.ts](../frontend/lib/content-loader.ts)
- `frontend/` 是仓库当前唯一保留的展示层入口

## 7. Operations

GitHub Actions 工作流位于 [daily-pipeline.yml](../.github/workflows/daily-pipeline.yml)。

当前行为：

- 按 Asia/Shanghai 计算前一天日期并注入 `PIPELINE_DATE`
- 定时运行 `scripts/graph.ts`
- 生成 `reports/index.json` 兼容索引
- 提交 `content/` 和 `reports/` 变更

## 8. Documentation Policy

为了避免文档漂移，仓库文档分三类：

- 当前事实：`README.md`、`docs/ARCHITECTURE.md`、`frontend/README.md`
- 设计历史：`docs/plans/`
- 过时方案与旧结构：`docs/archive/`
