import type { PipelineStateType } from "../state.js";
import { callLLM } from "../lib/llm.js";
import { uploadToR2 } from "../lib/r2.js";
import { podcastSystemPrompt } from "../lib/prompts.js";
import { synthesizeSpeech } from "../lib/tts.js";

export async function podcastNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { insights, date, platformConfig, config } = state;

  if (!insights.length || !platformConfig?.podcast?.enabled) {
    return { podcast: { script: "" } };
  }

  try {
    const reportName = config?.reportName ?? "个人日报";
    const insightsSummary = insights
      .map(
        (insight) =>
          `标题: ${insight.oneLiner}\n具体内容: ${insight.content}`
      )
      .join("\n\n---\n\n");

    const scriptResponse = await callLLM({
      systemPrompt: podcastSystemPrompt(reportName),
      prompt: `请根据以下今日精选生成播客脚本：\n\n${insightsSummary}`,
      model: "pro",
    });

    const script = scriptResponse.text;
    console.log(`[podcast] Generated script (${script.length} chars)`);

    let audioUrl = "";
    try {
      const voices = platformConfig.podcast.voices ?? ["Kore", "Puck"];
      const audioBuffer = await synthesizeSpeech(script, voices);
      audioUrl = await uploadToR2(
        audioBuffer,
        `podcast/${date}.mp3`,
        "audio/mpeg"
      );
      console.log(`[podcast] Audio uploaded: ${audioUrl}`);
    } catch (ttsErr) {
      console.warn(
        "[podcast] TTS/upload failed, script still available:",
        (ttsErr as Error).message
      );
    }

    return { podcast: { script, audioUrl } };
  } catch (err) {
    console.error("[podcast] Failed:", err);
    return {
      podcast: { script: "" },
      errors: [
        {
          node: "podcast",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
