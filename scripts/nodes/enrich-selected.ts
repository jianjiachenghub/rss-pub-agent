import type { PipelineStateType } from "../state.js";
import { runWithConcurrency } from "../lib/feed-fetch.js";
import { writeRawJson } from "../lib/raw-output.js";
import { enrichNewsItem } from "../lib/source-enrichment.js";

const ENRICH_CONCURRENCY = 6;

export async function enrichSelectedNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { scoredItems, date } = state;
  if (!scoredItems.length) {
    return {};
  }

  try {
    const tasks = scoredItems.map((item, index) => async () => {
      console.log(
        `[enrichSelected] Enriching ${index + 1}/${scoredItems.length}: ${item.title}`
      );
      return await enrichNewsItem(item);
    });

    const enrichedItems = await runWithConcurrency(tasks, ENRICH_CONCURRENCY);

    if (date) {
      await writeRawJson(date, "enriched-candidates.json", enrichedItems);
    }

    const pageContentCount = enrichedItems.filter(
      (item) => item.contentSource === "page"
    ).length;
    const imageCount = enrichedItems.filter((item) => Boolean(item.imageUrl)).length;

    console.log(
      `[enrichSelected] Enriched ${enrichedItems.length} candidates, pageContent=${pageContentCount}, informativeImages=${imageCount}`
    );

    return { scoredItems: enrichedItems };
  } catch (err) {
    console.error("[enrichSelected] Failed:", err);
    return {
      errors: [
        {
          node: "enrichSelected",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
