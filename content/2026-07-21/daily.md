---
title: "个人日报 | 2026年7月21日"
date: "2026-07-21"
itemCount: 30
---

# 个人日报 | 2026年7月21日

## 今日判断

> 今日判断：AI竞争正从模型参数扩展到代理产品、安全评测、合规审查与国产算力落地，技术能力开始同时受政策和基础设施约束。与此同时，美股上涨与空头扩张并存，加密资产又受规则预期提振，说明风险偏好并未消失，但资金正在分化，开发者工具的效率红利也将更依赖安全与可控性。

---

## AI

### OpenAI与Hugging Face联查模型评估安全事件

**事件：** OpenAI与Hugging Face公布一次AI模型评估期间安全事件的初步调查结果，并称事件涉及高级网络能力。

评分 100 · 来源 [OpenAI News](https://openai.com/index/hugging-face-model-evaluation-security-incident)

---

### ChatGPT智能代理用户突破一千万

**事件：** OpenAI近期推出ChatGPT Work后，旗下智能代理需求迅速增长，相关用户数突破1000万，并继续追赶Anthropic。

**解读：** 千万级采用把竞争变量从模型榜单转向任务完成率、工具连接和用户留存；谁能占据工作流入口，谁就更容易形成调用量、数据反馈与订阅收入闭环。

评分 99 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/openai-s-agents-reach-10-million-users-after-chatgpt-work-debut)

---

### 奥尔特曼将向美国政府预告下一代模型

**事件：** OpenAI首席执行官奥尔特曼计划下周向特朗普政府及国会议员介绍下一代AI模型，配合美国建立前沿系统安全审查程序。

**解读：** 模型发布不再只是企业产品节奏，政府预审可能成为新增关卡；需要观察评测标准、保密安排和整改要求是否拉长上线周期，并改变闭源模型的先发优势。

评分 97 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/openai-s-altman-to-brief-us-officials-on-next-wave-of-ai-models)

---

### Z.AI新建大型数据中心全面采用国产芯片

**事件：** Z.AI已建成一座大型数据中心，计划全部部署中国制造的AI芯片，以减少未来开发对受限英伟达芯片的依赖。

**解读：** 国产替代的判断变量将从出货量转向集群稳定性、软件适配和单位推理成本；若全国产数据中心运行顺利，将提高本土芯片进入大型训练与推理项目的可信度。

评分 97 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-20/z-ai-completes-giant-data-center-with-chinese-chips-to-train-ai)

---

### 谷歌研发Gemini专用芯片Frozen v2

**事件：** 谷歌据报研发Frozen v2服务器芯片，将Gemini部分架构固化进硅片，目标每瓦Token效率较最新TPU提高6至10倍，最快2028年部署。

**解读：** 成本结构可能从通用算力转向模型专用硬件，但代价是架构迭代自由度下降；项目成败取决于Gemini架构稳定期能否长于芯片研发和折旧周期。

评分 90 · 来源 [36氪 - 24小时热榜](https://www.36kr.com/p/3904844399445638)

---

### 英伟达Rubin新架构开始导入客户

**事件：** 英伟达表示，最新Rubin芯片设计正逐步交付客户，计划借此巩固其在AI半导体市场的领先地位。

**解读：** 竞争变量已从路线图发布时间转向客户验证、系统交付和软件迁移；Rubin若按期导入，将影响云厂商资本开支节奏，并继续抬高竞争者追赶整机生态的门槛。

评分 89 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/nvidia-touts-progress-getting-new-rubin-design-to-customers)

---

### 千问Qwen3.8-Max预览版迭代上线

**事件：** 阿里于7月19日上线2.4T参数的Qwen3.8-Max-Preview新版，提升前端表现，并通过Token Plan、Qoder等平台征集反馈。

**解读：** 产品节奏从阶段性大版本转为按天迭代，缩短了能力验证与用户反馈周期；正式版能否开源，以及推理价格、稳定性和工具调用表现，将决定开发者迁移意愿。

