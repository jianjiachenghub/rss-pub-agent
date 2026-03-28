import type { PipelineStateType } from "../state.js";
import { buildFallbackScores } from "../lib/editorial-fallback.js";
import { callLLMJson, isContentSafetyError } from "../lib/llm.js";
import { CATEGORIES, scoreSystemPrompt, scoreUserPrompt } from "../lib/prompts.js";
import type {
  EditorialStrategyConfig,
  NewsCategory,
  ScoredNewsItem,
  ScoringDimensions,
} from "../lib/types.js";

const BATCH_SIZE = 10;
const SECONDARY_SCORE_THRESHOLD = 45;

function getCandidatePoolLimit(baselineTopN: number): number {
  const baseline = Math.max(16, baselineTopN);
  return Math.min(Math.max(baseline * 2, baseline + 12), baseline + 18);
}

interface ScoreResult {
  id: string;
  scores: ScoringDimensions;
  scoreReasoning: string;
}

function computeBaseScore(
  scores: ScoringDimensions,
  weights: EditorialStrategyConfig["scoringWeights"]
): number {
  return Math.round(
    (scores.signalStrength * weights.signalStrength +
      scores.futureImpact * weights.futureImpact +
      scores.personalRelevance * weights.personalRelevance +
      scores.decisionUsefulness * weights.decisionUsefulness +
      scores.credibility * weights.credibility +
      scores.timeliness * weights.timeliness) * 10
  );
}

function getCategoryBonus(
  category: string,
  state: PipelineStateType
): number {
  const strategy = state.config?.editorial;
  if (!strategy) return 0;

  const baseWeight = strategy.baseCategoryWeights[category as NewsCategory] ?? 0.5;
  const dailyBoost = state.editorialAgenda.categoryBoosts[category as NewsCategory] ?? 0;

  return Math.round((baseWeight - 0.5) * 18 + dailyBoost * 15);
}

function buildCategoryCaps(state: PipelineStateType): Record<NewsCategory, number> {
  const topN = state.config?.topN ?? 18;
  const strategy = state.config?.editorial;
  const effectiveWeights = CATEGORIES.reduce((acc, category) => {
    const baseWeight = strategy?.baseCategoryWeights[category] ?? 0.5;
    const dailyBoost = state.editorialAgenda.categoryBoosts[category] ?? 0;
    acc[category] = Math.max(0.05, baseWeight + dailyBoost);
    return acc;
  }, {} as Record<NewsCategory, number>);

  const totalWeight = Object.values(effectiveWeights).reduce(
    (sum, value) => sum + value,
    0
  );

  return CATEGORIES.reduce((acc, category) => {
    const minimum = strategy?.minimumCategoryCoverage[category] ?? 0;
    const target = Math.round((effectiveWeights[category] / totalWeight) * topN);
    acc[category] = Math.max(minimum, target + 1);
    return acc;
  }, {} as Record<NewsCategory, number>);
}

function normalizeCategory(category: string): NewsCategory {
  return CATEGORIES.includes(category as NewsCategory)
    ? (category as NewsCategory)
    : "social";
}

