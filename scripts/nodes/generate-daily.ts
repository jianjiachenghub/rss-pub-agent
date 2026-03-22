import type { PipelineStateType } from "../state.js";
import { callLLM } from "../lib/llm.js";
import { dailySummarySystemPrompt, CATEGORY_LABELS } from "../lib/prompts.js";
import dayjs from "dayjs";

// 领域排序（固定顺序）
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
      systemPrompt: dailySummarySystemPrompt(),
      prompt: `今日精选资讯：${insightsSummary}\n\n请用50-150字撰写今日综述，关键趋势词汇用 **加粗** 标注：`,
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
      // 映射旧分类到新分类
      let mappedCat = cat;
      if (cat === "cn_trending") mappedCat = "social";
      if (cat === "community") mappedCat = "tech";

      if (!byCategory.has(mappedCat)) {
        byCategory.set(mappedCat, []);
      }
      byCategory.get(mappedCat)!.push(insight);
    }

    const displayDate = dayjs(date).format("YYYY年MM月DD日");

    // ========== 构建 Markdown ==========

    // --- Frontmatter ---
    let md = `---
title: "AI 日报 | ${displayDate}"
date: "${date}"
itemCount: ${insights.length}
---

# 🗞️ AI 日报 | ${displayDate}

> ${dailySummary}

---

`;

    // --- 📊 今日概览表格 ---
    const activeCats = CATEGORY_ORDER.filter(
      (k) => (byCategory.get(k) || []).length > 0
    );

    if (activeCats.length > 0) {
      md += `## 📊 今日概览\n\n`;
      md += `| 领域 | 条数 | 最高分 | 头条 |\n`;
      md += `|:-----|:----:|:------:|:-----|\n`;

      for (const catKey of activeCats) {
        const items = byCategory.get(catKey) || [];
        const label = CATEGORY_LABELS[catKey] || catKey;
        const topItem = items.reduce((a, b) =>
          a.weightedScore >= b.weightedScore ? a : b
        );
        const maxScore = topItem.weightedScore;
        md += `| ${label} | ${items.length} | **${maxScore}分** | ${topItem.oneLiner} |\n`;
      }

      md += `\n---\n\n`;
    }

    // --- 各领域详情 ---
    for (const catKey of CATEGORY_ORDER) {
      const items = byCategory.get(catKey) || [];
      if (items.length === 0) continue;

      const categoryName = CATEGORY_LABELS[catKey] || catKey;
      md += `## ${categoryName}\n\n`;

      for (const item of items) {
        const scoreBar =
          "★".repeat(Math.round(item.weightedScore / 20)) +
          "☆".repeat(5 - Math.round(item.weightedScore / 20));

        // 标题
        md += `### 📌 ${item.oneLiner}\n\n`;

        // 评分 + 来源
        md += `> ${scoreBar} **${item.weightedScore}分** | 来源: [${item.source}](${item.url})\n\n`;

        // 配图（如果有）
        if (item.imageUrl) {
          md += `![${item.oneLiner}](${item.imageUrl})\n\n`;
        }

        // 核心信息
        md += `**🔍 为什么重要：** ${item.whyItMatters}\n\n`;
        md += `**👥 谁应该关注：** ${item.whoShouldCare.join("、")}\n\n`;
        md += `**🎯 行动建议：** ${item.actionableAdvice}\n\n`;

        // 对比表格（如果有）
        if (
          item.comparisonTable &&
          item.comparisonTable.headers &&
          item.comparisonTable.rows &&
          item.comparisonTable.rows.length > 0
        ) {
          md += `#### 📊 对比分析\n\n`;
          const headers = item.comparisonTable.headers;
          md += `| ${headers.join(" | ")} |\n`;
          md += `|${headers.map(() => ":---").join("|")}|\n`;
          for (const row of item.comparisonTable.rows) {
            md += `| ${row.join(" | ")} |\n`;
          }
          md += `\n`;
        }

        // 代码示例（如果有）
        if (item.codeSnippet && item.codeSnippet.code) {
          md += `#### 💻 代码示例\n\n`;
          md += `\`\`\`${item.codeSnippet.lang || ""}\n`;
          md += `${item.codeSnippet.code}\n`;
          md += `\`\`\`\n\n`;
        }

        // 深度解读
        md += `<details>\n<summary>📖 深度解读</summary>\n\n${item.deepDive}\n\n</details>\n\n`;

        md += `---\n\n`;
      }
    }

    // --- 📈 今日评分分布 ---
    const sortedAll = [...insights].sort(
      (a, b) => b.weightedScore - a.weightedScore
    );

    md += `## 📈 今日评分排行\n\n`;
    md += `| 排名 | 领域 | 新闻 | 评分 |\n`;
    md += `|:----:|:----:|:-----|:----:|\n`;

    sortedAll.forEach((item, idx) => {
      const catLabel = CATEGORY_LABELS[item.category] || item.category;
      md += `| ${idx + 1} | ${catLabel} | ${item.oneLiner} | **${item.weightedScore}** |\n`;
    });

    md += `\n`;

    console.log(
      `[generate-daily] Rendered ${insights.length} items across ${activeCats.length} categories`
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
