import { describe, expect, it } from "vitest";
import {
  buildLocalDailyEnv,
  parseLocalDailyArgs,
  resolveLocalDailyTargetDate,
} from "./run-local-daily.js";

describe("buildLocalDailyEnv", () => {
  it("defaults local scheduled runs to Codex and Shanghai time", () => {
    expect(buildLocalDailyEnv({ PATH: "/bin" } as NodeJS.ProcessEnv)).toMatchObject({
      PATH: "/bin",
      LLM_PROVIDERS: "codex",
      TZ: "Asia/Shanghai",
    });
  });

  it("preserves explicit provider and timezone overrides", () => {
    expect(
      buildLocalDailyEnv({
        LLM_PROVIDERS: "gemini,openai",
        TZ: "UTC",
      } as NodeJS.ProcessEnv)
    ).toMatchObject({
      LLM_PROVIDERS: "gemini,openai",
      TZ: "UTC",
    });
  });
});

describe("parseLocalDailyArgs", () => {
  it("separates local runner flags from pipeline flags", () => {
    expect(
      parseLocalDailyArgs([
        "--date",
        "2026-04-08",
        "--push",
        "--resume-from-raw",
      ])
    ).toEqual({
      pipelineArgs: ["--date", "2026-04-08", "--resume-from-raw"],
      push: true,
      sendLark: true,
    });
  });

  it("can skip the Lark rich post step for local debugging", () => {
    expect(parseLocalDailyArgs(["--skip-lark", "--date", "2026-04-08"])).toEqual({
      pipelineArgs: ["--date", "2026-04-08"],
      push: false,
      sendLark: false,
    });
  });
});

describe("resolveLocalDailyTargetDate", () => {
  it("uses the pipeline date when explicitly provided", () => {
    expect(
      resolveLocalDailyTargetDate(
        ["--date", "2026-04-08"],
        {} as NodeJS.ProcessEnv,
        new Date("2026-04-15T16:10:00.000Z")
      )
    ).toBe("2026-04-08");
  });

  it("otherwise uses the previous Shanghai business date", () => {
    expect(
      resolveLocalDailyTargetDate(
        [],
        {} as NodeJS.ProcessEnv,
        new Date("2026-04-15T16:10:00.000Z")
      )
    ).toBe("2026-04-15");
  });
});
