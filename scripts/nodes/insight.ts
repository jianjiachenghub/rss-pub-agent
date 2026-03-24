import type { PipelineStateType } from "../state.js";
import { callLLMJson } from "../lib/llm.js";
import { insightSystemPrompt, insightUserPrompt, categorySystemPrompt, categoryUserPrompt, CATEGORIES } from "../lib/prompts.js";
import type { NewsInsight } from "../lib/types.js";

interface InsightResult {
  id: string;
  oneLiner: string;
  content: string;
  imageUrl?: string;
  codeSnippet?: { lang: string; code: string } | null;
  comparisonTable?: { headers: string[]; rows: string[][] } | null;
}

interface CategoryResult {
  id: string;
  category: string;
  confidence: number;
  reason: string;
}

export async function insightNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { scoredItems } = state;
  if (!scoredItems.length) {
    return { insights: [] };
  }

  try {
    // Step 1: 生成洞察内容
    const batchInput = scoredItems.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      source: item.source,
      weightedScore: item.weightedScore,
    }));

    console.log(`[insight] Generating insights for ${batchInput.length} items...`);

    const results = await callLLMJson<InsightResult[]>({
      systemPrompt: insightSystemPrompt(),
      prompt: insightUserPrompt(batchInput),
      model: "pro",
      jsonSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            oneLiner: { type: "STRING" },
            content: { type: "STRING" },
            imageUrl: { type: "STRING" },
            codeSnippet: {
              type: "OBJECT",
              properties: {
                lang: { type: "STRING" },
                code: { type: "STRING" },
              },
            },
            comparisonTable: {
              type: "OBJECT",
              properties: {
                headers: { type: "ARRAY", items: { type: "STRING" } },
                rows: { type: "ARRAY", items: { type: "ARRAY", items: { type: "STRING" } } },
              },
            },
          },
          required: ["id", "oneLiner", "content"],
        },
      },
    });

    // Ensure results is an array - handle both direct array and wrapped object
    let resultsArray: InsightResult[] = [];
    if (Array.isArray(results)) {
      resultsArray = results;
    } else if (typeof results === 'object' && results !== null) {
      const values = Object.values(results);
      const arrayValue = values.find((v) => Array.isArray(v));
      if (arrayValue) {
        resultsArray = arrayValue as InsightResult[];
      }
    }
    if (!Array.isArray(results)) {
      console.warn(`[insight] Expected array but got ${typeof results}, attempting extraction`);
    }

    // Step 2: 自动分类
    const categoryInput = scoredItems.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      source: item.source,
    }));

    const categoryResults = await callLLMJson<CategoryResult[]>({
      systemPrompt: categorySystemPrompt(),
      prompt: categoryUserPrompt(categoryInput),
      model: "flash",
      jsonSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            category: { type: "STRING", enum: CATEGORIES },
            confidence: { type: "NUMBER" },
            reason: { type: "STRING" },
          },
          required: ["id", "category", "confidence", "reason"],
        },
      },
    });

    // Ensure category results is an array
    let categoryArray: CategoryResult[] = [];
    if (Array.isArray(categoryResults)) {
      categoryArray = categoryResults;
    } else if (typeof categoryResults === 'object' && categoryResults !== null) {
      const values = Object.values(categoryResults);
      const arrayValue = values.find((v) => Array.isArray(v));
      if (arrayValue) {
        categoryArray = arrayValue as CategoryResult[];
      }
    }

    const insightMap = new Map(resultsArray.map((r) => [r.id, r]));
    const categoryMap = new Map(categoryArray.map((c) => [c.id, c]));

    const insights = scoredItems
      .map((item) => {
        const insight = insightMap.get(item.id);
        const categoryResult = categoryMap.get(item.id);
        if (!insight) return null;

        // 使用 AI 自动分类的结果，如果没有则使用原始分类
        const finalCategory = categoryResult?.category || item.category;

        if (categoryResult) {
          console.log(`[insight] Item "${item.title.substring(0, 40)}..." classified as "${finalCategory}" (${categoryResult.reason}, confidence: ${categoryResult.confidence})`);
        }

        const result: NewsInsight = {
          id: item.id,
          title: item.title,
          url: item.url,
          source: item.source,
          category: finalCategory,
          publishedAt: item.publishedAt,
          oneLiner: insight.oneLiner,
          content: insight.content,
          imageUrl: insight.imageUrl || undefined,
          codeSnippet: insight.codeSnippet ?? undefined,
          comparisonTable: insight.comparisonTable ?? undefined,
          scores: item.scores,
          weightedScore: item.weightedScore,
        };
        return result;
      })
      .filter((x): x is NewsInsight => x !== null);

    // 统计各分类的数量
    const categoryCounts = new Map<string, number>();
    for (const insight of insights) {
      const count = categoryCounts.get(insight.category) || 0;
      categoryCounts.set(insight.category, count + 1);
    }
    console.log(`[insight] Category distribution:`, Object.fromEntries(categoryCounts));

    console.log(`[insight] Generated ${insights.length} structured insights`);
    return { insights };
  } catch (err) {
    console.error("[insight] Failed:", err);
    return {
      insights: [],
      errors: [{ node: "insight", message: (err as Error).message, timestamp: new Date().toISOString() }],
    };
  }
}
