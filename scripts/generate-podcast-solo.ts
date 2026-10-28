import { readFile, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { CONTENT_DIR } from "./lib/runtime-paths.js";
import {
  renderSoloPodcastScript,
  SOLO_PODCAST_FILE_NAME,
  validateSoloPodcastDate,
} from "./lib/podcast-solo.js";

export function parseSoloPodcastArgs(argv: string[]): string {
  if (argv.length !== 2 || argv[0] !== "--date") {
    throw new Error("Usage: npm run podcast:solo -- --date YYYY-MM-DD");
  }
  validateSoloPodcastDate(argv[1]);
  return argv[1];
}

export async function generateSoloPodcast(
  date: string,
  contentDir = CONTENT_DIR
): Promise<string> {
  validateSoloPodcastDate(date);
  const dayDir = join(contentDir, date);
  const dailyMarkdown = await readFile(join(dayDir, "daily.md"), "utf-8");
  const script = renderSoloPodcastScript(dailyMarkdown, { date });
  const targetPath = join(dayDir, SOLO_PODCAST_FILE_NAME);
  await writeFile(targetPath, script, "utf-8");
  console.log(`[podcast-solo] Written ${targetPath} (${script.length} chars)`);
  return targetPath;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const main = async () => generateSoloPodcast(parseSoloPodcastArgs(process.argv.slice(2)));
  main().catch((error) => {
    console.error("[podcast-solo] Failed:", (error as Error).message);
    process.exitCode = 1;
  });
}
