import { afterEach, describe, expect, it, vi } from "vitest";
import { parseRuntimeOptions } from "./runtime-options.js";

describe("parseRuntimeOptions", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    delete process.env.PIPELINE_DATE;
    delete process.env.PIPELINE_RESUME_FROM_RAW;
  });

  it("parses resume flag with inline date", () => {
    expect(
      parseRuntimeOptions(
        ["--resume-from-raw", "2026-03-27"],
        {} as NodeJS.ProcessEnv
      )
    ).toEqual({
      date: "2026-03-27",
      resumeFromRaw: true,
    });
  });

  it("parses explicit date without resume mode", () => {
    expect(
      parseRuntimeOptions(["--date", "2026-03-27"], {} as NodeJS.ProcessEnv)
    ).toEqual({
      date: "2026-03-27",
      resumeFromRaw: false,
    });
  });

  it("reads env defaults", () => {
    expect(
      parseRuntimeOptions([], {
        PIPELINE_DATE: "2026-03-27",
        PIPELINE_RESUME_FROM_RAW: "true",
      } as NodeJS.ProcessEnv)
    ).toEqual({
      date: "2026-03-27",
      resumeFromRaw: true,
    });
  });

  it("rejects invalid dates", () => {
    expect(() =>
      parseRuntimeOptions(["--date", "20260327"], {} as NodeJS.ProcessEnv)
    ).toThrow('Invalid --date value "20260327". Expected YYYY-MM-DD.');
  });

  it("defaults to yesterday in Shanghai when no explicit date is provided", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-14T16:10:00.000Z"));

    const { getTargetDate } = await import("./runtime-options.js");
    expect(getTargetDate()).toBe("2026-04-14");
  });
});