评分 87 · 来源 [Readhub - 每日早报 - 格隆汇](https://readhub.cn/topic/8uwjh8wSVnN)

---

### 美国扩大前沿AI模型发布审查范围

![美国扩大前沿AI模型发布审查范围](https://substackcdn.com/image/youtube/w_728,c_limit/GNlo-tBVWUA)

**事件：** 行业周报称，美国政府扩大前沿模型把关：Anthropic的Mythos-5仅向特定实体发布，GPT-5.6 Sol受限开放，Meta也面临自愿审查压力。

**解读：** 前沿模型的发布权正在由企业单方决策转为政企共同把关；准入对象、能力阈值和审查时长将直接决定产品覆盖面，也可能拉大受限模型与公开模型的能力差。

评分 86 · 来源 [Last Week in AI - Last Week in AI](https://lastweekin.ai/p/last-week-in-ai-250-mythos-mess-gpt)

---

## 软件工程

### llmfit一键匹配本地硬件与可运行模型

**事件：** Rust工具llmfit用一条命令判断用户硬件可运行哪些模型，覆盖数百个模型与供应商，已获29987星和1830次复刻。

**解读：** 它压缩了显存估算、量化选择和供应商比对的前期成本，使本地部署决策更快；工程效率变量由“会不会配置”转向模型实际吞吐、质量与硬件利用率。

评分 92 · 来源 [Trending repositories on GitHub today · GitHub - AlexsJones](https://github.com/AlexsJones/llmfit)

---

### text-to-cad聚合硬件设计智能体技能

![text-to-cad聚合硬件设计智能体技能](https://github.com/earthtojake/text-to-cad/raw/main/benchmarks/benchmark_01_rectangular_calibration_block.gif)

**事件：** JavaScript项目text-to-cad汇集CAD、机器人和硬件设计相关智能体技能，目前获得8763星和1002次复刻。

**解读：** 开发者工具的入口正从通用代码生成延伸至工程设计动作；若技能能稳定调用CAD工具链，硬件原型的建模与修改周期会缩短，但准确性和可制造性验证仍是门槛。

评分 87 · 来源 [Trending repositories on GitHub today · GitHub - earthtojake](https://github.com/earthtojake/text-to-cad)

---

### 7-Zip堆溢出漏洞可触发远程代码执行

**事件：** Zero Day Initiative上周报告7-Zip的MixCoder_Code函数存在堆缓冲区溢出，涉及XZ流处理，评分为7.0，可被用于远程执行任意代码。

评分 86 · 来源 [开源中国-全部 - 局](https://www.oschina.net/news/476199)

---

## 商业

### AI芯片需求推高韩国七月初出口

**事件：** AI带动的半导体需求推动韩国7月上旬出口保持强劲增长，并创下历年同期最高水平。

**解读：** AI资本开支已反映到韩国出口这一实体指标，验证存储与芯片需求仍有韧性；后续关键变量是订单能否扩散至设备、材料，以及高基数下的增长持续时间。

评分 93 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/south-korea-s-early-exports-jump-to-july-record-on-ai-led-gains)

---

### 英特尔追加裁员重整数据中心业务

**事件：** 英特尔确认将进一步裁员，以削减成本并重组关键的数据中心部门；消息公布后，公司股价在周二反弹。

**解读：** 股价反应显示短期估值锚点转向现金消耗和成本纪律；但长期判断仍取决于裁员是否改善产品交付与数据中心竞争力，而非仅压低当期费用。

评分 89 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/intel-rallies-after-saying-it-ll-make-more-headcount-reductions)

---

### 压裂业务指引不及预期拖累哈里伯顿

**事件：** 哈里伯顿第三季度完井与生产业务销售指引低于分析师预期，利润率亦未达预期，股价随之大幅下跌。

**解读：** 市场判断变量转向北美压裂活动强度和服务定价；若客户削减完井预算，公司难以仅靠成本控制守住利润率，油服周期的盈利预期可能继续下修。

评分 85 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/halliburton-sees-improvement-in-north-american-activity-in-2026)

---

## 投资金融

### 美股空头头寸创纪录押注AI行情降温

**事件：** 在标普500指数自3月下旬上涨18%之际，美股看空头寸升至历史新高，投资者质疑AI驱动行情的持续性。

**解读：** 风险偏好的关键变量不是指数点位，而是多头集中度与对冲需求；创纪录空仓意味着市场对AI盈利兑现和高估值容忍度下降，波动放大风险随之上升。

评分 100 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-20/short-bets-against-us-equities-hit-record-as-ai-risks-mount)

---

### 数字资产透明法案临近闯关提振比特币

**事件：** 贝森特称数字资产《透明法案》已到“最后一码”，华盛顿接近建立更清晰规则，比特币随消息上涨。

**解读：** 市场定价变量从流动性预期转向监管确定性；若法案落地，代币分类、平台合规和机构入场门槛将更清楚，可能缩短传统资金配置数字资产的决策周期。

评分 97 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/bitcoin-rallies-after-bessent-says-clarity-act-at-1-yard-line)

---

### AI替代焦虑加剧，Adobe与Salesforce卖出评级升至多年高位

**事件：** 因担忧AI削弱传统软件产品的需求与商业模式，建议卖出Adobe和Salesforce股票的华尔街分析师数量升至多年来高位。

**解读：** 软件公司的估值锚点正从订阅增速转向AI能否守住席位数、客单价和续费率；若AI新增收入无法抵消功能商品化带来的收入流失，传统SaaS的估值倍数将继续承压。

评分 94 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/adobe-salesforce-downgrades-are-latest-show-of-ai-fears)

---

### 中国多方资金联手稳定科技股市场

**事件：** 科技股下跌后，中国监管机构、国有投资者、保险公司和资管机构共同入场，科技类ETF录得创纪录净流入。

**解读：** 资金流向由市场自发交易转为政策资金托底，短期改变科技股的流动性与风险溢价；后续要看企业盈利能否接力，否则行情仍可能依赖持续增量资金。

评分 93 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/china-broadens-market-rescue-with-record-inflows-into-tech-etf)

