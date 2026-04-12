<callout emoji="🧠" background-color="light-blue" border-color="blue">
这份文档描述 <code>rss-pub-agent</code> 当前生效的技术方案。它不是泛泛的“新闻聚合器”介绍，而是围绕真实代码实现整理出的系统架构说明。

- 目标：把海量资讯处理成一套可发布的日报资产
- 当前实现：28 个 feed source、7 个分类、14 个 LangGraph 节点
- 主要产物：日报、平台分发文案、播客脚本、前端展示页
</callout>

## 1. 项目定位

这套系统的目标不是做“又一个 RSS 阅读器”，而是做一条稳定的编辑流水线，把每天过去 24 小时的多源资讯加工成一份结构稳定、可阅读、可分发、可归档的研究日报。

它解决的是三个问题：

1. 输入太多：原始 RSS / Folo 条目每天可能达到数百条，人工看不过来。
2. 价值密度太低：大量条目只是重复转载、热榜噪音或没有判断价值的短内容。
3. 输出太分散：日报、平台摘要、播客脚本、站点展示如果分别手工维护，成本会迅速失控。

对应地，系统把“抓取 -> 筛选 -> 判断 -> 输出”固化为一条工程化流水线。

## 2. 系统全景

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

核心设计原则有四条：

- 主路径串行：保证“抓到什么、筛掉什么、为什么入选”有稳定依赖顺序。
- 输出并行：`generateDaily` 之后把播客脚本和平台文案拆成并行分支，缩短总耗时。
- 节点容错：每个节点独立 try-catch，把错误写入 `state.errors`，尽量让后续节点继续推进。
- 结果落盘优先：`publish` 负责把内容和索引写入 `content/`，后续站点和工作流都以文件为契约。

## 3. 目录与职责划分

| 目录 | 职责 | 说明 |
|---|---|---|
| `scripts/` | 管线编排与核心业务逻辑 | LangGraph 图、节点实现、LLM 层、抓取逻辑 |
| `configs/` | 运行时配置 | 信源、编辑策略、平台配置 |
| `content/` | 对外主产物目录 | 每日内容和索引，前端直接读取 |
| `.runtime/` | 运行时状态目录 | 目前主要保存飞书投递记录 |
| `frontend/` | 展示层 | Next.js 16 读取 `content/` 做首页、详情页、周报与播客页 |
| `.github/workflows/` | 自动化执行 | 定时跑 pipeline、生成兼容索引、提交内容 |

## 4. 输入层设计

### 4.1 信源治理

当前信源配置写死在 `configs/feeds.json`，总计 28 个 feed source，按 7 个分类组织：

- AI：7
- Investment：4
- Tech：4
- Software：3
- Business：3
- Politics：4
- Social：3

信源又分为三层：

| 层级 | 数量 | 角色 |
|---|---:|---|
| `core` | 11 | 高优先级、主池优先保留 |
| `signal` | 14 | 补充覆盖面和外部信号 |
| `watch` | 3 | 趋势观察与热榜补充，默认不进入主池 |

每个 feed 还可以配置：

- `weight`：抓取与竞争优先级
- `dailyCap`：单信源 24h 内最多贡献多少条
- `keepInMainPool`：是否进入主输入池
- `tier`：`core / signal / watch`

### 4.2 为什么要拆成主抓取和补抓取

系统没有一上来就把 28 个源全部粗暴抓平，而是拆成两段：

- `fetchPrimary`：只抓主 `folo-list`，形成当天的主输入快照
- `fetchCoverage`：根据覆盖缺口，再去定向补抓其他主池 feed

这样做的好处有两个：

1. 主输入稳定：每天的第一批候选来自同一条主发现链路，不会因为某个外部源抖动导致输入形态剧烈变化。
2. 覆盖可控：如果当天 AI 信息过密，也不会直接把其他分类挤没；补抓取只为“补齐”，而不是重新洗牌。

## 5. Pipeline 各阶段职责

| 阶段 | 主要输入 | 主要输出 | 作用 |
|---|---|---|---|
| `loadConfig` | 配置文件 | `config` / `platformConfig` / `date` | 装载配置并解析运行日期 |
| `fetchPrimary` | `folo-list` 配置 | `primaryRawItems` | 拉主列表并把快照写到 `content/<date>/raw/` |
| `preFilter` | `primaryRawItems` | `eventCandidates` / `coverageStats` | 事件压缩、标题归并、覆盖缺口识别 |
| `fetchCoverage` | 候选事件、覆盖统计 | `rawItems` | 对缺口分类补抓主池信源 |
| `buildEditorialAgenda` | `rawItems` | `editorialAgenda` | 生成当天叙事、must-cover 主题和分类 boost |
| `gateKeep` | `rawItems` | `passedItems` | 批量 PASS / DROP / MERGE 去噪 |
| `score` | `passedItems` | `scoredItems` / `secondaryItems` | 六维评分、分类保障、候选池截断 |
| `enrichSelected` | `scoredItems` | enriched candidates | 对精选条目补正文和更完整上下文 |
| `insight` | enriched items | `insights` | 生成事件摘要、解读、配图、表格、代码片段 |
| `generateDaily` | `insights` | `daily.md` / `dailySummary` | 渲染正式日报 Markdown |
| `podcastGen` | `insights` | `podcast` | 生成脚本，必要时走 TTS + R2 |
| `platformsGen` | `insights` | `brief` / `douyin` / `xhs` | 生成平台分发文案 |
| `publish` | 所有产物 | 文件落盘 | 写入 `content/<date>/`，更新 `content/index.json` |
| `notify` | 摘要和链接 | 外部通知 | 飞书 / Telegram / 微信推送 |

