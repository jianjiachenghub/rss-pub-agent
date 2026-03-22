import type { PipelineStateType } from "../state.js";
import { callLLMJson } from "../lib/llm.js";
import { insightSystemPrompt, insightUserPrompt } from "../lib/prompts.js";
import type { NewsInsight } from "../lib/types.js";

interface InsightResult {
  id: string;
  oneLiner: string;
  content: string;
  imageUrl?: string;
  codeSnippet?: { lang: string; code: string } | null;
  comparisonTable?: { headers: string[]; rows: string[][] } | null;
}

export async function insightNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { scoredItems } = state;
  if (!scoredItems.length) {
    return { insights: [] };
  }

  try {
    const batchInput = scoredItems.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      source: item.source,
      weightedScore: item.weightedScore,
    }));

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
    const insightMap = new Map(resultsArray.map((r) => [r.id, r]));
    const insights = scoredItems
      .map((item) => {
        const insight = insightMap.get(item.id);
        if (!insight) return null;
        const result: NewsInsight = {
          id: item.id,
          title: item.title,
          url: item.url,
          source: item.source,
          category: item.category,
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