---

### 中国谋求托举AI股票并抑制投机泡沫

**事件：** 中国正寻求支持人工智能相关股票、稳定科技板块信心，同时避免资金追逐导致估值泡沫进一步膨胀。

**解读：** 政策边界不只是“支持AI”，而是区分产业融资与短期炒作；板块估值将更依赖订单、收入和国产化进展，纯概念公司的融资便利度可能受到约束。

评分 90 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/newsletters/2026-07-21/china-seeks-to-rescue-ai-stocks-without-fueling-a-bubble)

---

### 低价中国模型或扩大芯片需求总量

**事件：** Moonshot AI等中国低价模型引发新讨论：企业是否会因应用门槛下降而继续增加计算与存储投入，并利好英伟达、美光等芯片商。

评分 90 · 来源 [华尔街日报](https://cn.wsj.com/articles/why-cheap-chinese-ai-models-could-actually-be-a-boon-for-nvidia-micron-and-other-chip-stocks-c07ad7a3)

---

### 俄罗斯国债流拍后暂停债券发行

**事件：** 俄罗斯国内国债连续发行失败后暂停拍卖，市场同时猜测央行可能中止已持续一年的货币宽松周期。

**解读：** 关键变量是利率路径与财政融资成本；若央行暂停宽松，债券需求和政府发债能力将继续承压，并可能迫使财政部门提高收益率或缩减融资规模。

评分 89 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/russia-halts-bond-auctions-with-more-monetary-easing-in-question)

---

### 芯片股反弹推动纳指百强创三周最佳

**事件：** AI核心芯片制造商反弹，推动纳斯达克100指数周二创三周最佳单日表现，并盖过美伊战争再度升级的压力。

