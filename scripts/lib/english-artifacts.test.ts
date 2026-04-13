import { describe, expect, it } from "vitest";
import {
  ENGLISH_ARTIFACTS,
  getEnglishArtifactFileName,
  getEnglishArtifactKind,
  validateEnglishArtifactOutput,
} from "./english-artifacts.js";

describe("english artifact helpers", () => {
  it("maps known markdown files to english companions", () => {
    expect(ENGLISH_ARTIFACTS).toEqual([
      { kind: "daily", fileName: "daily.md" },
      { kind: "podcast-script", fileName: "podcast-script.md" },
      { kind: "brief", fileName: "brief.md" },
      { kind: "douyin", fileName: "douyin.md" },
      { kind: "xhs", fileName: "xhs.md" },
    ]);
  });

  it("derives english file names", () => {
    expect(getEnglishArtifactFileName("daily.md")).toBe("daily.en.md");
    expect(getEnglishArtifactFileName("podcast-script.md")).toBe(
      "podcast-script.en.md"
    );
  });

  it("returns kinds for translatable files", () => {
    expect(getEnglishArtifactKind("daily.md")).toBe("daily");
    expect(getEnglishArtifactKind("xhs.md")).toBe("xhs");
    expect(getEnglishArtifactKind("meta.json")).toBeNull();
  });

  it("rejects translation commentary for daily artifacts", () => {
    const source = `---
title: "个人日报 | 2026年4月4日"
date: "2026-04-04"
itemCount: 1
---

# 个人日报 | 2026年4月4日

## 今日判断

> 测试内容
`;

    const output = `The user wants me to translate a Chinese daily report.

title: "个人日报 | 2026年4月4日" → "Personal Daily Report | April 4, 2026"
date: "2026-04-04" → keep unchanged
itemCount: 1 → keep unchanged`;

    expect(
      validateEnglishArtifactOutput({
        kind: "daily",
        source,
        output,
      })
    ).toEqual(
      expect.arrayContaining([
        "contains translation commentary",
        "contains before/after arrow pairs",
        "missing YAML frontmatter",
        "missing translated headings",
      ])
    );
  });

  it("accepts clean daily translations", () => {
    const source = `---
title: "个人日报 | 2026年4月4日"
date: "2026-04-04"
itemCount: 1
---

# 个人日报 | 2026年4月4日

## 今日判断

> 测试内容
`;

    const output = `---
title: "Personal Daily Report | April 4, 2026"
date: "2026-04-04"
itemCount: 1
---

# Personal Daily Report | April 4, 2026

## Today's Take

> Test content
`;

    expect(
      validateEnglishArtifactOutput({
        kind: "daily",
        source,
        output,
      })
    ).toEqual([]);
  });
});
