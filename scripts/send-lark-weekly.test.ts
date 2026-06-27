import { describe, expect, it } from "vitest";
import { buildLarkWeeklyIdempotencyKey } from "./send-lark-weekly.js";

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
