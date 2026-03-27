import { describe, expect, it } from "vitest";
import { parseRuntimeOptions } from "./runtime-options.js";

describe("parseRuntimeOptions", () => {
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
});
