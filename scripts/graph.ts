import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveEnvPath(): string | undefined {
  // Support both source execution (`scripts/graph.ts`) and compiled execution (`scripts/dist/graph.js`).
  const candidates = [
    resolve(__dirname, "../.env"),
    resolve(__dirname, "../../.env"),
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

const envPath = resolveEnvPath();
if (envPath) {
  config({ path: envPath });
} else {
  // Fall back to dotenv's default lookup when no repo-level .env is found.
  config();
}

import { StateGraph, START, END } from "@langchain/langgraph";
import { PipelineState } from "./state.js";
import { loadConfig } from "./nodes/load-config.js";
import { fetchPrimaryNode } from "./nodes/fetch-primary.js";
import { preFilterNode } from "./nodes/pre-filter.js";
import { fetchCoverageNode } from "./nodes/fetch-coverage.js";
import { editorialAgendaNode } from "./nodes/editorial-agenda.js";
import { gateKeepNode } from "./nodes/gate-keep.js";
import { scoreNode } from "./nodes/score.js";
import { enrichSelectedNode } from "./nodes/enrich-selected.js";
import { insightNode } from "./nodes/insight.js";
import { generateDailyNode } from "./nodes/generate-daily.js";
import { podcastNode } from "./nodes/podcast.js";
import { platformsNode } from "./nodes/platforms.js";
import { publishNode } from "./nodes/publish.js";
import { notifyNode } from "./nodes/notify.js";
import { getRuntimeOptions } from "./lib/runtime-options.js";

// The graph stays strictly sequential until the canonical daily report exists.
// Only then do we fan out into podcast/platform variants and join again at publish.
const graph = new StateGraph(PipelineState)
  .addNode("loadConfig", loadConfig)
  .addNode("fetchPrimary", fetchPrimaryNode)
  .addNode("preFilter", preFilterNode)
  .addNode("fetchCoverage", fetchCoverageNode)
  .addNode("buildEditorialAgenda", editorialAgendaNode)
  .addNode("gateKeep", gateKeepNode)
  .addNode("score", scoreNode)
  .addNode("enrichSelected", enrichSelectedNode)
  .addNode("insight", insightNode)
  .addNode("generateDaily", generateDailyNode)
  .addNode("podcastGen", podcastNode)
  .addNode("platformsGen", platformsNode)
  .addNode("publish", publishNode)
  .addNode("notify", notifyNode)

  .addEdge(START, "loadConfig")
  .addEdge("loadConfig", "fetchPrimary")
  .addEdge("fetchPrimary", "preFilter")
  .addEdge("preFilter", "fetchCoverage")
  .addEdge("fetchCoverage", "buildEditorialAgenda")
  .addEdge("buildEditorialAgenda", "gateKeep")
  .addEdge("gateKeep", "score")
  .addEdge("score", "enrichSelected")
  .addEdge("enrichSelected", "insight")
  .addEdge("insight", "generateDaily")
  .addEdge("generateDaily", "podcastGen")
  .addEdge("generateDaily", "platformsGen")
  .addEdge("podcastGen", "publish")
  .addEdge("platformsGen", "publish")
  .addEdge("publish", "notify")
  .addEdge("notify", END);

const pipeline = graph.compile();

async function main() {
  const runtimeOptions = getRuntimeOptions();

  // Invocation starts with an empty object because every durable input
  // (config/date/raw snapshots) is resolved by graph nodes themselves.
  console.log("=== LLM News Flow Pipeline ===");
  console.log(`Started at: ${new Date().toISOString()}`);
  if (runtimeOptions.resumeFromRaw) {
    console.log(
      `[runtime] Resume-from-raw enabled for ${runtimeOptions.date ?? "today"}`
    );
  }

  const result = await pipeline.invoke({});

  console.log("\n=== Pipeline Complete ===");
  console.log(`Date: ${result.date}`);
  console.log(`Primary raw items: ${result.primaryRawItems?.length ?? 0}`);
  console.log(`Event candidates: ${result.eventCandidates?.length ?? 0}`);
  console.log(`Raw items: ${result.rawItems?.length ?? 0}`);
  console.log(`After gate-keep: ${result.passedItems?.length ?? 0}`);
  console.log(`After scoring (top N): ${result.scoredItems?.length ?? 0}`);
  console.log(`Insights generated: ${result.insights?.length ?? 0}`);
  console.log(
    `Podcast: ${result.podcast?.audioUrl ? "yes" : "script only"}`
  );
  console.log(
    `Platforms: ${Object.keys(result.platformContents ?? {}).join(", ") || "none"}`
  );
  console.log(`Errors: ${result.errors?.length ?? 0}`);
  if (result.errors?.length) {
    for (const err of result.errors) {
      console.error(`  [${err.node}] ${err.message}`);
    }
  }
}

main().catch(console.error);
