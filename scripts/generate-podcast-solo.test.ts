import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSoloPodcast, parseSoloPodcastArgs } from "./generate-podcast-solo.js";

const tempDirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("targeted solo podcast generation", () => {
  it("creates only the solo artifact beside the report without replacing other outputs", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const root = await mkdtemp(join(tmpdir(), "rss-podcast-solo-"));
    tempDirs.push(root);
    const day = join(root, "2026-10-27");
    await mkdir(day);
    const originals = {
      "daily.md": "# 个人日报\n\n## AI\n\n### 新闻\n\n**事件：** 不能丢的信息。\n\n评分 91 · 来源 信源",
      "podcast-script.md": "主持人 A：原双人稿。\n主持人 B：保留。",
      "meta.json": '{"date":"2026-10-27","errors":1}',
    };
    await Promise.all(Object.entries(originals).map(([name, content]) => writeFile(join(day, name), content)));

    const target = await generateSoloPodcast("2026-10-27", root);
    expect(target).toBe(join(day, "podcast-script-solo.md"));
    expect(await readFile(target, "utf-8")).toContain("不能丢的信息。");
    expect((await readdir(day)).sort()).toEqual([
      "daily.md", "meta.json", "podcast-script-solo.md", "podcast-script.md",
    ]);
    for (const [name, content] of Object.entries(originals)) {
      expect(await readFile(join(day, name), "utf-8")).toBe(content);
    }
    const first = await readFile(target, "utf-8");
    await generateSoloPodcast("2026-10-27", root);
    expect(await readFile(target, "utf-8")).toBe(first);
  });

  it("rejects missing dates, unsupported arguments and traversal/invalid dates", () => {
    expect(parseSoloPodcastArgs(["--date", "2026-10-27"])).toBe("2026-10-27");
    for (const args of [[], ["--date"], ["--push"], ["--date", "2026-10-27", "--push"], ["--date", "../../secret"], ["--date", "2026-02-30"]]) {
      expect(() => parseSoloPodcastArgs(args)).toThrow();
    }
  });

  it("does not invent a report or create directories when the source is absent", async () => {
    const root = await mkdtemp(join(tmpdir(), "rss-podcast-solo-"));
    tempDirs.push(root);
    await expect(generateSoloPodcast("2026-10-27", root)).rejects.toThrow("ENOENT");
    expect(await readdir(root)).toEqual([]);
  });
});
