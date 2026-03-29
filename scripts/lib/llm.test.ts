import { describe, expect, it } from "vitest";
import {
  parseJsonResponse,
  shouldTryGeminiContentSafetyBackup,
} from "./llm.js";

describe("parseJsonResponse", () => {
  it("parses a raw JSON array", () => {
    expect(parseJsonResponse('[{"id":"1","content":"ok"}]')).toEqual([
      { id: "1", content: "ok" },
    ]);
  });

  it("strips json code fences", () => {
    expect(
      parseJsonResponse('```json\n[{"id":"1","content":"ok"}]\n```')
    ).toEqual([{ id: "1", content: "ok" }]);
  });

  it("extracts embedded JSON from surrounding text", () => {
    expect(
      parseJsonResponse('用户说明如下：\n[{"id":"1","content":"ok"}]\n以上是结果。')
    ).toEqual([{ id: "1", content: "ok" }]);
  });

  it("unwraps the first array value from an object response", () => {
    expect(parseJsonResponse('{"items":[{"id":"1","content":"ok"}]}')).toEqual([
      { id: "1", content: "ok" },
    ]);
  });
});

describe("shouldTryGeminiContentSafetyBackup", () => {
  it("returns true for content safety blocks from non-gemini providers", () => {
    expect(
      shouldTryGeminiContentSafetyBackup({
        currentProvider: "zhipu",
        err: new Error(
          "400 系统检测到输入或生成内容可能包含不安全或敏感内容，请您避免输入易产生敏感内容的提示语"
        ),
        geminiConfigured: true,
      })
    ).toBe(true);
  });

  it("returns false when gemini is not configured", () => {
    expect(
      shouldTryGeminiContentSafetyBackup({
        currentProvider: "zhipu",
        err: new Error("1301 content safety"),
        geminiConfigured: false,
      })
    ).toBe(false);
  });

  it("returns false after gemini has already been tried", () => {
    expect(
      shouldTryGeminiContentSafetyBackup({
        currentProvider: "zhipu",
        err: new Error("1301 content safety"),
        geminiConfigured: true,
        triedProviders: ["gemini"],
      })
    ).toBe(false);
  });

  it("returns false for non-safety errors", () => {
    expect(
      shouldTryGeminiContentSafetyBackup({
        currentProvider: "zhipu",
        err: new Error("429 rate limit"),
        geminiConfigured: true,
      })
    ).toBe(false);
  });

  it("returns false when the current provider is already gemini", () => {
    expect(
      shouldTryGeminiContentSafetyBackup({
        currentProvider: "gemini",
        err: new Error("1301 content safety"),
        geminiConfigured: true,
      })
    ).toBe(false);
  });
});
