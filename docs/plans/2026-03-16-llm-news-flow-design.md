# LLM News Flow - 三阶六维决策引擎设计文档

## 站点理念

不追求信息最多，只追求信息更准、更快、更有用。

- **高效降噪**：从每日数千条资讯中提炼真正值得阅读的精华
- **深度解读**：用中文语境深度解读前沿动态，不仅是翻译，更是洞察
- **实战导向**：关注 AI 工具如何落地，帮用户发现真实商业机会

## LLM 决策引擎架构

```
原始新闻 → [阶段1: 快速过滤] → [阶段2: 深度评估] → [阶段3: 价值提炼]
           Gemini Flash          Gemini Flash          Gemini Pro
           去噪90%+              六维打分Top N          结构化洞察生成
```

### 阶段 1：Gate Keeper（快速过滤）

批量输入新闻标题+摘要，LLM 快速分类：
- PASS：有价值，进入下一轮
- DROP：广告软文、重复报道、过时信息、标题党无实质内容
- MERGE：与其他条目为同一事件的不同报道，标记合并

保留率目标：20-30%

### 阶段 2：Value Analyst（六维深度评估）

| 维度 | 权重 | 判断标准 |
|------|------|---------|
| 新颖性 novelty | 20% | 首次报道 vs 跟风？有无真正新信息？ |
| 实用性 utility | 25% | 能否直接用于工作/产品/投资决策？ |
| 影响力 impact | 20% | 对行业格局的改变程度 |
| 可信度 credibility | 15% | 信源质量、数据支撑、可验证性 |
| 时效性 timeliness | 10% | 信息保鲜期 |
| 独特性 uniqueness | 10% | 能否提供其他中文媒体没有的解读角度？ |

加权总分排序，取 Top N（默认 8-12 条）

### 阶段 3：Insight Generator（价值提炼）

对入选新闻生成结构化洞察：
- 一句话说清楚（30字以内）
- 为什么重要（改变了什么）
- 谁应该关注（开发者/创业者/投资人/产品经理）
- 行动建议（读者可以做什么）
- 深度解读（200字，中文语境解释技术/商业含义）

## 技术栈

- 管线编排：LangGraph.js (@langchain/langgraph)
- 语言：TypeScript
- LLM：Google Gemini API (@google/genai) 主力 + OpenAI 降级
- TTS：Gemini TTS
- 前端：Next.js (SSG) + Tailwind CSS
- 部署：Vercel + GitHub Actions
- 音频存储：Cloudflare R2
- 内容存储：Git + Markdown
