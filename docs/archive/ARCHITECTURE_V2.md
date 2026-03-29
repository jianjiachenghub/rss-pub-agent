# AI 资讯日报系统 - 架构设计文档 V2

## 1. 设计目标

构建一个**AI 驱动的智能资讯聚合系统**，核心特点：

- **Follow 列表为主力数据源** - 在 Follow 平台维护订阅列表，自动抓取列表内所有源的更新
- **热榜为补充** - 国内外热门平台（微博、知乎、Hacker News 等）作为趋势补充
- **LLM 智能处理** - 自动筛选、打分、分类、生成结构化日报
- **无需人工维护 feeds.json** - 订阅源在 Follow 里管理，代码自动同步

## 2. 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据采集层                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 主力数据源：Follow 列表                                               │   │
│  │                                                                      │   │
│  │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │   │
│  │  │ OpenAI Blog │     │ Anthropic   │     │ DeepMind    │   ...      │   │
│  │  │ (RSS)       │     │ (RSS)       │     │ (RSS)       │            │   │
│  │  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘            │   │
│  │         │                   │                   │                    │   │
│  │         └───────────────────┴───────────────────┘                    │   │
│  │                             │                                        │   │
│  │                    ┌────────┴────────┐                               │   │
│  │                    │   Follow 列表   │  ← 用户在 Follow 里管理        │   │
│  │                    │   "AI资讯"      │                               │   │
│  │                    └────────┬────────┘                               │   │
│  │                             │                                        │   │
│  │                    ┌────────┴────────┐                               │   │
│  │                    │  Follow API     │  ← /entries (需 session)      │   │
│  │                    │  (folo-list)    │                               │   │
│  │                    └────────┬────────┘                               │   │
│  │                             │                                        │   │
│  └─────────────────────────────┼────────────────────────────────────────┘   │
│                                │                                            │
│  ┌─────────────────────────────┼────────────────────────────────────────┐   │
│  │ 补充数据源：热榜平台          │                                        │   │
│  │                             │                                        │   │
│  │  ┌─────────────┐   ┌────────┴────────┐   ┌─────────────┐            │   │
│  │  │ 微博热搜    │   │ 知乎热榜        │   │ HN Top      │            │   │
│  │  │ (RSSHub)    │   │ (RSSHub)        │   │ (RSSHub)    │            │   │
│  │  └──────┬──────┘   └────────┬────────┘   └──────┬──────┘            │   │
│  │         │                   │                   │                    │   │
│  │         └───────────────────┴───────────────────┘                    │   │
│  │                             │                                        │   │
│  │                    ┌────────┴────────┐                               │   │
│  │                    │  Follow API     │  ← /feeds?url= (无需认证)     │   │
│  │                    │  (folo)         │                               │   │
│  │                    └─────────────────┘                               │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LLM 处理层                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  fetch      │───→│  gate-keep  │───→│   score     │───→│  insight    │  │
│  │  抓取       │    │  初筛去噪    │    │  六维打分    │    │  深度分析    │  │
│  │             │    │             │    │             │    │             │  │
│  │ 100-300条   │    │ 50-80条     │    │ Top 20-30   │    │ 结构化洞察   │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘  │
│                                                                  │         │
│                                                                  ▼         │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                      generate-daily                                  │  │
│  │                                                                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │  产品更新    │  │  前沿研究    │  │  行业动态    │   ...        │  │
│  │  │  Products    │  │  Research    │  │  Industry    │              │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │  │
│  │                                                                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │  │
│  │  │  开源项目    │  │  社媒热点    │  │  今日综述    │              │  │
│  │  │  Open Source │  │  Social      │  │  Summary     │              │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              输出层                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │  Markdown   │   │   Podcast   │   │  小红书文案  │   │  抖音文案   │     │
│  │  日报       │   │   播客音频   │   │             │   │             │     │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3. 数据源配置

### 3.1 Follow 列表（主力）

