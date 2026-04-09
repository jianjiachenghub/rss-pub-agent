import type { PipelineStateType } from "../state.js";
import { buildFallbackGateKeep } from "../lib/editorial-fallback.js";
import { callLLMJson, isContentSafetyError } from "../lib/llm.js";
import { forumAwareGateKeepSystemPrompt } from "../lib/forum-aware-prompts.js";
import { gateKeepUserPrompt } from "../lib/prompts.js";
import type { GateKeepResult } from "../lib/types.js";

const BATCH_SIZE = 20;

export async function gateKeepNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { rawItems, config, editorialAgenda } = state;
  if (!rawItems.length || !config) {
    return { passedItems: [], gateKeepResults: [] };
  }

  try {
    const batches: typeof rawItems[] = [];
    for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
      batches.push(rawItems.slice(i, i + BATCH_SIZE));
    }

    const batchResults = await Promise.all(
      batches.map(async (batch, index) => {
        console.log(
          `[gate-keep] Reviewing batch ${index + 1}/${batches.length} (${batch.length} items)...`
        );

        const batchInput = batch.map((item) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          source: item.source,
          category: item.category,
          publishedAt: item.publishedAt,
        }));

        const results = await callLLMJson<GateKeepResult[]>({
          systemPrompt: forumAwareGateKeepSystemPrompt(
            config.editorial,
            editorialAgenda
          ),
          prompt: gateKeepUserPrompt(batchInput),
          model: "flash",
          jsonSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                action: { type: "STRING", enum: ["PASS", "DROP", "MERGE"] },
                mergeWith: { type: "STRING" },
                reason: { type: "STRING" },
              },
              required: ["id", "action", "reason"],
            },
          },
        });

        let resultsArray: GateKeepResult[] = [];
        if (Array.isArray(results)) {
          resultsArray = results;
        } else if (typeof results === "object" && results !== null) {
          const values = Object.values(results);
          const arrayValue = values.find((value) => Array.isArray(value));
          if (arrayValue) {
            resultsArray = arrayValue as GateKeepResult[];
          } else {
            console.warn(
              `[gate-keep] Could not find array in object, keys: ${Object.keys(results).join(", ")}`
            );
          }
        }

        if (!Array.isArray(results)) {
          console.warn(
            `[gate-keep] Expected array but got ${typeof results}, attempting extraction`
          );
        }

        return resultsArray;
      })
    );

    const allResults = batchResults.flat();

    const passIds = new Set(
      allResults.filter((result) => result.action === "PASS").map((result) => result.id)
    );

    for (const result of allResults) {
      if (result.action === "MERGE" && result.mergeWith) {
        passIds.add(result.mergeWith);
      }
    }

    const passedItems = rawItems.filter((item) => passIds.has(item.id));
    const dropCount = rawItems.length - passedItems.length;

    console.log(
      `[gate-keep] ${rawItems.length} -> ${passedItems.length} items (dropped ${dropCount}, ${Math.round((dropCount / rawItems.length) * 100)}% noise)`
    );

    return { passedItems, gateKeepResults: allResults };
  } catch (err) {
    if (config && isContentSafetyError(err)) {
      // When the provider blocks on moderation, keep the pipeline moving with a
      // deterministic filter instead of passing the whole pool straight through.
      const fallback = buildFallbackGateKeep(rawItems, config, editorialAgenda);
      console.warn(
        `[gate-keep] Content safety blocked LLM review, using heuristic fallback for ${fallback.passedItems.length}/${rawItems.length} items`
      );
      return {
        ...fallback,
        errors: [
          {
            node: "gateKeep",
            message: (err as Error).message,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }

    console.error("[gate-keep] Failed, passing all items through:", err);
    return {
      passedItems: rawItems,
      gateKeepResults: [],
      errors: [
        {
          node: "gateKeep",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
