import { describe, expect, it } from "vitest";
import {
  buildLarkWeeklyIdempotencyKey,
  buildLarkWeeklyMarkdownSendArgs,
} from "./send-lark-weekly.js";

describe("buildLarkWeeklyIdempotencyKey", () => {
  it("uses a stable key for normal weekly sends", () => {
    expect(
      buildLarkWeeklyIdempotencyKey({
        weekId: "2026-06-W4",
        targetName: "weekly-digest",
        force: false,
      })
    ).toBe("lw-2026-06-w4-weekly-digest");
  });

  it("uses a short unique key for forced weekly resends", () => {
    const key = buildLarkWeeklyIdempotencyKey({
      weekId: "2026-06-W4",
      targetName: "weekly-digest",
      force: true,
      partIndex: 3,
      now: new Date("2026-06-29T00:30:00.123Z"),
    });

    expect(key).toBe("lw-2026-06-w4-weekly-digest-f-260629T003000123-p3");
    expect(key.length).toBeLessThanOrEqual(50);
  });
});

describe("buildLarkWeeklyMarkdownSendArgs", () => {
  it("sends weekly digests as Feishu markdown instead of plain text", () => {
    const args = buildLarkWeeklyMarkdownSendArgs({
      chatId: "oc_test",
      identity: "bot",
      markdown: "**个人周报 | 6月第四周**\n\n- 重点",
      idempotencyKey: "lw-test",
      dryRun: true,
    });

    expect(args).toContain("--markdown");
    expect(args).toContain("**个人周报 | 6月第四周**\n\n- 重点");
    expect(args).not.toContain("--text");
    expect(args).toContain("--dry-run");
  });
});
