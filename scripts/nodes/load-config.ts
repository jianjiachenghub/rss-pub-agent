import { readFile } from "fs/promises";
import { join } from "path";
import type { PipelineStateType } from "../state.js";
import type { PipelineConfig, PlatformConfig } from "../lib/types.js";
import { CONFIGS_DIR } from "../lib/runtime-paths.js";
import dayjs from "dayjs";

function resolveEnvVars(obj: unknown): unknown {
  if (typeof obj === "string") {
    return obj.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] ?? "");
  }
  if (Array.isArray(obj)) return obj.map(resolveEnvVars);
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = resolveEnvVars(v);
    }
    return result;
  }
  return obj;
}

export async function loadConfig(
  _state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  try {
    // Runtime config still lives in repo-level JSON so product tuning does not require code edits.
    const feedsRaw = await readFile(join(CONFIGS_DIR, "feeds.json"), "utf-8");
    const promptRaw = await readFile(join(CONFIGS_DIR, "prompt.json"), "utf-8");
    const platformsRaw = await readFile(join(CONFIGS_DIR, "platforms.json"), "utf-8");

    const feeds = JSON.parse(feedsRaw);
    const prompt = JSON.parse(promptRaw);
    const platforms = resolveEnvVars(JSON.parse(platformsRaw)) as PlatformConfig;

    const config: PipelineConfig = {
      feeds: feeds.feeds,
      interests: prompt.interests,
      topN: prompt.topN ?? 10,
      language: prompt.language ?? "zh",
      outputStyle: prompt.outputStyle ?? "professional",
    };

    return {
      config,
      platformConfig: platforms,
      date: dayjs().format("YYYY-MM-DD"),
    };
  } catch (err) {
    return {
      errors: [
        {
          node: "loadConfig",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
