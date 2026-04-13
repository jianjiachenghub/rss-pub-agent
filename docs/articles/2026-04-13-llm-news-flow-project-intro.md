# 用 LangGraph.js 做一套 AI 驱动的个人新闻编辑部：LLM News Flow 项目介绍

每天的信息输入都在变多，但能真正留下来的判断并没有同步变多。

RSS、Folo、热榜、论坛、博客、研究机构公告、公司更新，这些信息源各自都很有价值；真正麻烦的是，当它们同时涌入时，人很容易只留下“今天信息很多”的模糊印象，却没有形成一份稳定、可回顾、可分发的结果。

`rss-pub-agent`，也就是现在的 **LLM News Flow**，就是在这个背景下做出来的。它不想做“另一个 RSS 阅读器”，而是想做一套 **把信息变成判断** 的自动化编辑系统。

## 1. 项目背景与作用

这个项目的出发点很直接：单纯的“收集信息”已经不是主要问题，主要问题变成了“怎么从海量输入里稳定地产出一份真正有价值的输出”。

我想解决的现实问题主要有四个：

1. 每天原始输入太多，人工无法稳定看完。
2. 热门内容不等于高价值内容，很多信息只有热度，没有判断价值。
3. AI 赛道的信息密度极高，很容易把市场、政策、软件工程和商业信号全部淹没。
4. 日报、播客、平台分发和站点展示如果各自维护，会迅速碎片化，最后变成多套互相不同步的内容系统。

所以这个项目的定位不是“看新闻”，而是“做日报”。

更具体地说，它把过去 24 小时的多源资讯加工成一套统一内容资产：

- 一份正式日报
- 一组平台分发文案
- 一份播客脚本
- 一个静态站点可直接展示的内容目录

它的作用，不是替代所有阅读行为，而是把“高噪声输入”压缩成“可消费的判断结果”。

## 2. 使用方法

这个项目现在拆成两个主要运行单元：

- `scripts/`：内容生产与 pipeline
- `frontend/`：内容展示

### 2.1 安装与启动

```bash
git clone https://github.com/jianjiachenghub/rss-pub-agent.git
cd rss-pub-agent

cd scripts && npm install && cd ..
cd frontend && npm install && cd ..
```

复制环境变量模板：

```bash
cp .env.example .env
```

至少配置一个可用的 LLM provider，例如：

```bash
LLM_PROVIDERS=zhipu,gemini,openai
ZHIPU_API_KEY=your_key_here
```

如果要使用主 `folo-list` 输入，还需要配置：

```bash
FOLO_SESSION_TOKEN=your_token_here
```

### 2.2 运行日报生成

在仓库根目录直接运行：

```bash
npm run graph
```

或者进入 `scripts/` 目录执行：

```bash
cd scripts
npx tsx graph.ts
```

如果要重跑某一天：

```bash
npx tsx graph.ts --date 2026-04-08
```

如果上次已经跑出 raw 快照，想从中间状态恢复：

```bash
npx tsx graph.ts --resume-from-raw 2026-04-08
```

### 2.3 启动前端预览

```bash
cd frontend
npm run dev
```

前端会直接读取：

- `content/index.json`
- `content/YYYY-MM-DD/daily.md`
- `content/YYYY-MM-DD/meta.json`

也就是说，这个项目的生产层和展示层是完全通过文件契约解耦的。

## 3. 功能点与亮点

如果只看名字，`rss-pub-agent` 很容易被理解成一个“RSS + LLM”的项目；但它的重点其实不在抓取，而在 **编辑决策**。

当前比较有代表性的功能点和亮点有这些：

### 3.1 多源输入，但不是简单聚合

项目当前配置了 28 个 feed source，覆盖 7 个分类：

- AI
- Investment
- Tech
- Software
- Business
- Politics
- Social

但它不会把所有输入一锅炖，而是先抓一个主 `folo-list`，再根据覆盖缺口去补抓其他 feed。这样做的好处是：

- 主输入更稳定
- 覆盖更可控
- 单一热门赛道不容易占满日报

### 3.2 不直接打分，而是先形成当天叙事

项目里有一个很重要的节点叫 `buildEditorialAgenda`。

它会先判断：

- 今天最重要的叙事主线是什么
- 哪些主题必须覆盖
- 哪些分类今天需要临时加权
- 哪些变量值得继续观察

这一步很像编辑部先开一个短会，先决定“今天该怎么讲”，再决定“具体写哪些条目”。

### 3.3 三层决策：Gate-Keep -> Score -> Insight

