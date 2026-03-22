import type { PipelineStateType } from "../state.js";
import { callLLM } from "../lib/llm.js";
import {
  xhsSystemPrompt,
  douyinSystemPrompt,
  briefSystemPrompt,
} from "../lib/prompts.js";
import type { PlatformContents } from "../lib/types.js";

export async function platformsNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { insights, platformConfig, date } = state;
  if (!insights.length) {
    return { platformContents: {} };
  }

  const contents: PlatformContents = {};

  const insightsSummary = insights
    .map(
      (i) =>
        `- ${i.oneLiner}: ${i.content}`
    )
    .join("\n");

  const tasks: Promise<void>[] = [];

  if (platformConfig?.xhs?.enabled) {
    tasks.push(
      callLLM({
        systemPrompt: xhsSystemPrompt(),
        prompt: `今日精选（${date}）：\n\n${insightsSummary}`,
        model: "flash",
      })
        .then((res) => {
          contents.xhs = res.text;
        })
        .catch((err) => {
          console.warn("[platforms] XHS failed:", err);
        })
    );
  }

  if (platformConfig?.douyin?.enabled) {
    tasks.push(
      callLLM({
        systemPrompt: douyinSystemPrompt(),
        prompt: `今日精选（${date}）：\n\n${insightsSummary}`,
        model: "flash",
      })
        .then((res) => {
          contents.douyin = res.text;
        })
        .catch((err) => {
          console.warn("[platforms] Douyin failed:", err);
        })
    );
  }

  tasks.push(
    callLLM({
      systemPrompt: briefSystemPrompt(),
      prompt: `今日精选（${date}）：\n\n${insightsSummary}`,
      model: "flash",
    })
      .then((res) => {
        contents.brief = res.text;
      })
      .catch((err) => {
        console.warn("[platforms] Brief failed:", err);
      })
  );

  await Promise.all(tasks);
  console.log(`[platforms] Generated: ${Object.keys(contents).join(", ")}`);

  return { platformContents: contents };
}
