import { mkdtemp, mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildWeeklyDigestMarkdownMessages,
  buildWeeklyDigestTextMessages,
  getMonthScopedWeekId,
  getWeeklyDigestIssue,
} from "./weekly-digest.js";

let tempDir: string | null = null;

async function writeDaily(params: {
  date: string;
  title: string;
  summary: string;
  headings: string[];
  itemCount: number;
  avgScore: number;
  categories: string[];
}) {
  if (!tempDir) throw new Error("tempDir not initialized");
  const dayDir = join(tempDir, params.date);
  await mkdir(dayDir, { recursive: true });
  await writeFile(
    join(dayDir, "daily.md"),
    `---
title: "${params.title}"
date: "${params.date}"
---

# ${params.title}

## 今日判断

> ${params.summary}

---

## AI

${params.headings.map((heading) => `### ${heading}`).join("\n\n")}
`,
    "utf-8"
  );
  await writeFile(
    join(dayDir, "meta.json"),
    JSON.stringify(
      {
        date: params.date,
        itemCount: params.itemCount,
        categories: params.categories,
        avgScore: params.avgScore,
        hasPodcast: false,
      },
      null,
      2
    ),
    "utf-8"
  );
}

describe("weekly digest aggregation", () => {
  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("uses the frontend month-scoped week id convention", () => {
    expect(getMonthScopedWeekId("2026-06-26")).toBe("2026-06-W4");
  });

  it("builds a latest weekly digest from daily content", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "weekly-digest-"));
    await writeFile(
      join(tempDir, "index.json"),
      JSON.stringify({ dates: ["2026-06-26", "2026-06-25"] }),
      "utf-8"
    );
    await writeDaily({
      date: "2026-06-26",
      title: "个人日报 | 2026年6月26日",
      summary: "AI 成本和监管同时进入重新定价阶段。",
      headings: ["OpenAI预览GPT-5.6 Sol", "韩国股市大跌触发熔断"],
      itemCount: 30,
      avgScore: 88,
      categories: ["ai", "investment"],
    });
    await writeDaily({
      date: "2026-06-25",
      title: "个人日报 | 2026年6月25日",
      summary: "硬件涨价和资本开支继续牵动市场。",
      headings: ["苹果上调Mac与iPad价格"],
      itemCount: 22,
      avgScore: 84,
      categories: ["business", "ai"],
    });

    const issue = await getWeeklyDigestIssue(tempDir);

    expect(issue?.weekId).toBe("2026-06-W4");
    expect(issue?.label).toBe("6月第四周");
    expect(issue?.issueCount).toBe(2);
    expect(issue?.itemCount).toBe(52);
    expect(issue?.avgScore).toBe(86);
    expect(issue?.keyTitles).toContain("OpenAI预览GPT-5.6 Sol");
  });

  it("renders weekly Lark messages with overview and daily recap", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "weekly-digest-"));
    await writeFile(
      join(tempDir, "index.json"),
      JSON.stringify({ dates: ["2026-06-26"] }),
      "utf-8"
    );
    await writeDaily({
      date: "2026-06-26",
      title: "个人日报 | 2026年6月26日",
      summary: "AI 仍在加速进入更高风险、更高成本阶段。",
      headings: ["OpenAI预览GPT-5.6 Sol", "Claude Tag接管团队协作"],
      itemCount: 30,
      avgScore: 88,
      categories: ["ai", "business"],
    });

    const issue = await getWeeklyDigestIssue(tempDir);
    expect(issue).not.toBeNull();

    const messages = buildWeeklyDigestTextMessages(issue!, {
      reportBaseUrl: "https://example.com",
      maxChars: 160,
    });
    const combined = messages.map((message) => message.text).join("\n");

    expect(messages.length).toBeGreaterThanOrEqual(2);
    expect(combined).toContain("个人周报 | 6月第四周");
    expect(combined).toContain("阅读周报：https://example.com/weekly/2026-06-W4");
    expect(combined).toContain("OpenAI预览GPT-5.6 Sol");
    expect(combined).toContain("2026.06.26 · 30 条");
  });

  it("renders formatted weekly Lark markdown messages with scores", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "weekly-digest-"));
    await writeFile(
      join(tempDir, "index.json"),
      JSON.stringify({ dates: ["2026-06-26"] }),
      "utf-8"
    );
    await writeDaily({
      date: "2026-06-26",
      title: "个人日报 | 2026年6月26日",
      summary: "AI 仍在加速进入更高风险、更高成本阶段。",
      headings: ["OpenAI预览GPT-5.6 Sol", "Claude Tag接管团队协作"],
      itemCount: 20,
      avgScore: 88,
      categories: ["ai", "business"],
    });

    const issue = await getWeeklyDigestIssue(tempDir);
    expect(issue).not.toBeNull();

    const messages = buildWeeklyDigestMarkdownMessages(issue!, {
      reportBaseUrl: "https://example.com",
      maxChars: 220,
    });
    const combined = messages.map((message) => message.markdown).join("\n");

    expect(combined).toContain("**个人周报 | 6月第四周**");
    expect(combined).toContain("**1** 份日报 · **20** 条资讯 · 均分 **88**");
    expect(combined).toContain("**2026.06.26 · 20 条 · 均分 88**");
    expect(combined).toContain("[阅读周报](https://example.com/weekly/2026-06-W4)");
  });
});
