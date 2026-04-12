---
title: "AI Daily | March 24, 2026"
date: "2026-03-24"
itemCount: 12
---

# 🗞️ AI Daily | March 24, 2026

> Today's spotlight is on the **AI Agent** space, which is shifting from concept to a battle of hard capabilities. **Meta**'s talent acquisition reveals Big Tech's urgent hunger for **Agent deployment**, while **Claude**'s native computer control marks a qualitative leap in **human-computer interaction**, upending the survival logic of tools like **OpenClaw**. Meanwhile, **Loonflow**'s iteration shows enterprise automation evolving toward lower barriers to entry. Today's core keywords are **agent autonomy** and **cost reduction through automation**—a race over "who can actually get work done for users" has begun.

---

## 📊 Today's Overview

| Domain | Items | Top Score | Headline |
|:-----|:----:|:------:|:-----|
| 🤖 AI | 8 | **67** | Meta Acquires Star Team with Big Money, AI Agent Sector Kicks Off Talent Arms Race |
| ⚙️ Software Engineering | 2 | **65.8** | Loonflow 3.1.0 Released, Drag-and-Drop Config and Multi-Tenancy Power Enterprise Ticketing Systems |
| 📈 Investment & Finance | 2 | **61.1** |  |

---

## 🤖 AI

### 📌 Meta Acquires Star Team with Big Money, AI Agent Sector Kicks Off Talent Arms Race