export async function scoreNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { passedItems, config, editorialAgenda } = state;
  if (!passedItems.length || !config) {
    return { scoredItems: [] };
  }

  try {
    const batches: typeof passedItems[] = [];
    for (let i = 0; i < passedItems.length; i += BATCH_SIZE) {
      batches.push(passedItems.slice(i, i + BATCH_SIZE));
    }

    const batchResults = await Promise.all(
      batches.map(async (batch, index) => {
        const batchInput = batch.map((item) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          source: item.source,
          category: item.category,
          publishedAt: item.publishedAt,
        }));

        console.log(
          `[score] Scoring batch ${index + 1}/${batches.length} (${batch.length} items)...`
        );

        const results = await callLLMJson<ScoreResult[]>({
          systemPrompt: scoreSystemPrompt(
            config.interests,
            config.editorial,
            editorialAgenda
          ),
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
                    signalStrength: { type: "NUMBER" },
                    futureImpact: { type: "NUMBER" },
                    personalRelevance: { type: "NUMBER" },
                    decisionUsefulness: { type: "NUMBER" },
                    credibility: { type: "NUMBER" },
                    timeliness: { type: "NUMBER" },
                  },
                  required: [
                    "signalStrength",
                    "futureImpact",
                    "personalRelevance",
                    "decisionUsefulness",
                    "credibility",
                    "timeliness",
                  ],
                },
                scoreReasoning: { type: "STRING" },
              },
              required: ["id", "scores", "scoreReasoning"],
            },
          },
        });

        let resultsArray: ScoreResult[] = [];
        if (Array.isArray(results)) {
          resultsArray = results;
        } else if (typeof results === "object" && results !== null) {
          const values = Object.values(results);
          const arrayValue = values.find((value) => Array.isArray(value));
          if (arrayValue) {
            resultsArray = arrayValue as ScoreResult[];
          }
        }

        if (!Array.isArray(results)) {
          console.warn(`[score] Expected array but got ${typeof results}, attempting extraction`);
        }

        return resultsArray;
      })
    );

    const allScores = batchResults.flat();

    const scoreMap = new Map(allScores.map((score) => [score.id, score]));
    const mustCoverIds = new Set(editorialAgenda.mustCoverIds ?? []);
    const allScoredItems: ScoredNewsItem[] = passedItems
      .map((item) => {
        const score = scoreMap.get(item.id);
        if (!score) return null;

        const baseScore = computeBaseScore(score.scores, config.editorial.scoringWeights);
        const categoryBonus = getCategoryBonus(item.category, state);
        const mustCoverBonus = mustCoverIds.has(item.id) ? 8 : 0;
        const weightedScore = Math.max(
          0,
          Math.min(100, baseScore + categoryBonus + mustCoverBonus)
        );

        return {
          ...item,
          scores: score.scores,
          weightedScore,
          scoreReasoning: score.scoreReasoning,
        };
      })
      .filter((item): item is ScoredNewsItem => item !== null)
      .sort((a, b) => b.weightedScore - a.weightedScore);

    const candidatePoolLimit = Math.min(
      allScoredItems.length,
      getCandidatePoolLimit(config.topN)
    );
    const minimumCoverage = config.editorial.minimumCategoryCoverage;
    const categoryCaps = buildCategoryCaps(state);
    const byCategory = new Map<NewsCategory, ScoredNewsItem[]>();

    for (const item of allScoredItems) {
      const category = normalizeCategory(item.category);
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(item);
    }

    const selectedItems: ScoredNewsItem[] = [];
    const selectedIds = new Set<string>();
    const categoryCounts = new Map<NewsCategory, number>();

    // Keep baseline category coverage so the report remains multi-category even on AI-heavy days.
    for (const category of CATEGORIES) {
      const minimum = minimumCoverage[category] ?? 0;
      const candidates = byCategory.get(category) ?? [];
      for (const item of candidates.slice(0, minimum)) {
        if (selectedItems.length >= candidatePoolLimit || selectedIds.has(item.id)) break;
        selectedItems.push(item);
        selectedIds.add(item.id);
        categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      }
    }

    for (const item of allScoredItems) {
      if (selectedItems.length >= candidatePoolLimit || selectedIds.has(item.id)) continue;
      const category = normalizeCategory(item.category);
      const currentCount = categoryCounts.get(category) ?? 0;
      const cap = categoryCaps[category];

      if (currentCount < cap) {
        selectedItems.push(item);
        selectedIds.add(item.id);
        categoryCounts.set(category, currentCount + 1);
      }
    }

    for (const item of allScoredItems) {
      if (selectedItems.length >= candidatePoolLimit || selectedIds.has(item.id)) continue;
      selectedItems.push(item);
      selectedIds.add(item.id);
      const category = normalizeCategory(item.category);
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }

    selectedItems.sort((a, b) => b.weightedScore - a.weightedScore);

    const secondaryItems = allScoredItems
      .filter((item) => !selectedIds.has(item.id))
      .filter((item) => item.weightedScore >= SECONDARY_SCORE_THRESHOLD)
      .slice(0, 60);

    console.log(
      `[score] Scored ${allScores.length} items, selected ${selectedItems.length} enriched candidates, ${secondaryItems.length} secondary items`
    );
    console.log("[score] Category caps:", categoryCaps);
    console.log("[score] Category distribution:", Object.fromEntries(categoryCounts));

    return {
      scoredItems: selectedItems,
      secondaryItems,
    };
  } catch (err) {
    if (config && isContentSafetyError(err)) {
      // Reuse the same editorial weights/caps locally so a moderation block does
      // not collapse selection quality or category balance for the daily report.
      const fallback = buildFallbackScores(passedItems, config, editorialAgenda);
      console.warn(
        `[score] Content safety blocked LLM scoring, using heuristic fallback for ${fallback.selectedItems.length} selected and ${fallback.secondaryItems.length} secondary items`
      );
      return {
        scoredItems: fallback.selectedItems,
        secondaryItems: fallback.secondaryItems,
        errors: [
          {
            node: "score",
            message: (err as Error).message,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }

    console.error("[score] Failed:", err);
    const fallback: ScoredNewsItem[] = passedItems
      .slice(0, config.topN)
      .map((item) => ({
        ...item,
        scores: {
          signalStrength: 5,
          futureImpact: 5,
          personalRelevance: 5,
          decisionUsefulness: 5,
          credibility: 5,
          timeliness: 5,
        },
        weightedScore: 50,
        scoreReasoning: "Scoring failed, using default values.",
      }));

    return {
      scoredItems: fallback,
      errors: [
        {
          node: "score",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