## 6. 编辑决策引擎

这套系统最关键的不是“抓新闻”，而是“如何决定哪些东西值得写进日报”。这里用了三层机制叠加：

### 6.1 Editorial Agenda

`buildEditorialAgenda` 先对当天样本做一次编务判断，产出：

- `dominantNarrative`
- `openingAngle`
- `closingOutlookAngle`
- `mustCoverThemes`
- `watchSignals`
- `mustCoverIds`
- `categoryBoosts`

这一步相当于把“今天应该怎么看这堆新闻”提前确定下来，后续的 Gate-Keep 和 Score 都不再是孤立打分。

### 6.2 Gate-Keep

`gateKeep` 不是简单关键词过滤，而是要求模型做结构化决策：

- `PASS`
- `DROP`
- `MERGE`

这样可以把广告、空洞转载、重复快讯和低价值热榜在前面压掉，避免把成本浪费到后续节点。

### 6.3 Score

评分采用六维模型：

| 维度 | 权重 |
|---|---:|
| `signalStrength` | 0.24 |
| `futureImpact` | 0.23 |
| `personalRelevance` | 0.18 |
| `decisionUsefulness` | 0.17 |
| `credibility` | 0.12 |
| `timeliness` | 0.06 |

在基础分之上再叠加：

- 基础分类权重
- 当日 `editorialAgenda.categoryBoosts`
- must-cover bonus
- 社区源 penalty
- 最低分类覆盖保障

这保证了系统不是单纯按“最热”排序，而是按“对判断是否有帮助”排序。

## 7. LLM 层设计

LLM 入口统一在 `scripts/lib/llm.ts`。

当前支持的 provider：

- `zhipu`
- `gemini`
- `openai`
- `deepseek`
- `siliconflow`

调度策略的重点是：

- `LLM_PROVIDERS` 控制优先级链
- 只有配置了 API Key 的 provider 才会启用
- `429 / 503 / overloaded / network` 自动重试
- provider 进入 cooldown 后自动跳过
- 命中安全拦截时优先尝试 Gemini 兜底
- 所有 provider 失败时保留 heuristic fallback

另一个重要能力是并发调度：

- 总并发受控
- 单 provider 并发受控
- `flash / pro` 分池

这使得 `gateKeep`、`score`、`insight` 这些批处理节点能并行跑起来，而不会把单一 provider 打爆。

## 8. 数据落盘与消费契约

对外主契约目录是 `content/`：

```text
content/
├── index.json
└── YYYY-MM-DD/
    ├── daily.md
    ├── meta.json
    ├── brief.md
    ├── douyin.md
    ├── xhs.md
    ├── podcast-script.md
    └── raw/
```

其中：

- `daily.md`：正式日报正文
- `meta.json`：摘要元信息，如 `itemCount`、`avgScore`、`hasPodcast`
- `brief.md` / `douyin.md` / `xhs.md`：平台文案
- `podcast-script.md`：播客脚本
- `raw/`：失败恢复和调试快照，不给前端直接消费

`.runtime/delivery/` 目前用于记录飞书消息投递状态，避免重复发送。

## 9. 前端展示层

当前前端位于 `frontend/`，技术栈是 Next.js 16 + React 19 + Tailwind CSS 4。

前端有三个关键特征：

1. 不参与内容生成，只消费 `content/`
2. 首页直接读取 `content/index.json`
3. 周报不是独立文件，而是运行时由 `content-loader.ts` 基于日报动态聚合

这意味着内容生产和内容展示完全解耦：只要 `content/` 契约稳定，前端可以独立演进。

## 10. 运维与恢复策略

这套系统在工程上还做了三层保护：

### 10.1 Raw 快照恢复

通过 `PIPELINE_RESUME_FROM_RAW` 或 `--resume-from-raw`，可以从 `content/<date>/raw/` 直接恢复，避免长链路失败后整条重跑。

### 10.2 GitHub Actions 定时执行

工作流按 Asia/Shanghai 计算“前一天”的日期，再执行：

1. 安装 `scripts/` 依赖
2. 运行 `scripts/graph.ts`
3. 生成 `reports/index.json` 兼容索引
4. 提交 `content/` 和 `reports/`

### 10.3 节点级降级

即使某个节点失败，系统也尽量让后续继续执行：

- 把错误写到 `state.errors`
- 能 fallback 的节点尽量 fallback
- 输出层尽量保留已有内容

## 11. 当前方案的价值与边界

### 价值

- 把“信息过载”转换成“可消费的判断结果”
- 把编辑逻辑从个人脑内经验显式化为配置和节点
- 把日报、平台分发、前端展示拉到同一条内容供应链上

### 边界

- 仍然依赖外部源质量，尤其是 Folo / RSSHub 稳定性
- 评分和解读仍然受模型能力与成本约束
- 周报目前是前端聚合视图，不是独立研究产物
- `reports/` 仍然保留为兼容资产，仓库公开面还可以继续收束

## 12. 一句话总结

如果用一句话概括，这个项目做的事情是：

> 用一条可恢复、可扩展、可多输出的 LangGraph 新闻流水线，把“每天上百条原始资讯”压缩成“一份有判断的日报”。
