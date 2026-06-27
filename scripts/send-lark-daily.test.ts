import { describe, expect, it } from "vitest";
import {
  buildLarkDailyFallbackText,
  buildLarkDailyIdempotencyKey,
} from "./send-lark-daily.js";

describe("buildLarkDailyIdempotencyKey", () => {
  it("uses a stable key for normal daily sends", () => {
    expect(
      buildLarkDailyIdempotencyKey({
        date: "2026-06-26",
        targetName: "daily-rich-post",
        force: false,
      })
    ).toBe("ld-20260626-daily-rich-post");
  });

  it("uses a unique key for forced resends", () => {
    const key = buildLarkDailyIdempotencyKey({
      date: "2026-06-26",
      targetName: "daily-rich-post",
      force: true,
      partIndex: 12,
      now: new Date("2026-06-27T09:12:34.567Z"),
    });

    expect(key).toBe("ld-20260626-daily-rich-post-f-260627T091234567-p12");
    expect(key.length).toBeLessThanOrEqual(50);
  });
});

describe("buildLarkDailyFallbackText", () => {
  it("renders a compact plain text fallback from a post payload", () => {
    const text = buildLarkDailyFallbackText({
      zh_cn: {
        title: "个人日报 | 2026-06-26",
        content: [
          [{ tag: "text", text: "AI" }],
          [
            { tag: "text", text: "1. " },
            { tag: "a", text: "OpenAI预览GPT-5.6 Sol", href: "https://example.com" },
          ],
          [{ tag: "text", text: "事件：OpenAI预览下一代模型。" }],
          [{ tag: "text", text: "已截取前 3 条，完整日报见站点或仓库 content 目录。" }],
        ],
      },
    });

    expect(text).toContain("个人日报 | 2026-06-26\n\nAI\n1. OpenAI预览GPT-5.6 Sol");
    expect(text).toContain("已截取前 3 条");
    expect(text).toContain("事件：OpenAI预览下一代模型。");
  });
});
