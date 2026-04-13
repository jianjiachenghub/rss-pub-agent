import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import type { PipelineStateType } from "../state.js";
import { CONTENT_DIR } from "../lib/runtime-paths.js";
import {
  getEnglishArtifactFileName,
  translateArtifactToEnglish,
  type EnglishArtifactKind,
} from "../lib/english-artifacts.js";

export async function publishNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const {
    date,
    dailyMarkdown,
    dailyMarkdownEn,
    podcast,
    platformContents,
    insights,
    errors,
  } = state;
  if (!date || !dailyMarkdown) {
    return {};
  }

  try {
    const dayDir = join(CONTENT_DIR, date);
    await mkdir(dayDir, { recursive: true });
    const reportName = state.config?.reportName ?? "\u4e2a\u4eba\u65e5\u62a5";

    // Chinese artifacts are the canonical output. English files are best-effort
    // companions and should never block the main publication path.
    const writes: Promise<void>[] = [
      writeFile(join(dayDir, "daily.md"), dailyMarkdown, "utf-8"),
      writeFile(
        join(dayDir, "meta.json"),
        JSON.stringify(
          {
            date,
            itemCount: insights.length,
            categories: [...new Set(insights.map((i) => i.category))],
            avgScore: Math.round(
              insights.reduce((sum, i) => sum + i.weightedScore, 0) /
                insights.length
            ),
            hasPodcast: !!podcast.audioUrl,
            errors: errors.length,
            generatedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        "utf-8"
      ),
    ];

    if (dailyMarkdownEn.trim()) {
      writes.push(
        writeFile(join(dayDir, "daily.en.md"), dailyMarkdownEn, "utf-8")
      );
    }

    if (podcast.script) {
      writes.push(
        writeFile(join(dayDir, "podcast-script.md"), podcast.script, "utf-8")
      );
    }
    if (platformContents.xhs) {
      writes.push(
        writeFile(join(dayDir, "xhs.md"), platformContents.xhs, "utf-8")
      );
    }
    if (platformContents.douyin) {
      writes.push(
        writeFile(join(dayDir, "douyin.md"), platformContents.douyin, "utf-8")
      );
    }
    if (platformContents.brief) {
      writes.push(
        writeFile(join(dayDir, "brief.md"), platformContents.brief, "utf-8")
      );
    }

    await Promise.all(writes);

    const englishArtifacts: Array<{
      kind: EnglishArtifactKind;
      fileName: string;
      content: string;
    }> = [];

    if (dailyMarkdownEn.trim()) {
      englishArtifacts.push({
        kind: "daily",
        fileName: "daily.md",
        content: dailyMarkdownEn,
      });
    }
    if (podcast.script.trim()) {
      englishArtifacts.push({
        kind: "podcast-script",
        fileName: "podcast-script.md",
        content: podcast.script,
      });
    }
    if (platformContents.brief?.trim()) {
      englishArtifacts.push({
        kind: "brief",
        fileName: "brief.md",
        content: platformContents.brief,
      });
    }
    if (platformContents.douyin?.trim()) {
      englishArtifacts.push({
        kind: "douyin",
        fileName: "douyin.md",
        content: platformContents.douyin,
      });
    }
    if (platformContents.xhs?.trim()) {
      englishArtifacts.push({
        kind: "xhs",
        fileName: "xhs.md",
        content: platformContents.xhs,
      });
    }

    for (const artifact of englishArtifacts) {
      const targetPath = join(dayDir, getEnglishArtifactFileName(artifact.fileName));

      try {
        const translated =
          artifact.kind === "daily"
            ? artifact.content
            : await translateArtifactToEnglish({
                kind: artifact.kind,
                content: artifact.content,
                reportName,
              });

        await writeFile(targetPath, translated, "utf-8");
      } catch (error) {
        console.warn(
          `[publish] Failed to write English artifact for ${artifact.fileName}:`,
          (error as Error).message
        );
      }
    }

    // Keep the index append-only from the perspective of a new run so the
    // frontend only needs one file read to discover available issues.
    // Update index.json
    const indexPath = join(CONTENT_DIR, "index.json");
    let index: { dates: string[] } = { dates: [] };
    try {
      if (existsSync(indexPath)) {
        const raw = await readFile(indexPath, "utf-8");
        index = JSON.parse(raw);
      }
    } catch {
      /* ignore */
    }

    if (!index.dates.includes(date)) {
      index.dates.unshift(date);
      index.dates.sort((a, b) => b.localeCompare(a));
    }
    await writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");

    console.log(
      `[publish] Written ${writes.length} files to content/${date}/`
    );
    return {};
  } catch (err) {
    console.error("[publish] Failed:", err);
    return {
      errors: [
        {
          node: "publish",
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}
