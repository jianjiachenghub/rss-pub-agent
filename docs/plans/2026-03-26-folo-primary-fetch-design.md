# Folo Primary 抓取与前置压缩设计

## 目标

围绕 `folo-list` 构建一套稳定的主抓取流程，满足以下目标：

- 尽量覆盖完整 24 小时信息面，不依赖硬总量限额直接截断
- 允许 `folo-list` 在原始层产生 `1000-2000` 条新闻，但不把原始洪流直接送进 LLM
- 通过前置去重、事件聚类和分类补抓，把最终日报候选压到 `80-120` 条
- 遇到网络波动、Folo 限速或长时间抓取异常时，自动降级而不是整条 pipeline 崩掉

## 总体结构

将当前流程：

`loadConfig -> fetch -> gateKeep -> score -> insight -> generateDaily`

调整为：

`loadConfig -> fetchPrimary -> preFilter -> fetchCoverage -> gateKeep -> score -> insight -> generateDaily`

### 节点职责

#### `fetchPrimary`

- 只负责抓取 `folo-list`
- 尽量覆盖完整 24 小时
- 逐页处理，不把所有分页结果一次性积压在内存里
- 每页抓完就进行基础去重和 checkpoint 保存
- 输出：
  - `primaryRawItems`
  - `fetchCheckpoint`
  - `fetchMetrics`

#### `preFilter`

- 负责把原始文章流压缩为事件候选池
- 不做深度质量判断，只做轻量规则和事件折叠
- 处理顺序：
  - URL 精确去重
  - 标题标准化去重
  - 同源短时间刷屏折叠
  - 事件 key 生成与聚类
  - 每个事件保留 1-2 篇代表稿
- 输出：
  - `eventCandidates`
  - `coverageStats`

#### `fetchCoverage`

- 在 `preFilter` 之后，检查各分类覆盖是否不足
- 仅对缺口分类补抓直连源
- 目标是纠偏，不是并列主抓
- 输出：
  - 合并后的 `rawItems`
  - 更新后的 `coverageStats`

## 关键设计

### 1. `folo-list` 是主召回层，不是最终候选层

`folo-list` 中的源是人工维护过的高质量集合，因此应当作为第一优先级抓取入口。

但 `folo-list` 的原始文章量不应直接进入日报主链路，否则会带来两个问题：

- LLM 成本和处理时间失控
- 同一事件的重复报道吞掉大量预算

因此，`folo-list` 负责“尽量捞全”，`preFilter` 负责“尽量压缩”。

### 2. 事件级压缩，不是文章级硬限额

本系统真正要保的是“每个重要事件至少出现一次”，而不是“每篇文章都保留下来”。

因此前置压缩的核心不是砍总条数，而是折叠重复信息：

- 多个源报道同一事件，只保留 1-2 篇代表稿
- 同源刷屏内容合并成事件簇
- 重复标题、轻微改写标题、转载稿在原始层即合并

建议压缩目标：

- 原始抓取：`1000-2000`
- 去重后文章：`400-700`
- 事件簇：`120-200`
- 进入 `gateKeep` 的候选：`80-120`
- 最终日报：`30-50`

### 3. 稳定性优先的分页抓取

`folo-list` 的分页抓取采用串行页拉取，不并发翻页，避免因为速率和会话问题触发失败。

每页规则：

- 单页超时：`20-30s`
- 单页重试：`3` 次
- 指数退避：`2s -> 5s -> 10s`
- 连续失败阈值：`5` 页

达到连续失败阈值后进入降级模式，而不是整条 pipeline 失败。

## 降级策略

### 软降级

当 `folo-list` 抓取速度过慢或频繁超时时：

- 保留分页抓取，但只抓标题、摘要、时间、来源
- 暂不追求完整正文
- 继续输出事件池

### 硬降级

当连续失败过多或抓取时间超过上限时：

- 立即停止继续翻页
- 使用当前已抓到的事件池继续后续流程
- 启动 `fetchCoverage` 去补齐缺口分类

### 恢复机制

- 每页保存 `publishedAfter`
- 记录已抓页数、成功页数、失败页数
- 记录最后一个有效时间边界

这样即使中断，也可以从 checkpoint 恢复，而不是从第一页重来。

## 状态字段设计

建议在 `scripts/state.ts` 中增加：

- `primaryRawItems`
  - `folo-list` 原始抓取结果
- `eventCandidates`
  - `preFilter` 后的事件候选池
- `coverageStats`
  - 各分类数量、缺口、代表来源
- `fetchCheckpoint`
  - 当前分页游标、已抓页数、失败计数
- `fetchMetrics`
  - 抓取耗时、总条数、去重率、压缩率

## 落盘与审计

建议将原始层和中间层按天落盘，方便复盘和调参：

- `content/<date>/raw/folo-list.jsonl`
- `content/<date>/raw/checkpoint.json`
- `content/<date>/raw/coverage-stats.json`
- `content/<date>/raw/event-candidates.json`

目标不是长期存档每个阶段，而是提供可观察性：

- 今天是否真的抓全了 24h
- 去重折叠是否过度
- 哪些分类长期不足

## 与现有 feeds 的关系

- `folo-list` 升级为 primary 入口
- 其他 `folo/rss` 直连源不再与主入口并列抢预算
- 它们只在 `fetchCoverage` 阶段，用于补充 `business / politics / software / investment` 等缺口分类
- 热榜类源继续保留为观察源，不默认进入主日报主池

## 实现顺序

1. 将 `folo-list` 从 `watch` 调整为 primary-first 语义
2. 拆分 `fetch` 为 `fetchPrimary + preFilter + fetchCoverage`
3. 增加 checkpoint、metrics 和 raw 落盘
4. 引入事件级压缩
5. 最后再调 `score` 和日报展示层
