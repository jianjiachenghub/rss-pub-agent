import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import type { PipelineStateType } from "../state.js";
import { CONTENT_DIR } from "../lib/runtime-paths.js";

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
