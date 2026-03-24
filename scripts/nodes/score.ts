import type { PipelineStateType } from "../state.js";
import { callLLMJson } from "../lib/llm.js";
import { scoreSystemPrompt, scoreUserPrompt } from "../lib/prompts.js";
import type { ScoredNewsItem } from "../lib/types.js";

const BATCH_SIZE = 10;

// 每个分类的最小配额
const CATEGORY_MIN_QUOTA: Record<string, number> = {
  ai: 3,
  tech: 2,
  software: 2,
  business: 2,
  investment: 2,
  politics: 2,
  social: 2,
};

// 每个分类的最大数量
const CATEGORY_MAX_LIMIT: Record<string, number> = {
  ai: 12,
  tech: 6,
  software: 6,
  business: 6,
  investment: 6,
  politics: 6,
  social: 6,
};

// 总目标新闻数 (深度解读的)
const TARGET_TOTAL_ITEMS = 30;

interface ScoreResult {
  id: string;
  scores: {
    novelty: number;
    utility: number;
    impact: number;
    credibility: number;
    timeliness: number;
    uniqueness: number;
  };
  weightedScore: number;
  scoreReasoning: string;
}

export async function scoreNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { passedItems, config } = state;
  if (!passedItems.length || !config) {
    return { scoredItems: [] };
  }

  try {
    const allScores: ScoreResult[] = [];

    for (let i = 0; i < passedItems.length; i += BATCH_SIZE) {
      const batch = passedItems.slice(i, i + BATCH_SIZE);
      const batchInput = batch.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        source: item.source,
      }));

      console.log(`[score] Scoring batch ${i / BATCH_SIZE + 1} (${batch.length} items)...`);

      const results = await callLLMJson<ScoreResult[]>({
        systemPrompt: scoreSystemPrompt(config.interests),
        prompt: scoreUserPrompt(batchInput),
        model: "flash",
        jsonSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              scores: {
                type: "OBJECT",
                properties: {
                  novelty: { type: "NUMBER" },
                  utility: { type: "NUMBER" },
                  impact: { type: "NUMBER" },
                  credibility: { type: "NUMBER" },
                  timeliness: { type: "NUMBER" },
                  uniqueness: { type: "NUMBER" },
                },
                required: ["novelty", "utility", "impact", "credibility", "timeliness", "uniqueness"],
              },
              weightedScore: { type: "NUMBER" },
              scoreReasoning: { type: "STRING" },
            },
            required: ["id", "scores", "weightedScore", "scoreReasoning"],
          },
        },
      });

      // Ensure results is an array - handle both direct array and wrapped object
      let resultsArray: ScoreResult[] = [];
      if (Array.isArray(results)) {
        resultsArray = results;
      } else if (typeof results === 'object' && results !== null) {
        const values = Object.values(results);
        const arrayValue = values.find((v) => Array.isArray(v));
        if (arrayValue) {
          resultsArray = arrayValue as ScoreResult[];
        }
      }
      if (!Array.isArray(results)) {
        console.warn(`[score] Expected array but got ${typeof results}, attempting extraction`);
      }
      allScores.push(...resultsArray);
    }

    const scoreMap = new Map(allScores.map((s) => [s.id, s]));
    
    // 先给所有新闻打分
    const allScoredItems: ScoredNewsItem[] = passedItems
      .map((item) => {
        const score = scoreMap.get(item.id);
        if (!score) return null;
        return {
          ...item,
          scores: score.scores,
          weightedScore: score.weightedScore,
          scoreReasoning: score.scoreReasoning,
        };
      })
      .filter((x): x is ScoredNewsItem => x !== null)
      .sort((a, b) => b.weightedScore - a.weightedScore);

    // 按分类分组
    const byCategory = new Map<string, ScoredNewsItem[]>();
    for (const item of allScoredItems) {
      const cat = item.category || "social";
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push(item);
    }

    // 分类配额选择
    const selectedItems: ScoredNewsItem[] = [];
    const categoryCounts = new Map<string, number>();

    // 第一轮：确保每个分类达到最小配额
    for (const [cat, minQuota] of Object.entries(CATEGORY_MIN_QUOTA)) {
      const catItems = byCategory.get(cat) || [];
      const selected = catItems.slice(0, minQuota);
      selectedItems.push(...selected);
      categoryCounts.set(cat, selected.length);
      console.log(`[score] Category ${cat}: selected ${selected.length}/${catItems.length} (min quota: ${minQuota})`);
    }

    // 第二轮：按分数补充，直到达到目标总数
    const remainingItems = allScoredItems.filter(
      (item) => !selectedItems.some((s) => s.id === item.id)
    );

    for (const item of remainingItems) {
      if (selectedItems.length >= TARGET_TOTAL_ITEMS) break;
      
      const cat = item.category || "social";
      const currentCount = categoryCounts.get(cat) || 0;
      const maxLimit = CATEGORY_MAX_LIMIT[cat] || 5;
      
      if (currentCount < maxLimit) {
        selectedItems.push(item);
        categoryCounts.set(cat, currentCount + 1);
      }
    }

    // 最终排序
    selectedItems.sort((a, b) => b.weightedScore - a.weightedScore);

    // 筛选出“备选/参考”新闻：不在 selectedItems 中，但分数还可以 (>30) 的。
    const secondaryItems = allScoredItems
      .filter((item) => !selectedItems.some((s) => s.id === item.id))
      .filter((item) => item.weightedScore >= 35) // 只要不是太烂的（噪声）都放进列表
      .slice(0, 50); // 最多再放 50 条

    console.log(
      `[score] Scored ${allScores.length} items, selected ${selectedItems.length} for insights, ${secondaryItems.length} for secondary list`
    );
    console.log(`[score] Category distribution:`, Object.fromEntries(categoryCounts));

    return { 
      scoredItems: selectedItems,
      secondaryItems: secondaryItems 
    };
  } catch (err) {
    console.error("[score] Failed:", err);
    const fallback: ScoredNewsItem[] = passedItems.slice(0, TARGET_TOTAL_ITEMS).map((item) => ({
      ...item,
      scores: { novelty: 5, utility: 5, impact: 5, credibility: 5, timeliness: 5, uniqueness: 5 },
      weightedScore: 50,
      scoreReasoning: "Scoring failed, using default",
    }));
    return {
      scoredItems: fallback,
      errors: [{ node: "score", message: (err as Error).message, timestamp: new Date().toISOString() }],
    };
  }
}
