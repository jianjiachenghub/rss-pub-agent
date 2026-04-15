import { describe, expect, it } from "vitest";
import {
  formatBusinessTime,
  getBusinessDateForTimestamp,
  getBusinessDateWindow,
  getDefaultTargetDate,
  isTimestampInBusinessDate,
} from "./business-date.js";

describe("business-date", () => {
  it("computes the default target date from Shanghai calendar day", () => {
    expect(getDefaultTargetDate(new Date("2026-04-14T16:10:00.000Z"))).toBe(
      "2026-04-14"
    );
  });

  it("builds the exact UTC window for a Shanghai business day", () => {
    expect(getBusinessDateWindow("2026-04-14")).toMatchObject({
      targetDate: "2026-04-14",
      startIso: "2026-04-13T16:00:00.000Z",
      endIso: "2026-04-14T16:00:00.000Z",
    });
  });

  it("matches timestamps against the target Shanghai date boundaries", () => {
    expect(
      isTimestampInBusinessDate("2026-04-13T16:00:00.000Z", "2026-04-14")
    ).toBe(true);
    expect(
      isTimestampInBusinessDate("2026-04-14T15:59:59.999Z", "2026-04-14")
    ).toBe(true);
    expect(
      isTimestampInBusinessDate("2026-04-14T16:00:00.000Z", "2026-04-14")
    ).toBe(false);
  });

  it("formats timestamps in Shanghai local time", () => {
    expect(formatBusinessTime("2026-04-13T16:05:00.000Z")).toBe("00:05");
    expect(getBusinessDateForTimestamp("2026-04-13T16:05:00.000Z")).toBe(
      "2026-04-14"
    );
  });
});
