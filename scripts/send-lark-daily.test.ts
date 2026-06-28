import { describe, expect, it } from "vitest";
import {
  buildLarkDailyFallbackText,
  buildLarkDailyIdempotencyKey,
  buildLarkMarkdownSendArgs,
  formatLarkDailyResultMessage,
  formatLarkDailySkipMessage,
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

describe("buildLarkMarkdownSendArgs", () => {
  it("sends rich daily messages as Feishu markdown instead of plain text", () => {
    const args = buildLarkMarkdownSendArgs({
      chatId: "oc_test",
      identity: "bot",
      markdown: "## AI\n\n**1. 标题**",
      idempotencyKey: "ld-test",
      dryRun: true,
    });

    expect(args).toContain("--markdown");
    expect(args).toContain("## AI\n\n**1. 标题**");
    expect(args).not.toContain("--text");
    expect(args).toContain("--dry-run");
  });
});

describe("Chinese Lark daily status messages", () => {
  it("explains duplicate-send skips and the force flag in Chinese", () => {
    expect(
      formatLarkDailySkipMessage({
        date: "2026-06-27",
        targetName: "daily-rich-post",
      })
    ).toBe(
      "[飞书日报] 2026-06-27/daily-rich-post 已有成功发送记录，本次默认跳过。需要重发请执行：npm run lark:daily -- --date 2026-06-27 --force"
    );
  });

  it("summarizes send results in Chinese", () => {
    expect(
      formatLarkDailyResultMessage({
        dryRun: false,
        messageCount: 7,
        date: "2026-06-27",
        chatId: "oc_test",
        identity: "bot",
      })
    ).toBe("[飞书日报] 已发送 7 条分类消息：日期 2026-06-27，群 oc_test，身份 bot");
  });
});