**解读：** 风险偏好仍高度集中于半导体板块，地缘风险尚未改变AI交易主导权；若能源价格和战争风险继续上升，科技股盈利预期与估值折现率将受到双重检验。

评分 89 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/us-stock-futures-rise-as-chipmaker-rebound-overshadows-iran-war)

---

### 新加坡领跑东南亚创纪录外资流入

**事件：** 东南亚外国投资规模创下纪录，新加坡居于领先位置；大华银行认为区域正受益于供应链转移和资本重新配置。

**解读：** 外资配置变量从单纯追逐低成本转向制度稳定、区域总部与供应链韧性；新加坡的枢纽优势可能继续吸引资金，但制造投资能否扩散至周边国家更关键。

评分 88 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/singapore-leads-record-foreign-investments-in-southeast-asia)

---

### 月之暗面拟以五百亿美元估值融资

**事件：** 月之暗面计划8月启动香港上市前最后一轮融资谈判，借最新模型热度募资，目标估值最高达到500亿美元。

**解读：** 估值锚点将从模型发布热度转向收入、调用量和上市可兑现性；高估值融资能补充训练资本，但也提高后续增长要求，并压缩正式上市时的定价余地。

评分 85 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/china-s-moonshot-in-talks-on-pre-ipo-funds-at-50-billion-value)

---

### 伊朗战争推高南亚液化天然气采购价

**事件：** 中东冲突阻塞供应，巴基斯坦和孟加拉国被迫采购多年来价格最高的一批液化天然气，进一步挤压政府财政。

**解读：** 战争影响已从油价扩展至亚洲天然气采购与财政补贴；若高价持续，两国可能减少现货采购、调整发电结构，并重新评估对进口液化天然气的依赖。

评分 85 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/iran-war-forces-cash-strapped-asian-nations-to-buy-expensive-lng)

---

### 欧洲基金经理推动私募二级交易激增

**事件：** 今年上半年，由普通合伙人主导的私募二级市场交易达到620亿美元，欧洲基金管理人正更多采用美国市场的交易模式。

**解读：** 流动性压力正改变私募退出路径，续存基金和GP主导交易成为替代方案；关键变量是折价幅度、估值透明度与利益冲突审查，这些将决定交易能否持续扩张。

评分 84 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/newsletters/2026-07-21/europe-s-private-fund-managers-drive-spike-in-secondary-transactions)

---

## 政策地缘

### 美国拟审查中国开源AI模型知识产权来源

**事件：** 美国财政部长贝森特7月21日表示，将仔细审查中国开源AI模型是否存在知识产权盗用迹象。

**解读：** 竞争变量正从模型性能和价格延伸至训练数据与知识产权来源；若形成正式审查机制，中国模型进入美国市场的审核周期、举证成本和分发渠道都可能改变。

评分 100 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/bessent-says-us-will-scrutinize-chinese-ai-models-for-ip-theft)

---

### 美国AI高管警示中国模型追赶压力

**事件：** 美国头部AI公司高管就中国模型进展发出警告，白宫内部对回应方式仍有分歧，并讨论过潜在限制措施。

评分 98 · 来源 [华尔街日报](https://cn.wsj.com/articles/top-american-ai-execs-sound-alarm-on-chinese-models-e8d3500e)

---

### 特朗普拟对部分加拿大商品加征五成关税

**事件：** 特朗普政府誓言援引大萧条时期法律，对被指不公平对待美国酒类、汽车和乳制品的部分加拿大商品征收50%关税。

**解读：** 北美供应链面临新的关税成本与规则不确定性，汽车和农产品首当其冲；企业需要重新评估跨境定价、库存布局及《美墨加协定》续谈中的原产地安排。

评分 90 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-20/us-sets-50-tariff-on-some-canadian-goods-over-retaliation-claim)

---

### 美伊冲突升级激化海湾盟友不满

**事件：** 随着美国与伊朗敌对行动加剧，美国在波斯湾的阿拉伯盟友日益不满，担忧本国安全和经济受到牵连。

