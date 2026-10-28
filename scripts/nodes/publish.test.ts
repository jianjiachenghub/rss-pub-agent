import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PipelineStateType } from "../state.js";
import type { NewsInsight } from "../lib/types.js";

vi.mock("fs/promises", () => ({
  writeFile: vi.fn(async () => {}),
  mkdir: vi.fn(async () => {}),
  readFile: vi.fn(async () => '{"dates":[]}'),
}));
vi.mock("fs", () => ({ existsSync: () => false }));
vi.mock("../lib/runtime-paths.js", () => ({ CONTENT_DIR: "/test/content" }));
vi.mock("../lib/english-artifacts.js", () => ({
  getEnglishArtifactFileName: (name: string) => name.replace(/\.md$/, ".en.md"),
  translateArtifactToEnglish: vi.fn(async () => "English dialogue"),
}));

import { writeFile } from "fs/promises";
import { translateArtifactToEnglish } from "../lib/english-artifacts.js";
import { publishNode } from "./publish.js";

function state(solo = "完整单播稿"): PipelineStateType {
  const partial: Partial<PipelineStateType> = {
    date: "2026-10-27",
    dailyMarkdown: "日报正文",
    dailyMarkdownEn: "",
    podcast: { script: "旧双人稿", audioUrl: "" },
    podcastSoloScript: solo,
    platformContents: {},
    insights: [{ weightedScore: 90, category: "ai" } as NewsInsight],
    errors: [],
  };
  return partial as PipelineStateType;
}

describe("publication of parallel podcast versions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes both versions without changing the legacy audio or adding translation calls", async () => {
    expect(await publishNode(state())).toEqual({});
    expect(writeFile).toHaveBeenCalledWith("/test/content/2026-10-27/podcast-script.md", "旧双人稿", "utf-8");
    expect(writeFile).toHaveBeenCalledWith("/test/content/2026-10-27/podcast-script-solo.md", "完整单播稿", "utf-8");
    expect(translateArtifactToEnglish).toHaveBeenCalledTimes(1);
    expect(translateArtifactToEnglish).toHaveBeenCalledWith(expect.objectContaining({ kind: "podcast-script", content: "旧双人稿" }));
  });

  it("still publishes the existing versions if the solo branch is empty", async () => {
    expect(await publishNode(state(""))).toEqual({});
    expect(writeFile).toHaveBeenCalledWith("/test/content/2026-10-27/podcast-script.md", "旧双人稿", "utf-8");
    expect(vi.mocked(writeFile).mock.calls.some(([path]) => String(path).endsWith("podcast-script-solo.md"))).toBe(false);
  });
});
