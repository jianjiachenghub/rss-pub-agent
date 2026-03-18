import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

import { StateGraph, START, END } from "@langchain/langgraph";
import { PipelineState } from "./state.js";
import { loadConfig } from "./nodes/load-config.js";
import { fetchNode } from "./nodes/fetch.js";
import { gateKeepNode } from "./nodes/gate-keep.js";
import { scoreNode } from "./nodes/score.js";
import { insightNode } from "./nodes/insight.js";
import { generateDailyNode } from "./nodes/generate-daily.js";
import { podcastNode } from "./nodes/podcast.js";
import { platformsNode } from "./nodes/platforms.js";
import { publishNode } from "./nodes/publish.js";
import { notifyNode } from "./nodes/notify.js";

const graph = new StateGraph(PipelineState)
  .addNode("loadConfig", loadConfig)
  .addNode("fetch", fetchNode)
  .addNode("gateKeep", gateKeepNode)
  .addNode("score", scoreNode)
  .addNode("insight", insightNode)
  .addNode("generateDaily", generateDailyNode)
  .addNode("podcastGen", podcastNode)
  .addNode("platformsGen", platformsNode)
  .addNode("publish", publishNode)
  .addNode("notify", notifyNode)

  .addEdge(START, "loadConfig")
  .addEdge("loadConfig", "fetch")
  .addEdge("fetch", "gateKeep")
  .addEdge("gateKeep", "score")
  .addEdge("score", "insight")
  .addEdge("insight", "generateDaily")
  .addEdge("generateDaily", "podcastGen")
  .addEdge("generateDaily", "platformsGen")
  .addEdge("podcastGen", "publish")
  .addEdge("platformsGen", "publish")
  .addEdge("publish", "notify")
  .addEdge("notify", END);

const pipeline = graph.compile();

async function main() {
  console.log("=== LLM News Flow Pipeline ===");
  console.log(`Started at: ${new Date().toISOString()}`);

  const result = await pipeline.invoke({});

  console.log("\n=== Pipeline Complete ===");
  console.log(`Date: ${result.date}`);
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
