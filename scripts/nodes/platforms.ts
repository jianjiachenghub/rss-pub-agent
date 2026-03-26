import type { PipelineStateType } from "../state.js";
import { callLLM } from "../lib/llm.js";
import {
  briefSystemPrompt,
  douyinSystemPrompt,
  xhsSystemPrompt,
} from "../lib/prompts.js";
import type { PlatformContents } from "../lib/types.js";

export async function platformsNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { insights, platformConfig, date, config } = state;
  if (!insights.length) {
    return { platformContents: {} };
  }

  const reportName = config?.reportName ?? "个人日报";
  const contents: PlatformContents = {};
  const insightsSummary = insights
    .map((insight) => `- ${insight.oneLiner}: ${insight.content}`)
    .join("\n");

  const tasks: Promise<void>[] = [];

  if (platformConfig?.xhs?.enabled) {
    tasks.push(
      callLLM({
        systemPrompt: xhsSystemPrompt(reportName),
        prompt: `今日精选（${date}）：\n\n${insightsSummary}`,
        model: "flash",
      })
        .then((response) => {
          contents.xhs = response.text;
        })
        .catch((err) => {
          console.warn("[platforms] XHS failed:", err);
        })
    );
  }

  if (platformConfig?.douyin?.enabled) {
    tasks.push(
      callLLM({
        systemPrompt: douyinSystemPrompt(reportName),
        prompt: `今日精选（${date}）：\n\n${insightsSummary}`,
        model: "flash",
      })
        .then((response) => {
          contents.douyin = response.text;
        })
        .catch((err) => {
          console.warn("[platforms] Douyin failed:", err);
        })
    );
  }

  tasks.push(
    callLLM({
      systemPrompt: briefSystemPrompt(reportName),
      prompt: `今日精选（${date}）：\n\n${insightsSummary}`,
      model: "flash",
    })
      .then((response) => {
        contents.brief = response.text;
      })
      .catch((err) => {
        console.warn("[platforms] Brief failed:", err);
      })
  );

  await Promise.all(tasks);
  console.log(`[platforms] Generated: ${Object.keys(contents).join(", ")}`);

  return { platformContents: contents };
}
