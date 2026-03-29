import dayjs from "dayjs";
import type { PipelineStateType } from "../state.js";
import { callLLMJson } from "../lib/llm.js";
import { truncateSummaryText } from "../lib/insight-format.js";
import {
  CATEGORY_LABELS,
  CATEGORIES,
  dailyFramingSystemPrompt,
  dailyFramingUserPrompt,
} from "../lib/prompts.js";

interface DailyFramingResult {
  opening: string;
  closing: string;
}

function getDisplayTitle(title: string, oneLiner: string): string {
  const normalizedTitle = title.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedTitle)) {
    return oneLiner.trim() || normalizedTitle;
  }
  return normalizedTitle;
}

export async function generateDailyNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { insights, secondaryItems, date, config, editorialAgenda } = state;
  if (!insights.length || !config) {
    return { dailyMarkdown: "" };
  }

  try {
    let dailyOpening = editorialAgenda.openingAngle;
    let dailyClosing = editorialAgenda.closingOutlookAngle;

    try {
      const framing = await callLLMJson<DailyFramingResult>({
        systemPrompt: dailyFramingSystemPrompt(
          config.reportName ?? "个人日报",
          config.editorial
        ),
        prompt: dailyFramingUserPrompt(
          date,
          insights.slice(0, 8).map((insight) => ({
            title: insight.title,
            oneLiner: insight.oneLiner,
            category: insight.category,
            weightedScore: insight.weightedScore,
          })),
          editorialAgenda
        ),
        model: "pro",
        jsonSchema: {
          type: "OBJECT",
          properties: {
            opening: { type: "STRING" },
            closing: { type: "STRING" },
          },
          required: ["opening", "closing"],
        },
      });

      dailyOpening = framing.opening || dailyOpening;
      dailyClosing = framing.closing || dailyClosing;
    } catch (framingError) {
      console.warn(
        "[generate-daily] Daily framing failed, using editorial agenda fallback:",
        (framingError as Error).message
      );
    }

    const byCategory = new Map<string, typeof insights>();
    for (const category of CATEGORIES) {
      byCategory.set(category, []);
    }

    for (const insight of insights) {
      const category = byCategory.has(insight.category)
        ? insight.category
        : "social";
      byCategory.get(category)!.push(insight);
    }

    const displayDate = dayjs(date).format("YYYY年M月D日");
    const reportName = config.reportName ?? "个人日报";
    const activeCategories = CATEGORIES.filter(
      (category) => (byCategory.get(category) ?? []).length > 0
    );

    let markdown = `---
title: "${reportName} | ${displayDate}"
date: "${date}"
itemCount: ${insights.length}
---

# ${reportName} | ${displayDate}

## 今日判断

> ${dailyOpening}

---

`;

    if (activeCategories.length > 0) {
      markdown += `## 今日概览\n\n`;
      markdown += `| 分类 | 条数 | 最高分 | 头条 |\n`;
      markdown += `|:-----|:----:|:------:|:-----|\n`;

      for (const category of activeCategories) {
        const items = byCategory.get(category) ?? [];
        const topItem = items.reduce((left, right) =>
          left.weightedScore >= right.weightedScore ? left : right
        );
        markdown += `| ${CATEGORY_LABELS[category]} | ${items.length} | **${topItem.weightedScore}** | ${truncateSummaryText(getDisplayTitle(topItem.title, topItem.oneLiner), 34)} |\n`;
      }

      markdown += `\n`;
    }

    for (const category of CATEGORIES) {
      const items = byCategory.get(category) ?? [];
      if (items.length === 0) continue;

      markdown += `## ${CATEGORY_LABELS[category]}\n\n`;
      for (const item of items) {
        const displayTitle = getDisplayTitle(item.title, item.oneLiner);
        markdown += `### ${displayTitle}\n\n`;
        markdown += `> **${item.weightedScore} 分** | 来源: [${item.source}](${item.url})\n`;
        markdown += `> ${item.oneLiner}\n\n`;

        if (item.imageUrl) {
          markdown += `![${displayTitle}](${item.imageUrl})\n\n`;
        }

        markdown += `**事件：** ${item.event}\n\n`;
        if (item.interpretation) {
          markdown += `**解读：** ${item.interpretation}\n\n`;
        }

        if (
          item.comparisonTable &&
          item.comparisonTable.headers &&
          item.comparisonTable.rows &&
          item.comparisonTable.rows.length > 0
        ) {
          markdown += `#### 对比\n\n`;
          markdown += `| ${item.comparisonTable.headers.join(" | ")} |\n`;
          markdown += `|${item.comparisonTable.headers.map(() => ":---").join("|")}|\n`;
          for (const row of item.comparisonTable.rows) {
            markdown += `| ${row.join(" | ")} |\n`;
          }
          markdown += `\n`;
        }

        if (item.codeSnippet?.code) {
          markdown += `#### 代码片段\n\n`;
          markdown += `\`\`\`${item.codeSnippet.lang || ""}\n${item.codeSnippet.code}\n\`\`\`\n\n`;
        }

        markdown += `---\n\n`;
      }
    }

    markdown += `## 接下来要盯的变量\n\n`;
    const watchSignals = editorialAgenda.watchSignals.slice(0, 5);
    if (watchSignals.length > 0) {
      for (const signal of watchSignals) {
        markdown += `- ${signal}\n`;
      }
      markdown += `\n`;
    }
    markdown += `> ${dailyClosing}\n\n`;

    if (secondaryItems && secondaryItems.length > 0) {
      markdown += `---\n\n## 更多 24h 资讯\n\n`;
      markdown += `> 以下条目进入了候选池，但没有进入今天的主深度解读区。\n\n`;

      const secondaryByCategory = new Map<string, typeof secondaryItems>();
      for (const item of secondaryItems) {
        const category = CATEGORIES.includes(item.category as (typeof CATEGORIES)[number])
          ? item.category
          : "social";
        if (!secondaryByCategory.has(category)) {
          secondaryByCategory.set(category, []);
        }
        secondaryByCategory.get(category)!.push(item);
      }

      for (const category of CATEGORIES) {
        const items = secondaryByCategory.get(category) ?? [];
        if (items.length === 0) continue;

        markdown += `#### ${CATEGORY_LABELS[category]}\n`;
        for (const item of items) {
          markdown += `- [${dayjs(item.publishedAt).format("HH:mm")}] [${item.title}](${item.url}) | *${item.source}*\n`;
        }
        markdown += `\n`;
      }
    }

    console.log(
      `[generate-daily] Rendered ${insights.length} items across ${activeCategories.length} categories`
    );

    return {
      dailyMarkdown: markdown,
      dailySummary: dailyOpening,
    };
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
