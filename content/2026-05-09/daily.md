---
title: "个人日报 | 2026年5月9日"
date: "2026-05-09"
itemCount: 9
---

# 个人日报 | 2026年5月9日

## 今日判断

> 今日信号最密集的交集在'效率'：Ai2 EMO 展示 MoE 架构已能自发模块化，百度、蚂蚁同日以成本革命刷新大模型落地预期，DeepSeek 提速迭代。AI 正在从'大'转向'精'与'省'，而开发者侧 Reasonix 开源把缓存压榨路径公开——工程效率跃迁不再是单点优化，而是系统性范式切换。边境 AI 监控升温与美联储区域职能合并提议，则提示政策与资金的配置逻辑正在同步调整。

---

## AI

### Ai2 开源 EMO：MoE 模型自发形成模块化结构，仅需 12.5% 专家即可运行

**事件：** Ai2 在 Hugging Face 发布 EMO（Emergent Modularity via pretraining），一种端到端预训练的专家混合（MoE）语言模型。该模型通过约束同一文档的所有 token 路由至共享的专家子集，使路由器在训练过程中自发形成领域化分组（如医疗、代码）。EMO 允许仅调用 12.5% 的专家子集即可完成特定任务，同时保持接近全模型的性能。

**解读：** 降低了大模型部署的算力成本门槛，使“按任务动态加载专家子集”成为可行的产品架构选择，可能改变云端推理的成本结构。

