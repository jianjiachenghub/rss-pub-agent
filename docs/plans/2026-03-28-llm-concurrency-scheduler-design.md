# LLM 全局受控并发调度设计

日期：2026-03-28

## 背景

当前流水线里的 `gate-keep`、`score` 等节点会把新闻切成多个 batch，然后用 `for + await` 串行调用 `callLLM / callLLMJson`。这导致两类问题：

1. 总耗时主要被 LLM 往返时间主导，批次数一多，整条流水线明显变慢。
2. 各节点缺少统一的并发边界；如果未来在节点内直接改成 `Promise.all`，很容易把同一个 provider 瞬间打到限流。

本次目标不是“全面放开并发”，而是把 LLM 调用升级为全局受控并发模式，在加速的同时维持 provider 稳定性。

## 目标

- 为 `callLLM / callLLMJson` 增加全局共享调度器
- 统一限制总并发、单 provider 并发、不同模型层级并发
- 让 `gate-keep / score / insight` 改为并发发 batch，但受全局调度器保护
- 遇到 `429/503/UNAVAILABLE/overloaded` 时，对对应 provider 触发冷却和退避
- 支持环境变量覆盖默认并发参数，便于后续调优

## 默认参数

当前按“激进但仍受控”的目标设置默认值：

- 总并发：`8`
- 单 provider 并发：`4`
- `flash` 并发：`4`
- `pro` 并发：`2`
- provider 冷却基础时长：`6000ms`
- provider 冷却抖动：`0-1500ms`

环境变量预留如下：

- `LLM_MAX_CONCURRENCY`
- `LLM_MAX_PROVIDER_CONCURRENCY`
- `LLM_MAX_FLASH_CONCURRENCY`
- `LLM_MAX_PRO_CONCURRENCY`
- `LLM_PROVIDER_COOLDOWN_MS`
- `LLM_PROVIDER_COOLDOWN_JITTER_MS`

## 架构设计

### 1. 全局调度器

在 `scripts/lib/llm.ts` 内维护一个进程级共享调度器，负责：

- 维护等待队列
- 跟踪当前总活跃数
- 跟踪每个 provider 的活跃数
- 跟踪 `flash/pro` 两个层级的活跃数
- 维护每个 provider 的冷却截止时间

每次真正发起 provider 请求前，都必须先经过调度器拿到执行槽位；请求结束后释放槽位，并触发队列继续出队。

### 2. 冷却与退避

当某个 provider 请求命中可重试错误时：

- 当前请求按现有重试逻辑继续重试
- 在下一次重试前，对该 provider 设置短冷却窗口
- 冷却中的 provider 暂不接收新请求，避免新的同类请求继续堆上去

这会把“局部过载”限制在单 provider，而不是拖垮整条链路。

### 3. 节点侧并发

`gate-keep` 和 `score` 的 batch 会改成批量创建 Promise，再交给全局调度器排队执行；这样节点不再串行等待，但全局并发上限仍然生效。

`insight` 不把单条新闻拆成多个 `pro` 请求，而是保持原有聚合请求方式，只把：

- 主 insight 生成
- 分类修正请求

这两个阶段能并行的部分并起来，避免把 `pro` 模型打得过猛。

## 数据流

1. 节点创建多个 LLM 调用任务
2. 任务进入 `llm.ts` 内的全局队列
3. 调度器检查：
   - 总并发是否已满
   - provider 并发是否已满
   - `flash/pro` 层级并发是否已满
   - provider 是否处于冷却期
4. 满足条件的任务开始执行
5. 请求完成或失败后释放槽位，调度下一批任务
6. 命中限流类错误时，标记 provider 冷却并按退避时间重试

## 错误处理

- 解析错误仍由现有 `callLLMJson` 二次 JSON 重试兜底
- 内容安全错误仍沿用现有节点 fallback
- provider 全失败时，仍按当前 provider chain 逻辑向下切换
- 若某个 batch 在并发模式下失败，节点仍保留现有 fallback 策略，不会直接卡死流水线

## 验证

需要至少覆盖以下验证：

1. 单元测试
   - 调度器不会突破总并发上限
   - 调度器不会突破单 provider 上限
   - 命中 cooldown 时，请求会等待而不是直接发出

2. 类型与脚本验证
   - `npm test`
   - `npx tsc --noEmit -p tsconfig.json`

3. 实跑验证
   - 使用 `--resume-from-raw` 重跑一条日报
   - 确认 `gate-keep / score` 日志由串行改为受控并发
   - 观察是否出现大面积 `429/503` 或 fallback 激增

## 非目标

- 本次不做跨日期持久化队列
- 本次不做按 provider 动态学习最优并发
- 本次不改 `podcast / platforms` 的内容逻辑，只让它们自动受益于全局调度器
