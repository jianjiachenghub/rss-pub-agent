import type { PipelineStateType } from "../state.js";
import { renderSoloPodcastScript } from "../lib/podcast-solo.js";

export async function podcastSoloNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  if (!state.platformConfig?.podcast?.enabled || !state.dailyMarkdown?.trim()) {
    return { podcastSoloScript: "" };
  }

  try {
    const podcastSoloScript = renderSoloPodcastScript(state.dailyMarkdown, {
      date: state.date,
      reportName: state.config?.reportName,
    });
    console.log(
      `[podcast-solo] Rendered complete daily report (${podcastSoloScript.length} chars)`
    );
    return { podcastSoloScript };
  } catch (error) {
    console.error("[podcast-solo] Failed:", error);
    return {
      podcastSoloScript: "",
      errors: [
        {
          node: "podcastSolo",
          message: (error as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