**解读：** 美国地区协调能力成为影响冲突外溢的新变量；若盟友减少基地、空域或外交配合，华盛顿的行动空间将收窄，能源运输与区域资产风险溢价则可能上升。

评分 89 · 来源 [彭博社最新报道](https://www.bloomberg.com/news/articles/2026-07-21/us-allies-in-persian-gulf-exasperated-as-iran-war-escalates)

---

## 接下来要盯的变量

接下来要盯五个变量：智能代理能否形成稳定留存与付费，模型审查是否外溢至开源生态，国产芯片能否经受生产负载，监管利好能否转化为持续资金流，以及美股空头扩张是否先于AI估值回调；同时观察开发工具提效是否伴随新的安全成本。

---

## 更多 24h 资讯

> 以下条目进入了候选池，但没有进入今天的主深度解读区。

#### AI
- [23:00] [Why Physical AI Is the Next Frontier | Applied Intuition](https://a16z.simplecast.com/episodes/why-physical-ai-is-the-next-frontier-applied-intuition-VEkcnJm1) | *The a16z Show - content+a16zpodcast@a16z.com (Erik Torenberg, Marc Andreessen, Qasar Younis, Peter Ludwig)*
- [19:31] [Last Week in AI #251 - Mythos Back, Sonnet 5, Etched, LongCat ](https://lastweekin.ai/p/last-week-in-ai-251-mythos-back-sonnet) | *Last Week in AI - Last Week in AI*
- [19:10] [中国在人工智能技术竞赛中的“双重登月”时刻](https://www.bloomberg.com/news/newsletters/2026-07-21/china-s-double-moonshot-moment-in-the-ai-tech-race) | *彭博社最新报道*
- [18:30] [LWiAI Podcast #249 - Fable 5 ban, SpaceX Cursor + IPO, OSS Aplenty ](https://lastweekin.ai/p/lwiai-podcast-249-fable-5-ban-spacex) | *Last Week in AI - Last Week in AI*
- [18:22] [伯纳姆在科技领域人事调整中任命首位人工智能部长进入内阁](https://www.bloomberg.com/news/articles/2026-07-20/burnham-names-narayan-as-uk-s-first-ai-minister-to-new-cabinet) | *彭博社最新报道*
- [17:38] [LWiAI Podcast #247 - Opus 4.8, MAI, Anthropic IPO, Minimax-M3](https://lastweekin.ai/p/lwiai-podcast-247-opus-48-mai-anthropic) | *Last Week in AI - Last Week in AI*
- [15:58] [沿用DeepSeek架构，美国大模型开始抄中国作业](https://www.36kr.com/p/3904914616747399) | *36氪 - 24小时热榜*
- [08:32] [Kimi K3爆火，GPU先扛不住了](https://www.36kr.com/p/3904634803701385) | *36氪 - 24小时热榜*
- [07:48] [WAIC 2026终极盘点：15大核心趋势，看透AI下半场](https://www.36kr.com/p/3904188372485763) | *36氪 - 24小时热榜*
- [07:42] [AI 大模型公司零一万物计划 2027 年在香港上市](https://readhub.cn/topic/8uuYdG7tYbW) | *Readhub - 每日早报*
- [01:08] [Hugging Face's CEO on Open Source AI, Model Routing, and the Future of Competition](https://a16z.simplecast.com/episodes/hugging-faces-ceo-on-open-source-ai-model-routing-and-the-future-of-competition-qEt3voqD) | *The a16z Show - content+a16zpodcast@a16z.com (Theo Jaffee, Sofia Puccini, Clément Delangue)*

#### 科技
- [23:55] [极端高温给欧洲经济前景带来压力](https://www.bloomberg.com/news/newsletters/2026-07-21/extreme-heat-weighs-on-europe-s-economic-prospects) | *彭博社最新报道*
- [23:55] [随着学生抗议活动升级，莫迪的对手被警方带离现场](https://www.bloomberg.com/news/articles/2026-07-21/modi-s-rivals-removed-by-police-as-student-protests-escalate) | *彭博社最新报道*
- [23:23] [苹果将与Klarna合作推出“升级”设备租赁计划以提振销量](https://www.bloomberg.com/news/articles/2026-07-21/apple-to-launch-upgrade-device-leasing-program-with-klarna-to-spur-sales) | *彭博社最新报道*
- [23:08] [中国那支神秘的海上民兵组织正以令人担忧的活跃程度开展活动](https://www.economist.com/interactive/china/2026/07/21/chinas-shadowy-maritime-militia-is-worryingly-active) | *经济学人最新报道*
- [23:08] [印度炼油商伸出援手，助力俄罗斯石油出口商](https://www.bloomberg.com/news/articles/2026-07-21/india-s-refiners-come-to-the-rescue-of-russia-s-oil-exporters) | *彭博社最新报道*

#### 软件工程
- [23:08] [SpaceX的“大解锁”始于1160亿美元股票的解禁](https://www.bloomberg.com/news/articles/2026-07-21/spacex-s-great-unlocking-begins-with-116-billion-share-release) | *彭博社最新报道*
- [19:00] [“画中画中画”——Qwen Image 3.0 把四层 UI 塞进了一张图](https://www.oschina.net/news/476175/qwen-image-3-0) | *开源中国-全部 - 局*

#### 商业
- [21:32] [《Next Africa》：在日渐式微的钻石市场中，现实占据上风](https://www.bloomberg.com/news/newsletters/2026-07-21/next-africa-reality-prevails-in-a-fading-diamond-market) | *彭博社最新报道*
- [21:01] [InMobi任命摩根大通和杰富瑞作为其近10亿美元IPO的承销商](https://www.bloomberg.com/news/articles/2026-07-21/inmobi-appoints-jpmorgan-jefferies-for-nearly-1-billion-ipo) | *彭博社最新报道*
- [20:45] [2026年，生物技术公司IPO表现优于人工智能公司IPO，领跑美国市场](https://www.bloomberg.com/news/articles/2026-07-21/biotech-ipos-outperform-ai-listings-leading-us-market-in-2026) | *彭博社最新报道*
- [20:45] [三星推出人工智能健康助手，进军竞争激烈的市场](https://www.bloomberg.com/news/articles/2026-07-21/samsung-debuts-ai-powered-health-assistant-joining-packed-market) | *彭博社最新报道*
- [18:54] [高收益新兴市场货币走强，股市反弹](https://www.bloomberg.com/news/articles/2026-07-21/emerging-market-assets-rally-on-china-tech-support-iran-talks) | *彭博社最新报道*
- [18:22] [潜伏在预测市场中的新型内幕交易者](https://www.bloomberg.com/news/newsletters/2026-07-21/the-new-insider-traders-lurking-on-prediction-markets) | *彭博社最新报道*
- [15:43] [黄仁勋的“达链”闭环了](https://www.36kr.com/p/3904937240364936) | *36氪 - 24小时热榜*
- [14:41] [在英格兰银行决议公布前，英国劳动力市场保持稳定](https://www.bloomberg.com/news/articles/2026-07-21/uk-labor-market-holds-steady-ahead-of-bank-of-england-decision) | *彭博社最新报道*
- [10:11] [芯片制造商反弹势头增强，股市上涨：市场综述](https://www.bloomberg.com/news/articles/2026-07-20/stock-market-today-dow-s-p-live-updates) | *彭博社最新报道*

#### 投资金融
- [23:52] [长鑫科技 IPO 发行结果公布：网上投资者放弃认购 658 万股](https://readhub.cn/topic/8uwjiF0Uwaj) | *Readhub - 每日早报 - 界面*
- [22:36] [卡尔希申请批准上市与黄金挂钩的永续期货合约](https://www.bloomberg.com/news/articles/2026-07-21/kalshi-seeks-approval-for-perpetual-futures-tied-to-gold-silver) | *彭博社最新报道*
- [21:48] [尼日利亚维持利率不变，战争加剧通胀担忧](https://www.bloomberg.com/news/articles/2026-07-21/nigeria-holds-interest-rates-as-iran-war-stokes-inflation-fears) | *彭博社最新报道*
- [21:01] [做空者加大对HelloFresh首发债券的做空押注](https://www.bloomberg.com/news/articles/2026-07-21/short-sellers-ramp-up-bets-against-hellofresh-s-debut-bond) | *彭博社最新报道*
- [21:01] [哥伦比亚、秘鲁领导人通过政策信号吸引投资者](https://www.bloomberg.com/news/articles/2026-07-21/colombia-peru-send-early-policy-signs-to-extend-election-rally) | *彭博社最新报道*
- [20:13] [匈牙利考虑进一步降息，并将于9月重新评估政策周期](https://www.bloomberg.com/news/articles/2026-07-21/hungary-cuts-rates-for-second-month-as-inflation-stays-muted) | *彭博社最新报道*
- [18:06] [Danantara聘请多家银行，计划发行第二笔美元债券](https://www.bloomberg.com/news/articles/2026-07-21/danantara-hires-banks-for-planned-second-dollar-bond-sale) | *彭博社最新报道*
- [17:18] [改革后，德国投资者信心指数升至五个月高点](https://www.bloomberg.com/news/articles/2026-07-21/germany-s-investor-outlook-reaches-five-month-high-after-reforms) | *彭博社最新报道*
- [16:00] [印尼发行首笔熊猫债券，以拓宽融资渠道](https://www.bloomberg.com/news/articles/2026-07-21/indonesia-markets-first-panda-bonds-as-it-diversifies-funding) | *彭博社最新报道*
- [15:44] [《Expansion》称，西班牙将支持国际清算银行的德·科斯出任欧洲央行行长](https://www.bloomberg.com/news/articles/2026-07-21/spain-is-set-to-back-bis-s-de-cos-for-ecb-helm-expansion-says) | *彭博社最新报道*

#### 政策地缘
- [22:52] [伊朗的战争与水资源：为何海水淡化厂是海湾国家的软肋](https://www.bloomberg.com/news/articles/2026-07-21/iran-war-and-water-why-desalination-plants-are-vulnerability-for-gulf-states) | *彭博社最新报道*
- [21:32] [加拿大帝国商业银行表示，特朗普的新关税标志着《美墨加协定》谈判进入艰难阶段](https://www.bloomberg.com/news/articles/2026-07-21/cibc-says-trump-s-new-tariff-marks-start-of-tough-usmca-talks) | *彭博社最新报道*
- [19:10] [特朗普对加拿大的关税威胁](https://www.bloomberg.com/news/newsletters/2026-07-21/trump-and-canada-tariff-threat) | *彭博社最新报道*
- [15:28] [台湾将放缓移动互联网服务中断，以模拟战争和自然灾害](https://www.bloomberg.com/news/articles/2026-07-21/taiwan-to-slow-mobile-internet-disruptions-to-simulate-war-natural-disasters) | *彭博社最新报道*
- [12:18] [随着冲突不断升级，赫格塞特就伊朗战争费用问题接受议员质询](https://www.bloomberg.com/news/articles/2026-07-21/hegseth-faces-lawmakers-over-iran-war-costs-as-conflict-widens) | *彭博社最新报道*
- [12:18] [2026年以色列大选：内塔尼亚胡能否继续执政？谁可能接替他？](https://www.bloomberg.com/news/articles/2026-07-21/israel-election-2026-can-netanyahu-stay-in-power-who-could-succeed-him) | *彭博社最新报道*

#### 社交媒体
- [07:34] [为自己的 agent 支持通过 iLink API 链接微信](https://www.v2ex.com/t/1228691#reply0) | *V2EX - 技术*

