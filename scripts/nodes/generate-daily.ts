import type { PipelineStateType } from "../state.js";
import { callLLM } from "../lib/llm.js";
import { dailySummarySystemPrompt } from "../lib/prompts.js";
import dayjs from "dayjs";

export async function generateDailyNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { insights, date } = state;
  if (!insights.length) {
    return { dailyMarkdown: "" };
  }

  try {
    const insightsSummary = insights
      .map((i) => `- ${i.oneLiner}: ${i.whyItMatters}`)
      .join("\n");

    const summaryResponse = await callLLM({
      systemPrompt: dailySummarySystemPrompt(),
      prompt: `今日精选资讯洞察：\n\n${insightsSummary}`,
      model: "pro",
    });

    const dailySummary = summaryResponse.text;

    const byCategory = new Map<string, typeof insights>();
    for (const insight of insights) {
      const cat = insight.category || "Other";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(insight);
    }

    const displayDate = dayjs(date).format("YYYY年MM月DD日");
    let md = `---
title: "AI 日报 | ${displayDate}"
date: "${date}"
itemCount: ${insights.length}
---

# AI 日报 | ${displayDate}

## 今日综述

${dailySummary}

---

`;

    for (const [category, items] of byCategory) {
      md += `## ${category}\n\n`;
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