这是整个系统最核心的设计。

第一层是 `Gate-Keep`：

- 对候选做 `PASS / DROP / MERGE`
- 先把广告、水文、重复快讯和低价值条目压掉

第二层是 `Score`：

- 从 `signalStrength`
- `futureImpact`
- `personalRelevance`
- `decisionUsefulness`
- `credibility`
- `timeliness`

这六个维度做评分，并叠加类别权重和覆盖保障。

第三层是 `Insight`：

- 为入选条目生成一句话导语
- 生成事件摘要
- 生成“为什么值得关注”的解读
- 对内容更丰富的条目补图、补正文、补对比表

最终结果不是一份“热点清单”，而是一份“有判断的日报”。

### 3.4 一次生成，多处复用

系统不会为不同渠道各写一套内容，而是先生成统一日报，再派生出：

- `daily.md`
- `brief.md`
- `douyin.md`
- `xhs.md`
- `podcast-script.md`

这样内容的主源只有一套，分发渠道只是不同形态的消费方式。

### 3.5 支持恢复、降级和回退

这是这个项目工程上很有价值的一点。

为了避免长链路 LLM 系统“一次失败整条链报废”，它做了三层保护：

- 多 provider 链式回退
- raw snapshot 恢复
- 节点级错误隔离

具体来说：

- `zhipu / gemini / openai / deepseek / siliconflow` 可以按优先级链切换
- `429 / 503 / overloaded / network` 会自动重试
- 中间状态会写入 `content/<date>/raw/`
- 可以通过 `--resume-from-raw` 从中间状态继续跑
- provider 全部失败时，关键节点还能退回 heuristic fallback

这使得它更像一个“能连续工作的系统”，而不是一条只能跑 happy path 的 demo 链路。

## 4. 背后涉及的技术及技术架构

### 4.1 技术栈

这个项目背后的技术栈并不复杂，但分工非常明确：

| 层级 | 技术 |
|---|---|
| 管线编排 | LangGraph.js + TypeScript |
| LLM 层 | zhipu / gemini / openai / deepseek / siliconflow |
| 抓取层 | Folo API + RSSHub + rss-parser |
| 展示层 | Next.js 16 + React 19 + Tailwind CSS 4 |
| 内容渲染 | Markdown + react-markdown + remark-gfm |
| 存储 | Git + `content/` 文件契约 + `.runtime/` 状态目录 |
| 音频存储 | Cloudflare R2 |
| 自动化 | GitHub Actions |

### 4.2 整体架构

整条主流程如下：

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

这里面最关键的不是“节点多”，而是每个节点的职责边界相对清晰：

- `fetchPrimary / fetchCoverage`
  - 负责输入层
- `preFilter`
  - 负责事件压缩与覆盖统计
- `buildEditorialAgenda / gateKeep / score`
  - 负责决策层
- `enrichSelected / insight / generateDaily`
  - 负责生成层
- `podcastGen / platformsGen / publish / notify`
  - 负责输出与投递层

### 4.3 为什么这个架构有效

这个架构有效，不是因为它用了 LangGraph，也不是因为它接了多个模型，而是因为它把“内容生产”这件事拆成了几层可维护的结构：

1. **输入治理**
   - 不直接抓平所有 feed，而是区分主输入和补输入
2. **编辑决策**
   - 不是简单打分，而是先形成当天叙事
3. **统一内容契约**
   - 先生成 `content/`，再让前端和平台去消费
4. **工程兜底**
   - 通过回退、恢复和快照，让系统具备持续运行能力

### 4.4 内容为什么落到文件而不是数据库

这个项目当前没有把日报主数据放进数据库，而是直接落到：

```text
content/YYYY-MM-DD/
```

这么做有两个很实际的优点：

- 内容天然适合版本化，Git 很适合管理 Markdown 产物
- 展示层可以只认文件契约，不需要感知上游实现细节

这也是为什么前端的职责很克制：它只负责读取 `content/` 和做页面聚合，不负责参与生成逻辑。

## 结语

如果用一句话概括这个项目，我会说：

> 它不是一个“帮你看新闻”的工具，而是一套“把信息压缩成判断结果”的自动化编辑系统。

对我来说，`rss-pub-agent` 最有意思的地方，不是“它能不能再接更多模型”，而是它已经把一件原本非常个人化、非常依赖临场感的信息处理工作，逐步工程化成了一条可恢复、可维护、可复用的内容流水线。

这也是我认为它最值得继续打磨的地方。