**配置方式：**
- 在 [follow.is](https://follow.is) 创建列表（如"AI资讯"）
- 添加你关注的 AI 相关 RSS 源（OpenAI、Anthropic、DeepMind、HuggingFace 等）
- 代码通过 `folo-list` 类型拉取整个列表

**优点：**
- 在 Follow 的 Web/App 里可视化维护订阅源
- 新增/删除源无需修改代码
- Follow 会自动解析 RSS、缓存、生成 AI 摘要

**缺点：**
- 需要 `FOLO_SESSION_TOKEN`（从浏览器 Cookie 获取）
- Follow 没有公开 API 文档，接口可能变动

### 3.2 热榜补充

| 平台 | RSSHub 路由 | 用途 |
|------|-------------|------|
| 微博热搜 | `/weibo/search/hot` | 国内热点趋势 |
| 知乎热榜 | `/zhihu/hotlist` | 国内讨论热点 |
| Hacker News | `/hackernews` | 技术社区热点 |
| Reddit r/AI | `/reddit/r/artificial/top` | 海外 AI 社区 |

**优点：**
- 无需认证
- 反映实时热点

**缺点：**
- 内容质量参差不齐
- 需要额外的过滤逻辑

## 4. 处理流程

### 4.1 fetch（抓取）

```typescript
// 并发抓取 Follow 列表 + 热榜
const tasks = [
  // 主力：Follow 列表（一次请求获取列表内所有源）
  () => fetchFoloByList(sessionToken, listId, ...),
  
  // 补充：各热榜源
  () => fetchViaFolo(weiboHotUrl, ...),
  () => fetchViaFolo(zhihuHotUrl, ...),
  ...
];

// 限制并发度为 5
const results = await runWithConcurrency(tasks, 5);

// URL + Title 去重
const deduped = deduplicate(results);
```

**输出：** 100-300 条原始资讯

### 4.2 gate-keep（初筛）

**目标：** 快速过滤噪音，保留有价值内容

**DROP 规则：**
- 纯广告软文、产品推销
- 标题党（标题夸张但正文无实质内容）
- 过时信息（超过 3 天且无新进展）
- 重复报道（标记 MERGE）
- 水文（大段引用无原创观点）

**输出：** 50-80 条

### 4.3 score（打分）

**六维评估框架：**

| 维度 | 权重 | 说明 |
|------|------|------|
| novelty（新颖性） | 20% | 是否首发、是否有增量信息 |
| utility（实用性） | 25% | 是否可立即应用到工作/产品 |
| impact（影响力） | 20% | 是否改变行业格局 |
| credibility（可信度） | 15% | 来源权威性、信息准确性 |
| timeliness（时效性） | 10% | 是否紧跟热点 |
| uniqueness（独特性） | 10% | 是否有独到见解 |

**输出：** Top 20-30 条（按 weightedScore 排序）

### 4.4 insight（深度分析）

为每条资讯生成结构化洞察（利用 LLM 提取视觉和排版增强信息）：

```typescript
interface NewsInsight {
  id: string;
  title: string;
  url: string;
  source: string;
  category: string;  // 机器人/科技/软件工程/商业财经/投资理财/时政军事/社交媒体
  
  // LLM 生成核心信息
  oneLiner: string;        // 一句话总结
  whyItMatters: string;    // 为什么重要
  whoShouldCare: string[]; // 谁应该关注
  actionableAdvice: string; // 行动建议
  deepDive: string;        // 深度解读
  
  // 视觉与结构增强字段 (Optional)
  imageUrl?: string;        // 核心配图 URL
  codeSnippet?: string;     // 相关代码及语言
  comparisonTable?: string; // Markdown 格式的对比级参数表格
  
  scores: {...};
  weightedScore: number;
}
```

### 4.5 generate-daily 与 建档渲染机制

**结构化建档：**
- 最终生成的字符串会被直接写入文件系统，按日期建档，路径为 `content/YYYY-MM-DD/daily.md`。
- Next.js (或者其他前端架构) 直接读取按日期归档整理的 `.md` 文件供用户访问。

**智能分类器：**

```
输入：20-30 条带富媒体 insight 的资讯
       │
       ▼
┌─────────────────────────────────────┐
│  规则与LLM 联合分类器                  │
│                                     │
│  "Replit Agent 4 发布" → ⚙️ 软件工程 │
│  "Claude 3.5 发布" → 🤖 AI 领域      │
│  "英伟达财报超预期" → 💼 商业财经    │
│  "美联储宣布降息" → 📈 投资理财      │
└─────────────────────────────────────┘
       │
       ▼
输出：按 7 大固定分类组织的图文并茂的日报
```

**Markdown 渲染排版结构：**

```markdown
# AI资讯流 | 2026年3月22日

## 📊 今日数据概览
（Markdown 表格统计各分类的数量及最高分资讯标题）

---

## 🤖 AI 领域

### Claude 3.5 Sonnet 正式发布
**★★★★★ 95分** | 来源: [Anthropic Blog](url)

（如 LLM 提取了 imageUrl，直接渲染为 Markdown 图片）
![核心配图](imageUrl)

**一句话总结：** 速度翻倍，能力全面超越 GPT-4o。

（如果有技术对比/规格，渲染为 Markdown 表格）
| 特性 | Claude 3.5 | GPT-4o |
|------|------------|--------|
...

**为什么重要：** ...

**代码展示：**
```python
import anthropic
...
```

<details>
<summary><b>点击展开深度解读 (Deep Dive)</b></summary>
(200字深度解析，利用 HTML details 标签默认折叠防止页面过长)
</details>

---

## 💻 科技 ...
## ⚙️ 软件工程 ...
（按照固定 7 大分类依次输出各版块内容，排版规范与 AI 领域中保持一致）

---
## 🏆 今日价值评分总榜
（在末尾附上当日所有采集+筛选完成的 Insights 按照最终分数的全局排名明细表格）
```

## 5. 配置文件

### 5.1 feeds.json（简化版）

```json
{
  "feeds": [
    {
      "id": "folo-ai-list",
      "type": "folo-list",
      "listId": "${FOLO_LIST_ID}",
      "category": "ai_news",
      "name": "Follow AI 列表",
      "weight": 100
    },
    {
      "id": "weibo-hot",
      "type": "folo",
      "url": "https://rsshub.app/weibo/search/hot",
      "category": "cn_trending",
      "name": "微博热搜",
      "weight": 60
    },
    {
      "id": "zhihu-hot",
      "type": "folo",
      "url": "https://rsshub.app/zhihu/hotlist",
      "category": "cn_trending",
      "name": "知乎热榜",
      "weight": 60
    },
    {
      "id": "hn-top",
      "type": "folo",
      "url": "https://rsshub.app/hackernews",
      "category": "community",
      "name": "Hacker News",
      "weight": 70
    }
  ]
}
```

### 5.2 环境变量

```bash
# Follow 认证（必需）
FOLO_SESSION_TOKEN=your_session_token_here

# Follow 列表 ID（可选，也可写在 feeds.json）
FOLO_LIST_ID=your_list_id_here

# LLM API Keys（至少配置一个）
OPENAI_API_KEY=...
GEMINI_API_KEY=...
```

## 6. 关键实现细节

### 6.1 folo-list 接口

```typescript
// POST https://api.follow.is/entries
// Headers: Cookie: authjs.session-token=xxx
// Body: { listId: string }

interface FoloListResponse {
  code: number;
  data?: {
    entries: Array<{
      id: string;
      title: string;
      url: string;
      content?: string;
      summary?: string;  // Follow 生成的 AI 摘要
      publishedAt: string;
      feed?: {
        id: string;
        title: string;
        url: string;
      };
    }>;
  };
}
```

### 6.2 并发控制

```typescript
const CONCURRENCY = 5;

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  // 使用 Promise pool 限制并发
  // 避免对 Follow API 造成过大压力
}
```

### 6.3 去重策略

```typescript
function deduplicate(items: RawNewsItem[]): RawNewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    // 优先用 URL 去重
    const key = item.url || item.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

## 7. 与 V1 架构的区别

| 特性 | V1（当前） | V2（目标） |
|------|-----------|-----------|
| 数据源 | 23 个固定 RSS 源 | Follow 列表 + 热榜补充 |
| 源管理 | 修改 feeds.json | 在 Follow 里可视化维护 |
| 内容量 | 几十条 | 100-300 条 |
| 分类 | 简单（ai_labs/ai_news/blogs） | 智能（产品/研究/行业/开源） |
| 人工干预 | 高（需维护 feeds.json） | 低（只在 Follow 里管理） |

## 8. 实施计划

1. **完善 folo.ts** - 确保 `fetchFoloByList` 能正确工作
2. **简化 feeds.json** - 只保留 folo-list + 热榜
3. **优化 prompts** - 增强分类逻辑
4. **测试验证** - 跑通完整流程
5. **文档更新** - 更新 README 和配置说明