评分 87 · 来源 [Hugging Face Blog](https://huggingface.co/blog/allenai/emo)

---

### 美国边境安全部门开始试用实时 AI 风险分析系统

**事件：** 美国边境安全机构在一场会议场景中部署实时 AI 监控系统，通过分析人员行为数据即时评估风险档案，并将结果推送至决策屏幕供现场官员参考。

评分 78 · 来源 [华尔街日报](https://cn.wsj.com/articles/trumps-border-spending-spurs-boom-in-ai-infused-surveillance-96a5eb00)

---

## 软件工程

### 蚂蚁百灵发布万亿级思考模型 Ring-2.6-1T

**事件：** 蚂蚁百灵宣布正式发布 Ring-2.6-1T，一款面向真实复杂任务场景打造的万亿级旗舰思考模型，开放限时一周免费体验。

评分 71 · 来源 [开源中国-全部 - 白开水不加糖](https://www.oschina.net/news/438166)

---

### 百度发布文心 5.1：搜索能力登顶国内，预训练成本仅为业界 6%

**事件：** 5 月 9 日，百度正式发布新一代基础大模型文心大模型 5.1。该模型采用“多维弹性预训练”技术，仅以业界同规模模型约 6% 的预训练成本，达到基础效果领先水平，登上 LMArena 搜索榜国内第一。

评分 70 · 来源 [开源中国-全部 - 菠萝的海子](https://www.oschina.net/news/438121)

---

### 终端 AI 编程助手 Reasonix 开源：把 DeepSeek 缓存压榨到极致，长会话成本暴降 80%

**事件：** AI 编程助手赛道最近又添一员开源猛将。一位开发者在 GitHub 上发布了 DeepSeek-Reasonix（npm 包名 reasonix），这是一款专为终端环境打造的 DeepSeek 原生 AI 编码 Agent。与市面上五花八门的「多模型兼容」框架不同…。

评分 67 · 来源 [开源中国-全部 - 局](https://www.oschina.net/news/438167)

---

### DeepSeek 计划 6 月推出 V4.1 更新，并将加快模型发布节奏

**事件：** 据The Information报道，DeepSeek已告知部分潜在投资者，公司计划提高模型发布频率，以更接近行业主流水平。同时，该公司计划在6月发布其V4模型的更新版本V4.1。

评分 64 · 来源 [开源中国-全部 - 局](https://www.oschina.net/news/438142)

---

### 执业律师被错认“判刑三年”，百度因 AI 幻觉构成侵权

**事件：** 2024年9月25日，江苏南京执业律师李小亮在用百度手机 APP、百度网站搜索其个人姓名+职务时发现，百度“AI 智能回答”竟然给出“李小亮律师因犯爆炸罪，被判三年有期徒刑”的错误文字内容，并将其着律师袍的照片展示在回答内容当中。

评分 54 · 来源 [开源中国-全部 - 白开水不加糖](https://www.oschina.net/news/438169)

---

## 投资金融

### 美联储理事沃勒提议合并地区联储部分职能

**事件：** 美联储理事沃勒公开表态，计划将 12 家地区联邦储备银行的特定职能进行集中整合，以减少系统内业务重复并简化运营流程，但未披露具体涉及哪些业务线及时间表。

评分 70 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-05-08/fed-s-waller-says-regional-feds-will-centralize-some-functions)

---

## 政策地缘

### 中国出口增速反弹，地缘冲突未显著抑制贸易流

**事件：** 中国出口数据呈现回升态势，表明当前地缘政治冲突尚未对全球贸易链路造成实质性阻断，出口韧性超出此前悲观预期。

评分 62 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-05-09/chinese-export-growth-rebounds-as-war-fails-to-curb-trade)

---

## 接下来要盯的变量

紧盯变量：其一，DeepSeek V4.1 是否延续'快迭低价'节奏，验证模型层输出密度与商业回报的正向循环；其二，美联储区域职能合并讨论是否实质推进，信号是风险偏好重定价还是流动性分层；其三，MoE 模块化开源生态能否催化开发者工具链的二次爆发，而非仅停留于论文复现。

---

## 更多 24h 资讯

> 以下条目进入了候选池，但没有进入今天的主深度解读区。

#### AI
- [15:43] [字节跳动计划将人工智能基础设施支出增加25%：《南华早报》](https://www.bloomberg.com/news/articles/2026-05-09/bytedance-targets-25-rise-in-ai-infrastructure-spending-scmp) | *彭博社最新报道*
- [11:29] [中国首席经济规划师呼吁加强人工智能领域的协调](https://www.bloomberg.com/news/articles/2026-05-09/china-s-top-economic-planner-urges-stronger-coordination-on-ai) | *彭博社最新报道*

#### 科技
- [22:21] [匈牙利新任总理马加尔在对峙中要求总统下台](https://www.bloomberg.com/news/articles/2026-05-09/hungary-s-new-pm-magyar-demands-president-quit-in-showdown) | *彭博社最新报道*
- [22:05] [当竞争对手纷纷缩减电动汽车业务时，为何Polestar却加倍致力于实现净零排放](https://www.bloomberg.com/news/articles/2026-05-09/polestar-is-still-chasing-the-net-zero-car-here-s-why) | *彭博社最新报道*
- [21:49] [日本考虑最早于5月底向俄罗斯派遣官员](https://www.bloomberg.com/news/articles/2026-05-09/japan-considers-sending-officials-to-russia-as-soon-as-end-may) | *彭博社最新报道*
- [21:17] [中国承诺加大力度化解地方政府债务](https://www.bloomberg.com/news/articles/2026-05-09/china-vows-to-advance-efforts-to-defuse-local-government-debt) | *彭博社最新报道*

#### 商业
- [21:17] [出乎意料的盈利大丰收助推股市创下历史新高](https://www.bloomberg.com/news/articles/2026-05-09/earnings-bonanza-that-no-one-saw-coming-fuels-stocks-record-run) | *彭博社最新报道*
- [20:45] [《金融时报》：德国无人机初创企业融资估值或达180亿美元](https://www.bloomberg.com/news/articles/2026-05-09/german-drone-startup-may-see-18b-valuation-in-fundraising-ft) | *彭博社最新报道*
- [16:15] [中国敦促法国通过对话协助保持欧盟市场的开放](https://www.bloomberg.com/news/articles/2026-05-09/china-urges-france-to-help-keep-eu-markets-open-through-dialogue) | *彭博社最新报道*
- [12:49] [为何股市可能很快会“深陷泡沫之中”](https://www.bloomberg.com/news/newsletters/2026-05-09/why-stocks-may-soon-drown-in-a-bubble-bath-merryn-talks-money) | *彭博社最新报道*
- [04:35] [霍尼韦尔旗下计算公司Quantinuum申请在美国上市](https://www.bloomberg.com/news/articles/2026-05-08/honeywell-backed-computing-firm-quantinuum-files-for-us-ipo) | *彭博社最新报道*

#### 投资金融
- [23:57] [特朗普传媒因加密货币持仓亏损4.05亿美元](https://www.bloomberg.com/news/articles/2026-05-09/trump-media-posts-405-million-drop-driven-by-crypto-losses) | *彭博社最新报道*
- [21:49] [欧洲央行埃斯克里瓦表示，人工智能风险促使对金融基础设施进行审查](https://www.bloomberg.com/news/articles/2026-05-09/ecb-s-escriva-says-ai-risks-prompt-finance-infrastructure-review) | *彭博社最新报道*
- [20:13] [加密货币行业在熊市中举办大跳艳舞派对](https://www.bloomberg.com/news/articles/2026-05-09/crypto-industry-throws-lap-dance-party-in-middle-of-bear-market) | *彭博社最新报道*
- [17:02] [拉加德表示，欧洲央行在“行动过早”与“行动过晚”的风险之间左右为难](https://www.bloomberg.com/news/articles/2026-05-09/lagarde-says-ecb-torn-between-risk-of-acting-too-early-too-late) | *彭博社最新报道*
- [14:39] [高盛预计美联储降息将推迟至12月，通胀形势将影响3月政策](https://www.bloomberg.com/news/articles/2026-05-09/goldman-sees-fed-cuts-delayed-to-december-march-on-inflation) | *彭博社最新报道*
- [12:01] [中国黄金产量下降，而投资者对金条和金币的需求激增](https://www.bloomberg.com/news/articles/2026-05-09/china-gold-output-falls-as-investor-demand-for-bars-coins-jumps) | *彭博社最新报道*
- [04:35] [巴里在股价低迷后买入MercadoLibre，目标回报率为15%](https://www.bloomberg.com/news/articles/2026-05-08/burry-buys-mercadolibre-after-slump-eyes-15-returns) | *彭博社最新报道*

#### 政策地缘
- [21:01] [伊朗战争正以前所未有的速度消耗着全球的石油储备](https://www.bloomberg.com/news/articles/2026-05-09/iran-war-is-draining-world-s-oil-buffer-at-unprecedented-pace) | *彭博社最新报道*
- [14:07] [美国因伊朗战争对中国的卫星图像公司实施制裁](https://www.bloomberg.com/news/articles/2026-05-09/us-sanctions-chinese-satellite-imagery-companies-over-iran-war) | *彭博社最新报道*
- [12:49] [战争阻碍霍尔木兹海峡运输，中国能源进口量骤降](https://www.bloomberg.com/news/articles/2026-05-09/china-s-energy-imports-plunge-as-war-chokes-hormuz-shipments) | *彭博社最新报道*
- [10:34] [特朗普计划解雇FDA局长马卡里](https://cn.wsj.com/articles/trump-planning-to-fire-fda-commissioner-marty-makary-4664b200) | *华尔街日报*

