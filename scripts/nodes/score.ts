import type { PipelineStateType } from "../state.js";
import { callLLMJson } from "../lib/llm.js";
import { scoreSystemPrompt, scoreUserPrompt } from "../lib/prompts.js";
import type { ScoredNewsItem } from "../lib/types.js";

const BATCH_SIZE = 10;

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

      allScores.push(...results);
    }

    const scoreMap = new Map(allScores.map((s) => [s.id, s]));
    const scoredItems: ScoredNewsItem[] = passedItems
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
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, config.topN);

    console.log(
      `[score] Scored ${allScores.length} items, selected top ${scoredItems.length} (cutoff: ${scoredItems[scoredItems.length - 1]?.weightedScore ?? 0})`
    );

    return { scoredItems };
  } catch (err) {
    console.error("[score] Failed:", err);
    const fallback: ScoredNewsItem[] = passedItems.slice(0, config.topN).map((item) => ({
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
