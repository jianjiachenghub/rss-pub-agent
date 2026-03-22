import type { PipelineStateType } from "../state.js";
import { callLLM } from "../lib/llm.js";
import { dailySummarySystemPrompt } from "../lib/prompts.js";
import dayjs from "dayjs";

// 领域分类映射
const CATEGORY_MAP: Record<string, string> = {
  "ai": "🤖 AI 领域",
  "tech": "💻 科技",
  "software": "⚙️ 软件工程",
  "business": "💼 商业财经",
  "investment": "📈 投资理财",
  "politics": "🌍 时政军事",
  "social": "📱 社交媒体",
  "cn_trending": "🔥 国内热点",
  "community": "👥 社区动态",
};

// 领域排序
const CATEGORY_ORDER = [
  "ai",
  "tech", 
  "software",
  "business",
  "investment",
  "politics",
  "social",
];

export async function generateDailyNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { insights, date } = state;
  if (!insights.length) {
    return { dailyMarkdown: "" };
  }

  try {
    // 生成简短摘要（50-150字）
    const insightsSummary = insights
      .slice(0, 3)
      .map((i) => i.oneLiner)
      .join("；");

    const summaryResponse = await callLLM({
      systemPrompt: `你是一位资深编辑，擅长撰写简洁有力的资讯摘要。请用50-150字概括今日核心趋势，语言精炼，突出关键洞察。`,
      prompt: `今日精选资讯：${insightsSummary}\n\n请用50-150字撰写今日综述：`,
      model: "pro",
    });

    const dailySummary = summaryResponse.text;

    // 按领域分类
    const byCategory = new Map<string, typeof insights>();
    
    // 初始化所有领域
    for (const key of CATEGORY_ORDER) {
      byCategory.set(key, []);
    }
    
    // 分配资讯到各领域
    for (const insight of insights) {
      const cat = insight.category || "social";
      // 映射到标准领域
      let mappedCat = cat;
      if (cat === "cn_trending") mappedCat = "social";
      if (cat === "community") mappedCat = "tech";
      
      if (!byCategory.has(mappedCat)) {
        byCategory.set(mappedCat, []);
      }
      byCategory.get(mappedCat)!.push(insight);
    }

    const displayDate = dayjs(date).format("YYYY年MM月DD日");
    let md = `---
title: "AI 日报 | ${displayDate}"
date: "${date}"
itemCount: ${insights.length}
---

# AI 日报 | ${displayDate}

> ${dailySummary}

---

`;

    // 按固定顺序输出各领域
    for (const catKey of CATEGORY_ORDER) {
      const items = byCategory.get(catKey) || [];
      if (items.length === 0) continue;
      
      const categoryName = CATEGORY_MAP[catKey] || catKey;
      md += `## ${categoryName}\n\n`;
      
      for (const item of items) {
        const scoreBar =
          "★".repeat(Math.round(item.weightedScore / 20)) +
          "☆".repeat(5 - Math.round(item.weightedScore / 20));

        md += `### ${item.oneLiner}

**${scoreBar} ${item.weightedScore}分** | 来源: [${item.source}](${item.url})

**为什么重要：** ${item.whyItMatters}

**谁应该关注：** ${item.whoShouldCare.join("、")}

**行动建议：** ${item.actionableAdvice}

${item.deepDive}

---

`;
      }
    }

    console.log(
      `[generate-daily] Rendered ${insights.length} items across ${byCategory.size} categories`
    );
    return { dailyMarkdown: md, dailySummary };
  } catch (err) {
    console.error("[generate-daily] Failed:", err);
    return {
      dailyMarkdown: "",
      errors: [
        {
          node: "generateDaily",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
