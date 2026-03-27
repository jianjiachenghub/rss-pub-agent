import type { PipelineStateType } from "../state.js";
import { callLLMJson } from "../lib/llm.js";
import {
  CATEGORIES,
  categorySystemPrompt,
  categoryUserPrompt,
  insightSystemPrompt,
  insightUserPrompt,
} from "../lib/prompts.js";
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

function extractArrayResults<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value === "object" && value !== null) {
    const arrayValue = Object.values(value).find((item) => Array.isArray(item));
    if (arrayValue) {
      return arrayValue as T[];
    }
  }

  return [];
}

function buildFallbackInsight(
  item: PipelineStateType["scoredItems"][number]
): NewsInsight {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    source: item.source,
    category: item.category,
    publishedAt: item.publishedAt,
    oneLiner: item.title.slice(0, 28),
    content:
      `这条新闻入选今日日报，核心原因是：${item.scoreReasoning}。` +
      `它主要影响 ${item.category} 这条观察线，后续值得继续跟踪新增信息和落地进展。`,
    scores: item.scores,
    weightedScore: item.weightedScore,
  };
}

function buildFallbackInsights(state: PipelineStateType): NewsInsight[] {
  return state.scoredItems.map((item) => buildFallbackInsight(item));
}

export async function insightNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { scoredItems, editorialAgenda } = state;
  if (!scoredItems.length) {
    return { insights: [] };
  }

  try {
    const batchInput = scoredItems.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      source: item.source,
      category: item.category,
      weightedScore: item.weightedScore,
    }));

    console.log(`[insight] Generating insights for ${batchInput.length} items...`);

    const results = await callLLMJson<InsightResult[]>({
      systemPrompt: insightSystemPrompt(editorialAgenda),
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
                rows: {
                  type: "ARRAY",
                  items: { type: "ARRAY", items: { type: "STRING" } },
                },
              },
            },
          },
          required: ["id", "oneLiner", "content"],
        },
      },
    });

    const resultsArray = extractArrayResults<InsightResult>(results);
    if (!Array.isArray(results)) {
      console.warn(
        `[insight] Expected array but got ${typeof results}, attempting extraction`
      );
    }

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

    const categoryArray = extractArrayResults<CategoryResult>(categoryResults);

    const insightMap = new Map(resultsArray.map((result) => [result.id, result]));
    const categoryMap = new Map(categoryArray.map((result) => [result.id, result]));

    const insights = scoredItems.map((item) => {
      const insight = insightMap.get(item.id);
      const categoryResult = categoryMap.get(item.id);
      if (!insight) {
        return buildFallbackInsight(item);
      }

      return {
        id: item.id,
        title: item.title,
        url: item.url,
        source: item.source,
        category: categoryResult?.category || item.category,
        publishedAt: item.publishedAt,
        oneLiner: insight.oneLiner,
        content: insight.content,
        imageUrl: insight.imageUrl || undefined,
        codeSnippet: insight.codeSnippet ?? undefined,
        comparisonTable: insight.comparisonTable ?? undefined,
        scores: item.scores,
        weightedScore: item.weightedScore,
      } satisfies NewsInsight;
    });

    const categoryCounts = new Map<string, number>();
    for (const insight of insights) {
      categoryCounts.set(
        insight.category,
        (categoryCounts.get(insight.category) ?? 0) + 1
      );
    }

    console.log("[insight] Category distribution:", Object.fromEntries(categoryCounts));
    console.log(`[insight] Generated ${insights.length} structured insights`);

    return { insights };
  } catch (err) {
    console.error("[insight] Failed:", err);
    return {
      insights: buildFallbackInsights(state),
      errors: [
        {
          node: "insight",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