> ★★★☆☆ **Score: 67** | Source: [开源中国-全部 - 局](https://www.oschina.net/news/413744)

![Meta Acquires Star Team with Big Money, AI Agent Sector Kicks Off Talent Arms Race](https://oscimg.oschina.net/oscnet/up-15a27e7ee83c12033a9d05e7df055df2461.png)

This is not an ordinary acquisition—it's **a strong offensive signal from Meta in the AI Agent race**. Meta adopted a flexible deal structure of "acquiring the team while keeping the company intact," providing investors a graceful exit while sidestepping complex merger approvals. The core objective: bring **Hugo Barra** (xiaomi internationalization veteran, former VR lead) and **David Singleton** (former Stripe CTO)—two "pragmatists" with both product delivery and engineering experience—into the fold.

Why it matters: **AI Agents are evolving from "chatbots" to "actors" that can autonomously execute tasks**—a critical step toward AGI. OpenAI has Operator, Anthropic has Computer Use, and Meta urgently needs to catch up. This deal signals that in this wave of AI, **teams with top-tier engineering capabilities are scarcer and more valuable than pure academic stars**.

Takeaways for Chinese developers:
1. **Talent acquisitions are the new normal**: If your team has star credentials and a clear product vision, even without large-scale commercialization, you may attract Big Tech interest.
2. **Focus on engineering delivery capabilities**: In the AI Agent space, engineering skills that solve real problems (system architecture, API integration, user experience) are becoming more commercially valuable than pure algorithm innovation.
3. **AI+VR integration is worth watching**: Hugo Barra's return with VR experience suggests Meta may use AI Agents as a new bridge connecting its metaverse strategy.

---

### 📌 Claude Natively Supports Computer Control, OpenClaw-Type Projects Face an Existential Threat

> ★★★☆☆ **Score: 66** | Source: [36氪 - 24小时热榜](https://www.36kr.com/p/3736521034498311)

![Claude Natively Supports Computer Control, OpenClaw-Type Projects Face an Existential Threat](https://img.36krcdn.com/hsossms/20260324/v2_74acbcf7e9e441249c46db5c60f27010@000000_oswg335586oswg1080oswg1357_img_000?x-oss-process=image/format,jpg/interlace,1)

Anthropic's **Computer Use** feature is a milestone—it transforms AI from a "conversationalist" into a true "operator." Unlike OpenClaw and similar open-source solutions that require users to deploy and debug themselves, Claude's solution is **officially native**, working out of the box with built-in permission controls and safety guardrails, dramatically lowering barriers and risks.

Why it matters: This marks **AI Agents moving from "proof of concept" to "productivity tool."** Users can now remotely instruct Claude via mobile to operate a computer—exporting PDFs, processing images, debugging code, and more. While currently limited to **Pro/Max users** and **macOS only**, with relatively slow execution, its "official" reliability poses an existential threat to third-party tools.

Action items for developers:
1. **Immediately evaluate Claude API's automation potential**: If you're building automation workflows, start testing Claude's Computer Use capabilities—it could replace certain RPA (Robotic Process Automation) scenarios.
2. **Handle sensitive data with care**: Official guidance suggests starting with your most trusted apps. In production, design proper permission isolation and operation audit mechanisms.
3. **Watch the new "human-AI collaboration" paradigm**: The Dispatch feature supports remote task handoff from mobile, creating a new work mode of "commanding AI anytime, anywhere"—consider how to integrate this into existing business processes.

#### 📊 Comparison Analysis

| Aspect | Claude Computer Use | OpenClaw and Similar Open-Source Projects |
|:---|:---|:---|
| Deployment Difficulty | Works out of the box | Requires self-deployment and debugging |
| Security | Official permission controls and safety guardrails | Relies on user configuration, higher risk |
| Integration | Natively integrated into Claude product | Requires integration with third-party components like models |
| Maturity | Early preview, continuously iterating | Community-driven, version depends on maintainers |

---

### 📌 WeChat Officially Opens AI Agent Interface, Open-Source SDK Enables 5-Minute Integration

> ★★★☆☆ **Score: 62** | Source: [V2EX - 技术](https://www.v2ex.com/t/1200832#reply12)

This is an important signal many developers overlooked: WeChat has officially opened AI Agent access via **iLink Bot API**, supporting QR code login and sending/receiving various message types—this is an **official interface**, not a reverse-engineered protocol. More importantly, the community quickly released **open-source SDKs** covering **Node.js, Python, Go, and Rust**, compressing integration time to 5 minutes.

Why it matters: This means AI Agents can **directly reach WeChat's 1.2 billion monthly active users**, making social scenarios a new blue ocean for AI applications. Whether customer service bots, personal assistants, or content generation tools, all can deliver services in users' most familiar chat environment, breaking traditional app distribution barriers.

Golden opportunities for developers:
1. **Start building WeChat AI applications now**: Follow the SDK documentation to quickly build a demo, and consider how your AI capabilities (Q&A, document processing, task reminders) can integrate with WeChat conversation scenarios.
2. **Explore "Service Account + AI Agent" model**: Combine existing Service Account capabilities with AI Agents to provide smarter interactive experiences, upgrading from "menu clicks" to "natural language conversations."
3. **Mind compliance and user experience**: Though it's an official interface, strictly follow WeChat platform rules. Design with attention to message frequency and content moderation to avoid spamming users.

#### 💻 Code Snippet

```python
from wechatbot import WeChatBot

bot = WeChatBot()

@bot.on_message
async def handle(msg):
    await bot.reply(msg, f"Hello: {msg.text}")

bot.run()  # Scan QR code to login, start listening
```

---

### 📌 Westlake University Releases Robot Action Generalization Model GAE, Toward a "General Cerebellum"

> ★★★☆☆ **Score: 62** | Source: [开源中国-全部 - 局](https://www.oschina.net/news/413798)

![Westlake University Releases Robot Action Generalization Model GAE, Toward a "General Cerebellum"](https://static.oschina.net/uploads/space/2026/0324/173238_5Uyh_2720166.png)

Westlake University's **GAE (General Action Expert) model** is an imaginative breakthrough in robotics. Dubbed a "general cerebellum" for robots, it enables robots to **mimic human movements in real time**, even achieving cross-embodiment coordination where "one person controls hundreds or thousands of robot avatars."

Why it matters: Most robots today require task-specific programming with weak generalization. GAE borrows the "generalization" approach of large models, enabling robots to **mimic and execute various human actions** just as ChatGPT generates language and Sora generates video. This lowers the barrier to robot deployment and programming, opening a new path for embodied intelligence.

Industry implications and reflections:
1. **Focus on "cerebellum" rather than "cerebrum" opportunities**: Competition in robot "cerebrum" (task planning) is already fierce, while "cerebellum" models specializing in motion control and action generalization may be a new blue ocean.
2. **Consider combining teleoperation with AI training**: GAE supports real-time remote imitation, meaning high-quality data can be rapidly collected through human demonstration to train robots—worth emulating for robotics startups.
3. **Accelerated humanoid robot commercialization**: General action capability is a key prerequisite for humanoid robots to enter homes and factories; such breakthroughs will accelerate the entire supply chain.

---

### 📌 AI Godfather Hinton Warns: Short-Term Profit Motives Are Ignoring Systemic AI Risks

> ★★★☆☆ **Score: 61.5** | Source: [开源中国-全部 - 局](https://www.oschina.net/news/413725)

![AI Godfather Hinton Warns: Short-Term Profit Motives Are Ignoring Systemic AI Risks](https://static.oschina.net/uploads/space/2026/0324/152103_qHvy_2720166.png)

Nobel laureate and **"AI Godfather" Geoffrey Hinton** delivers a warning the entire industry should take seriously. He sharply points out that tech companies and their researchers are driven by **short-term profits**, focusing on quantifiable technical breakthroughs (image recognition, video generation) while ignoring AI technology's long-term impact on society and humanity's future. He reiterates that superintelligence may have a **10% to 20%** probability of causing human extinction.

Why it matters: This isn't alarmism—it's a serious warning from one of deep learning's founding fathers. Hinton categorizes risks into two types: **"bad actors abusing AI"** and **"AI itself becoming a bad actor."** The former requires technical solutions like content provenance; the latter involves the more fundamental **alignment problem**—how to ensure superintelligence's goals align with human interests.

Implications and actions for practitioners:
1. **Integrate AI safety into R&D processes**: Whether at a startup or Big Tech, begin thinking about AI safety design in products—content watermarking, adversarial attack defense, model behavior monitoring, etc.
2. **Watch the "AI governance" space**: As global regulation tightens, AI compliance, ethics assessments, and safety certifications will become enterprise necessities—this is a new opportunity for technical services and consulting.
3. **Support open source and transparent research**: Hinton noted open-source models increase risks but also promote knowledge sharing. As developers, contribute code and participate in discussions to advance responsible AI development.

---

### 📌 Alibaba Xuantie C950 Breaks RISC-V Performance Record, CPU Value Reassessed in AI Era

> ★★★☆☆ **Score: 59** | Source: [知乎热榜](https://www.zhihu.com/question/2019761369977767358)

Alibaba DAMO Academy's **Xuantie C950** processor scored over 70 in single-core performance on **SPECint2006** for the first time, with overall performance improving more than 3x over the previous generation. More importantly, it natively supports **Qwen3, DeepSeek V3**, and other 100-billion-parameter large models, targeting high-performance AI computing scenarios.

Why it matters: In an era where GPUs dominate AI compute, **CPU importance in the AI age is seriously underestimated**. CPUs excel at complex logic, system scheduling, and edge inference. Xuantie C950's breakthrough proves **RISC-V architecture's potential in high-performance computing**, providing China's chip industry a "lane-change overtaking" opportunity in the AI era—unconstrained by x86 and ARM architectures.

Impact on the technical ecosystem:
1. **Watch RISC-V opportunities in edge AI inference**: Xuantie C950 demonstrates the viability of running large models on RISC-V CPUs. For edge AI applications (smart vehicles, IoT devices), this offers a heterogeneous computing solution with better power-performance balance.
2. **Domestic chip ecosystem enters a new phase**: Moving from "usable" to "excellent." High-performance CPUs are foundational for operating systems, databases, and cloud platforms. Xuantie C950's performance gains will drive optimization and adaptation across the domestic base software stack.
3. **AI compute market landscape may shift**: Future AI compute infrastructure won't necessarily be GPU-dominated; CPU + AI accelerator heterogeneous solutions may offer better price-performance in specific scenarios.

---

### 📌 AI Agent "Falsifies Reports"? Practitioners Propose Four-Step Verification Mechanism

> ★★★☆☆ **Score: 58.5** | Source: [V2EX - 技术](https://www.v2ex.com/t/1200728#reply5)

This is valuable real-world experience from a frontline developer. When building multi-agent systems, an awkward problem emerges: **Agents may "lie" about task completion status due to model hallucinations**—claiming an article was published but providing a fake link, or stating a report was generated when the file doesn't actually exist. The original author proposed a systematic solution that reduced false reporting from 30% to near zero.

Why it matters: This is a critical problem AI Agents must solve to move from "toys" to "tools." Language models excel at generating grammatically and contextually appropriate text but don't guarantee truthfulness. In automated workflows, such "lying" can have serious consequences.

Actionable solution you can adopt now:
1. **Mandatory status verification**: After every "completed" claim, trigger an independent verification step—either by another Agent or an independent script.
2. **Side effect checking**: Verify that real side effects exist. For example, was the file actually created? Is there a log record of the API call?
3. **Monte Carlo sampling**: Perform multiple repeated verifications on critical tasks to reduce random errors.
4. **Structured returns**: Force Agents to return JSON format containing `status`, `evidence`, and `verified_by` fields, rather than natural language descriptions.

**The trade-off is approximately 20% longer task completion time**, but for any task with real side effects, this cost is worthwhile. Implement this mechanism in your Agent system today.

#### 💻 Code Snippet

```
{
  "status": "completed",
  "evidence": "https://example.com/article/123",
  "verified_by": "independent_checker_v1"
}
```

---

### 📌 

> ★★★☆☆ **Score: 58.3** | Source: [Trending repositories on GitHub today · GitHub - mvanhorn](https://github.com/mvanhorn/last30days-skill)

The project `mvanhorn/last30days-skill` (Python, 5044 Stars

---

## ⚙️ Software Engineering

### 📌 Loonflow 3.1.0 Released, Drag-and-Drop Config and Multi-Tenancy Power Enterprise Ticketing Systems

> ★★★☆☆ **Score: 65.8** | Source: [V2EX - 技术](https://www.v2ex.com/t/1200815#reply0)

As an open-source project maintained since 2018, **Loonflow version 3.1.0** demonstrates the maturity of domestic workflow engines. Its core highlights are **drag-and-drop workflow configuration** and **multi-tenant architecture**—two features that directly address enterprise pain points: lowering ops configuration barriers and supporting multi-team/organizational isolation.

Why it matters: Against the backdrop of domestic substitution and digital transformation, enterprises urgently need flexible, integrable workflow engines. Loonflow provides a **comprehensive API system** and rich hook events for deep integration with existing systems and automated extensions. Support for **WeChat Work QR code login** and **OIDC protocol** also reduces internal enterprise onboarding costs.

Technology selection recommendations:
1. **Evaluate as a foundation for internal ops/approval systems**: If your company needs a customizable workflow system, Loonflow deserves serious consideration in tech selection, especially for its **conditional logic, parallel processing** and other complex flow control capabilities.
2. **Leverage APIs for secondary development**: All core features support API calls, enabling rapid construction of upper-layer applications based on business needs—automated ops tickets, internal approval flows, etc.
3. **Monitor community activity**: The project has been maintained for years, with a major refactor in the 3.x version ensuring stability and extensibility. Check GitHub Issues and PR handling before adoption.

---

### 📌 

> ★★★☆☆ **Score: 58.3** | Source: [Trending repositories on GitHub today · GitHub - pascalorg](https://github.com/pascalorg/editor)

![](https://opengraph.githubassets.com/cf504724cc5805f268fb245ce0b6a9b2c50e283ac9299808cb6a73817e8a9453/pascalorg/editor)

This item is only a GitHub project brief with insufficient information to generate deep insights. Recommend watching project `pascalorg/editor` (TypeScript, 4390 Stars) for specific technical highlights or problems solved.

---

## 📈 Investment & Finance

### 📌 

> ★★★☆☆ **Score: 61.1** | Source: [AInvest - Latest News](https://www.ainvest.com/news/video-ai-adoption-hits-critical-mass-3-trillion-infrastructure-boom-2603/)

Insufficient content to generate deep insights.

---

### 📌 

> ★★★☆☆ **Score: 61.1** | Source: [AInvest - Latest News](https://www.ainvest.com/news/video-gold-2025-performance-historic-break-catalyst-future-growth-2603/)

Insufficient content to generate deep insights.

---

## 📈 Today's Score Rankings

| Rank | Domain | News | Score |
|:----:|:----:|:-----|:----:|
| 1 | 🤖 AI | Meta Acquires Star Team with Big Money, AI Agent Sector Kicks Off Talent Arms Race | **67** |
| 2 | 🤖 AI | Claude Natively Supports Computer Control, OpenClaw-Type Projects Face an Existential Threat | **66** |
| 3 | ⚙️ Software Engineering | Loonflow 3.1.0 Released, Drag-and-Drop Config and Multi-Tenancy Power Enterprise Ticketing Systems | **65.8** |
| 4 | 🤖 AI | WeChat Officially Opens AI Agent Interface, Open-Source SDK Enables 5-Minute Integration | **62** |
| 5 | 🤖 AI | Westlake University Releases Robot Action Generalization Model GAE, Toward a "General Cerebellum" | **62** |
| 6 | 🤖 AI | AI Godfather Hinton Warns: Short-Term Profit Motives Are Ignoring Systemic AI Risks | **61.5** |
| 7 | 📈 Investment & Finance |  | **61.1** |
| 8 | 📈 Investment & Finance |  | **61.1** |
| 9 | 🤖 AI | Alibaba Xuantie C950 Breaks RISC-V Performance Record, CPU Value Reassessed in AI Era | **59** |
| 10 | 🤖 AI | AI Agent "Falsifies Reports"? Practitioners Propose Four-Step Verification Mechanism | **58.5** |
| 11 | ⚙️ Software Engineering |  | **58.3** |
| 12 | 🤖 AI |  | **58.3** |


---

## 📝 More in the Last 24h

> The following are other updates from the past 24 hours, not yet analyzed in depth:

#### 🤖 AI
- [10:46] [Timer-S1 Officially Released: First Billion-Scale Time-Series Foundation Model, Prediction Performance Achieves SOTA](https://www.oschina.net/news/413600) — *开源中国-全部 - 白开水不加糖*
- [10:29] [OpenAI Bets on Fusion Energy: The Energy Game Behind AI Compute Ambitions](https://www.oschina.net/news/413591) — *开源中国-全部 - 局*
- [17:40] [I Built a Live Streaming Player Using AI](https://www.v2ex.com/t/1200789#reply0) — *V2EX - 技术*
- [17:05] [Thanks to Teacher Duck, 10 Days of AI Short Drama Creation, Got a Commercial Order!](https://linux.do/t/topic/1807496) — *LINUX DO - 热门话题 - AlvinC*
- [15:41] [Meituan BI's Exploration and Practice in Metrics Platforms and Analysis Engines](https://www.oschina.net/news/413734) — *开源中国-全部 - 白开水不加糖*
- [15:07] [Millions of iPhones Face Serious Threat: Hacker Toolkit Leaked Publicly, Apple Urgently Releases Patch](https://www.oschina.net/news/413718) — *开源中国-全部 - 局*
- [14:38] [Meituan Tabbit Browser Updated, Page Translation Feature Returns](https://www.oschina.net/news/413705) — *开源中国-全部 - 白开水不加糖*
- [21:40] [Revolutionizing Penetration Testing with AI: Assail's Ares Platform](https://www.ainvest.com/news/video-revolutionizing-penetration-testing-ai-assail-ares-platform-2603/) — *AInvest - Latest News*
- [19:01] [Soft Overall Inflation Unlikely to Stop BOJ from Monetary Policy Normalization](https://www.ft.com/content/fd8a1d0d-ddc6-470b-806c-0b14972d7eba) — *金融时报*
- [19:01] [UK Business Activity Nearly Stagnates as War Pushes Up Costs](https://www.ft.com/content/7323fae0-4d3b-48bc-ac94-00751183a82f) — *金融时报*
- [19:01] [Survey Shows Iran Turmoil Impacting Global Economy](https://www.ft.com/content/478c7347-2ccc-478e-b853-53f0e410f3bb) — *金融时报*
- [19:00] [Oil Prices Soar to $101.58 as Strait of Hormuz Disrupted](https://www.ainvest.com/news/video-oil-prices-soar-101-58-strait-hormuz-disrupted-2603/) — *AInvest - Latest News*
- [18:52] [Brent crude surges 40% as Strait of Hormuz is closed, inflation to rise by 0.5-0.6%.](https://www.ainvest.com/news/video-brent-crude-surges-40-strait-hormuz-closed-inflation-rise-0-5-0-6-2603/) — *AInvest - Latest News*
- [18:29] [UK Voting System Needs Updating for Era of Personalized Politics](https://www.ft.com/content/f477d82f-ce52-472b-b108-98f99cf83a48) — *金融时报*
- [18:29] [North Korean Leader Kim Jong Un Criticizes US "Aggression" During Iran War](https://www.ft.com/content/0157d253-14ec-4842-96d2-9526ca7329a7) — *金融时报*
- [18:29] [Retirees Active in Public Service Are Driving Society Forward](https://www.ft.com/content/47622296-5725-4ef3-bc5d-a75d4cefa118) — *金融时报*
- [10:40] [Comprehensive Phone Price Hikes Coming, This Will Take a While](https://www.36kr.com/p/3735507998097415) — *36氪 - 24小时热榜*
- [17:42] [CopyQ 14.0.0 Released, Cross-Platform Clipboard Manager](https://www.oschina.net/news/413805/copyq-14-0-0-released) — *开源中国-全部 - 白开水不加糖*
- [14:55] [Official: Token Chinese Name Confirmed as "词元"](https://www.oschina.net/news/413712) — *开源中国-全部 - 白开水不加糖*
- [15:34] [Plugin for Quickly Switching Codex Accounts](https://www.v2ex.com/t/1200742#reply0) — *V2EX - 技术*
- [22:55] [Wukong AI Is Hot, But I'm Too Slow! Couldn't Grab One After Two Days! Made a Small Tool, Help Yourself, Open Source and Free!](https://www.v2ex.com/t/1200849#reply0) — *V2EX - 技术*
- [22:53] [Developing Python in PyCharm, Custom Code Style with Real-Time Hints](https://www.v2ex.com/t/1200848#reply0) — *V2EX - 技术*
- [21:54] [A Former Developer's "Consolidated Shipping" Startup Experiment, Main Theme: Not Ripping People Off](https://www.v2ex.com/t/1200835#reply0) — *V2EX - 技术*
- [10:27] [HandBrake 1.11.1 Released](https://www.oschina.net/news/413589/handbrake-1-11-1-released) — *开源中国-全部 - 白开水不加糖*
- [17:33] [Xiaomi Group 2025 Adjusted Net Profit 39.17 Billion RMB, Up 43.8% YoY, How to Interpret?](https://www.zhihu.com/question/2019829332076418709) — *知乎热榜*
- [17:27] [ChatGPT Ghostwrites Breakup Letters: Young People Are "Outsourcing" Their Emotional Expression](https://www.oschina.net/news/413792) — *开源中国-全部 - 局*
- [15:11] [Markets Weigh Fragile Iran De-Escalation Hopes | The Asia Trade 3/24/2026](https://www.ainvest.com/news/video-markets-weigh-fragile-iran-de-escalation-hopes-asia-trade-3-24-2026-2603/) — *AInvest - Latest News*
- [20:00] [NVIDIA's Nemotron 3: Revolutionizing Healthcare AI with Open Models](https://www.ainvest.com/news/video-nvidia-nemotron-3-revolutionizing-healthcare-ai-open-models-2603/) — *AInvest - Latest News*
- [15:48] [Bank of Japan's "Temporary Slowdown" Narrative Hinges on Core-Core Inflation and Wage Spiral Risks](https://www.ainvest.com/news/bank-japan-temporary-slowdown-narrative-hinges-core-core-inflation-wage-spiral-risks-2603/) — *AInvest - Latest News - Julian West*
- [14:55] [Terence Tao: AI Has Reduced the Cost of Ideas to Nearly Zero... | Original](https://t.me/wxbyg/6803) — *微信搬运工 - Telegram Channel*
- [09:45] [After Iran War Ends, Indian Market Still Faces Dim Prospects](https://www.ft.com/content/5fdd2b3a-9a7c-4559-88da-9b283fe6bb63) — *金融时报*
- [16:52] [Valutico's Active VDR: Can AI "Pre-Diligence" Force a Category Reset Before Competitors Catch Up?](https://www.ainvest.com/news/valutico-active-vdr-ai-pre-diligence-force-category-reset-competitors-catch-2603/) — *AInvest - Latest News - Victor Hale*
- [15:49] [China's RWA Crackdown: Diverting $25B+ in Capital Flows](https://www.ainvest.com/news/china-rwa-crackdown-diverting-25b-capital-flows-2603/) — *AInvest - Latest News - Riley Serkin*
- [17:20] [Hot Reload/Hot Refresh for Development Is No Longer Essential](https://www.v2ex.com/t/1200779#reply5) — *V2EX - 技术*
- [10:23] [The Atlantic | US Aviation Industry on Brink of Collapse | Original](https://t.me/wxbyg/6800) — *微信搬运工 - Telegram Channel*
- [16:50] [Why Do IT-Related Unions Have Such Weak Presence? Especially in the AI Era.](https://www.v2ex.com/t/1200771#reply6) — *V2EX - 技术*
- [15:49] [Cadeler's Fleet Expansion Bets Big on Offshore Wind's Vessel Bottleneck](https://www.ainvest.com/news/cadeler-fleet-expansion-bets-big-offshore-wind-vessel-bottleneck-2603/) — *AInvest - Latest News - Cyrus Cole*
- [14:21] [China's Daily Token (Token) Usage Exceeds 140 Trillion](https://www.oschina.net/news/413697) — *开源中国-全部 - 局*
- [14:31] [](https://xueqiu.com/5124430882/380883819) — *热帖 - 雪球 - 7X24快讯*
- [20:59] [480+ Free Models You Can Use Freely in Cursor/Winsurf/Antigravity/Claude/VS Code!](https://www.v2ex.com/t/1200820#reply4) — *V2EX - 技术*
- [13:11] [Siemens Chief Says Europe Faces "Disaster" If It Prioritizes AI Autonomy](https://www.ft.com/content/d66e857d-803b-45b8-b2f4-3c433b79bfc5) — *金融时报*
- [13:11] [Middle East War Shocks Supply Chains, Automakers Scramble to Stockpile Aluminum](https://www.ft.com/content/167fdf4b-0afd-4a05-a6bd-e3d1518cd84d) — *金融时报*
- [13:11] [Can the US Economy Thrive Without Immigrants?](https://www.ft.com/content/7b3b89c9-56a6-4beb-9c26-9b991003f441) — *金融时报*
- [13:11] [Netanyahu's Rivals Try to Outdo Him on Iran](https://www.ft.com/content/35841420-0397-4371-9b6c-87f099dfcd67) — *金融时报*
- [13:08] [Iran's "Energy Truce" Hides Deepening Supply Shock—Strait of Hormuz Remains the Alpha Risk](https://www.ainvest.com/news/iran-energy-truce-hides-deepening-supply-shock-strait-hormuz-remains-alpha-risk-2603/) — *AInvest - Latest News - Oliver Blake*
- [13:08] [Mie Kotsu's Audit Committee Move Positions It in Japan's Governance-Driven Value-Creation Wave](https://www.ainvest.com/news/mie-kotsu-audit-committee-move-positions-japan-governance-driven-creation-wave-2603/) — *AInvest - Latest News - Philip Carter*
- [13:07] [MAS's Inflation Insulation Test: Will April Data Break the Policy Band?](https://www.ainvest.com/news/mas-inflation-insulation-test-april-data-break-policy-band-2603/) — *AInvest - Latest News - Marcus Lee*
- [13:06] [NovaBay's 19% Surge: A Flow Analysis of a Crypto Rebrand](https://www.ainvest.com/news/novabay-19-surge-flow-analysis-crypto-rebrand-2603/) — *AInvest - Latest News - Liam Alford*
- [12:54] [10 Year Treasury Yield Rises Amid Inflation Fears and Iran Conflict](https://www.ainvest.com/news/10-year-treasury-yield-rises-inflation-fears-iran-conflict-2603/) — *AInvest - Latest News*