import { describe, expect, it } from "vitest";
import {
  DEFAULT_LLM_PROVIDERS,
  extractAssistantMessage,
  getProviderModelEnvKey,
  parseProviderNames,
  parseJsonResponse,
  resolveProviderModels,
  shouldTryGeminiContentSafetyBackup,
} from "./llm.js";

describe("parseProviderNames", () => {
  it("uses openrouter as the default first provider", () => {
    expect(parseProviderNames(DEFAULT_LLM_PROVIDERS)).toEqual([
      "openrouter",
      "gemini",
      "openai",
    ]);
  });

  it("trims blank provider names from env strings", () => {
    expect(parseProviderNames(" openrouter, gemini ,, openai ")).toEqual([
      "openrouter",
      "gemini",
      "openai",
    ]);
  });
});

describe("resolveProviderModels", () => {
  it("uses provider-specific env overrides when present", () => {
    expect(
      resolveProviderModels(
        "openrouter",
        { flash: "openai/gpt-4o-mini", pro: "openai/gpt-4o" },
        {
          [getProviderModelEnvKey("openrouter", "flash")]:
            "anthropic/claude-3.7-sonnet",
          [getProviderModelEnvKey("openrouter", "pro")]:
            "google/gemini-2.5-pro",
        }
      )
    ).toEqual({
      flash: "anthropic/claude-3.7-sonnet",
      pro: "google/gemini-2.5-pro",
    });
  });

  it("falls back to defaults when env overrides are empty", () => {
    expect(
      resolveProviderModels(
        "openrouter",
        { flash: "openai/gpt-4o-mini", pro: "openai/gpt-4o" },
        {
          [getProviderModelEnvKey("openrouter", "flash")]: " ",
        }
      )
    ).toEqual({
      flash: "openai/gpt-4o-mini",
      pro: "openai/gpt-4o",
    });
  });
});

describe("extractAssistantMessage", () => {
  it("reads plain string content", () => {
    expect(
      extractAssistantMessage({
        content: "Hello world",
      })
    ).toEqual({
      content: "Hello world",
      reasoning: "",
      refusal: "",
    });
  });

  it("extracts text from OpenRouter content arrays", () => {
    expect(
      extractAssistantMessage({
        content: [
          { type: "output_text", text: "Hello" },
          { type: "output_text", text: "world" },
        ],
      })
    ).toEqual({
      content: "Hello\nworld",
      reasoning: "",
      refusal: "",
    });
  });

  it("extracts reasoning from both reasoning and reasoning_details", () => {
    expect(
      extractAssistantMessage({
        content: null,
        reasoning: "First think",
        reasoning_details: [{ type: "reasoning.text", text: "Then answer" }],
      })
    ).toEqual({
      content: "",
      reasoning: "First think\nThen answer",
      refusal: "",
    });
  });

  it("extracts refusal text when present", () => {
    expect(
      extractAssistantMessage({
        content: null,
        refusal: [{ type: "refusal", text: "Cannot comply" }],
      })
    ).toEqual({
      content: "",
      reasoning: "",
      refusal: "Cannot comply",
    });
  });
});

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
