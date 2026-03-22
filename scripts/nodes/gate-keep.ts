import type { PipelineStateType } from "../state.js";
import { callLLMJson } from "../lib/llm.js";
import { gateKeepSystemPrompt, gateKeepUserPrompt } from "../lib/prompts.js";
import type { GateKeepResult, RawNewsItem } from "../lib/types.js";

const BATCH_SIZE = 20;

export async function gateKeepNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { rawItems } = state;
  if (!rawItems.length) {
    return { passedItems: [], gateKeepResults: [] };
  }

  try {
    const allResults: GateKeepResult[] = [];

    for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
      const batch = rawItems.slice(i, i + BATCH_SIZE);
      const batchInput = batch.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        source: item.source,
      }));

      const results = await callLLMJson<GateKeepResult[]>({
        systemPrompt: gateKeepSystemPrompt(),
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

      // Ensure results is an array - handle both direct array and wrapped object
      let resultsArray: GateKeepResult[] = [];
      if (Array.isArray(results)) {
        resultsArray = results;
      } else if (typeof results === 'object' && results !== null) {
        // Try to extract array from object (e.g., { results: [...] } or { items: [...] })
        const values = Object.values(results);
        const arrayValue = values.find((v) => Array.isArray(v));
        if (arrayValue) {
          resultsArray = arrayValue as GateKeepResult[];
        } else {
          console.warn(`[gate-keep] Could not find array in object, keys: ${Object.keys(results).join(', ')}`);
        }
      }
      if (!Array.isArray(results)) {
        console.warn(`[gate-keep] Expected array but got ${typeof results}, attempting extraction`);
      }
      allResults.push(...resultsArray);
    }

    const passIds = new Set(
      allResults.filter((r) => r.action === "PASS").map((r) => r.id)
    );
    for (const r of allResults) {
      if (r.action === "MERGE" && r.mergeWith) {
        passIds.add(r.mergeWith);
      }
    }

    const passedItems = rawItems.filter((item) => passIds.has(item.id));
    const dropCount = rawItems.length - passedItems.length;

    console.log(
      `[gate-keep] ${rawItems.length} → ${passedItems.length} items (dropped ${dropCount}, ${Math.round((dropCount / rawItems.length) * 100)}% noise)`
    );

    return { passedItems, gateKeepResults: allResults };
  } catch (err) {
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
