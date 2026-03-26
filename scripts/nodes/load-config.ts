import { readFile } from "fs/promises";
import { join } from "path";
import type { PipelineStateType } from "../state.js";
import type {
  EditorialStrategyConfig,
  PipelineConfig,
  PlatformConfig,
} from "../lib/types.js";
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

function resolveEditorialConfig(prompt: Record<string, any>): EditorialStrategyConfig {
  const editorial = prompt.editorial ?? {};

  return {
    positioning:
      editorial.positioning ?? "personal-multi-category-daily",
    dailyObjective:
      editorial.dailyObjective ??
      "提炼过去 24 小时最有价值、最能帮助判断未来形势的信息。",
    baseCategoryWeights: {
      ai: 1,
      investment: 0.95,
      tech: 0.75,
      software: 0.7,
      business: 0.6,
      politics: 0.55,
      social: 0.25,
      ...(editorial.baseCategoryWeights ?? {}),
    },
    minimumCategoryCoverage: {
      ai: 3,
      investment: 3,
      tech: 2,
      software: 2,
      business: 1,
      politics: 1,
      social: 0,
      ...(editorial.minimumCategoryCoverage ?? {}),
    },
    scoringWeights: {
      signalStrength: 0.24,
      futureImpact: 0.23,
      personalRelevance: 0.18,
      decisionUsefulness: 0.17,
      credibility: 0.12,
      timeliness: 0.06,
      ...(editorial.scoringWeights ?? {}),
    },
    mustWatchThemes: editorial.mustWatchThemes ?? [],
    selectionPrinciples: editorial.selectionPrinciples ?? [],
  };
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
    const prompt = JSON.parse(promptRaw) as Record<string, any>;
    const platforms = resolveEnvVars(JSON.parse(platformsRaw)) as PlatformConfig;
    const editorial = resolveEditorialConfig(prompt);

    const config: PipelineConfig = {
      feeds: feeds.feeds,
      interests: prompt.interests,
      topN: prompt.topN ?? 10,
      language: prompt.language ?? "zh",
      outputStyle: prompt.outputStyle ?? "professional",
      reportName: prompt.reportName ?? "个人日报",
      editorial,
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
