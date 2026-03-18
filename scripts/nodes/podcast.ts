import type { PipelineStateType } from "../state.js";
import { callLLM } from "../lib/llm.js";
import { podcastSystemPrompt } from "../lib/prompts.js";
import { synthesizeSpeech } from "../lib/tts.js";
import { uploadToR2 } from "../lib/r2.js";

export async function podcastNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { insights, date, platformConfig } = state;

  if (!insights.length || !platformConfig?.podcast?.enabled) {
    return { podcast: { script: "" } };
  }

  try {
    const insightsSummary = insights
      .map(
        (i) =>
          `标题: ${i.oneLiner}\n为什么重要: ${i.whyItMatters}\n深度解读: ${i.deepDive}`
      )
      .join("\n\n---\n\n");

    const scriptResponse = await callLLM({
      systemPrompt: podcastSystemPrompt(),
      prompt: `请根据以下今日精选资讯生成播客脚本：\n\n${insightsSummary}`,
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
