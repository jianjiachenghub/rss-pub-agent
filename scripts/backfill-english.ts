import { config } from "dotenv";
import { existsSync, readdirSync, readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import {
  ENGLISH_ARTIFACTS,
  getEnglishArtifactFileName,
  translateArtifactToEnglish,
} from "./lib/english-artifacts.js";
import { CONTENT_DIR } from "./lib/runtime-paths.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPORT_NAME = "\u4e2a\u4eba\u65e5\u62a5";

function resolveEnvPath(): string | undefined {
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
  config();
}

interface BackfillTask {
  date: string;
  fileName: (typeof ENGLISH_ARTIFACTS)[number]["fileName"];
  kind: (typeof ENGLISH_ARTIFACTS)[number]["kind"];
  sourcePath: string;
  targetPath: string;
}

function getDateDirectories(): string[] {
  return readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)
    )
    .map((entry) => entry.name)
    .sort();
}

function buildTasks(overwrite: boolean): BackfillTask[] {
  const tasks: BackfillTask[] = [];

  for (const date of getDateDirectories()) {
    for (const artifact of ENGLISH_ARTIFACTS) {
      const sourcePath = join(CONTENT_DIR, date, artifact.fileName);
      if (!existsSync(sourcePath)) {
        continue;
      }

      const targetPath = join(
        CONTENT_DIR,
        date,
        getEnglishArtifactFileName(artifact.fileName)
      );
      if (!overwrite && existsSync(targetPath)) {
        continue;
      }

      tasks.push({
        date,
        fileName: artifact.fileName,
        kind: artifact.kind,
        sourcePath,
        targetPath,
      });
    }
  }

  return tasks;
}

async function main() {
  const overwrite = process.argv.includes("--overwrite");
  const tasks = buildTasks(overwrite);
  const reportName = process.env.REPORT_NAME?.trim() || DEFAULT_REPORT_NAME;

  if (tasks.length === 0) {
    console.log("[backfill-english] No missing English artifacts found.");
    return;
  }

  console.log(
    `[backfill-english] Processing ${tasks.length} artifact(s) across ${getDateDirectories().length} day(s).`
  );

  let translatedCount = 0;
  const failed: Array<{ task: BackfillTask; message: string }> = [];

  for (const [index, task] of tasks.entries()) {
    const label = `${task.date}/${task.fileName}`;
    console.log(`[backfill-english] ${index + 1}/${tasks.length} ${label}`);

    try {
      const source = readFileSync(task.sourcePath, "utf-8");
      if (!source.trim()) {
        console.log(`[backfill-english] Skipping empty file ${label}`);
        continue;
      }

      const translated = await translateArtifactToEnglish({
        kind: task.kind,
        content: source,
        reportName,
      });

      await writeFile(task.targetPath, translated, "utf-8");
      translatedCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failed.push({ task, message });
      console.warn(`[backfill-english] Failed ${label}: ${message}`);
    }
  }

  console.log(
    `[backfill-english] Completed. translated=${translatedCount} failed=${failed.length}`
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

await main();
