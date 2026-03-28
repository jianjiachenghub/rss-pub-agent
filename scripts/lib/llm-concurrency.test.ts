import { afterEach, describe, expect, it } from "vitest";
import {
  noteProviderCooldown,
  resetLLMConcurrencyStateForTests,
  runWithLLMConcurrency,
} from "./llm-concurrency.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setEnv(overrides: Record<string, string>): void {
  for (const [key, value] of Object.entries(overrides)) {
    process.env[key] = value;
  }
}

function clearEnv(keys: string[]): void {
  for (const key of keys) {
    delete process.env[key];
  }
}

const ENV_KEYS = [
  "LLM_MAX_CONCURRENCY",
  "LLM_MAX_PROVIDER_CONCURRENCY",
  "LLM_MAX_FLASH_CONCURRENCY",
  "LLM_MAX_PRO_CONCURRENCY",
  "LLM_PROVIDER_COOLDOWN_MS",
  "LLM_PROVIDER_COOLDOWN_JITTER_MS",
];

describe.sequential("llm concurrency", () => {
  afterEach(() => {
    resetLLMConcurrencyStateForTests();
    clearEnv(ENV_KEYS);
  });

  it("respects the global max concurrency limit", async () => {
    setEnv({
      LLM_MAX_CONCURRENCY: "2",
      LLM_MAX_PROVIDER_CONCURRENCY: "4",
      LLM_MAX_FLASH_CONCURRENCY: "4",
      LLM_MAX_PRO_CONCURRENCY: "4",
      LLM_PROVIDER_COOLDOWN_MS: "10",
      LLM_PROVIDER_COOLDOWN_JITTER_MS: "0",
    });

    let active = 0;
    let maxActive = 0;

    const tasks = Array.from({ length: 6 }, (_, index) =>
      runWithLLMConcurrency(`provider-${index % 3}`, "flash", async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await sleep(20);
        active -= 1;
        return index;
      })
    );

    const results = await Promise.all(tasks);

    expect(results).toHaveLength(6);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("respects the per-provider concurrency limit", async () => {
    setEnv({
      LLM_MAX_CONCURRENCY: "4",
      LLM_MAX_PROVIDER_CONCURRENCY: "1",
      LLM_MAX_FLASH_CONCURRENCY: "4",
      LLM_MAX_PRO_CONCURRENCY: "4",
      LLM_PROVIDER_COOLDOWN_MS: "10",
      LLM_PROVIDER_COOLDOWN_JITTER_MS: "0",
    });

    let providerAActive = 0;
    let providerAMax = 0;
    let providerBActive = 0;
    let providerBMax = 0;

    const tasks = [
      runWithLLMConcurrency("zhipu", "flash", async () => {
        providerAActive += 1;
        providerAMax = Math.max(providerAMax, providerAActive);
        await sleep(20);
        providerAActive -= 1;
      }),
      runWithLLMConcurrency("zhipu", "flash", async () => {
        providerAActive += 1;
        providerAMax = Math.max(providerAMax, providerAActive);
        await sleep(20);
        providerAActive -= 1;
      }),
      runWithLLMConcurrency("gemini", "flash", async () => {
        providerBActive += 1;
        providerBMax = Math.max(providerBMax, providerBActive);
        await sleep(20);
        providerBActive -= 1;
      }),
    ];

    await Promise.all(tasks);

    expect(providerAMax).toBeLessThanOrEqual(1);
    expect(providerBMax).toBeLessThanOrEqual(1);
  });

  it("delays queued work while a provider is cooling down", async () => {
    setEnv({
      LLM_MAX_CONCURRENCY: "4",
      LLM_MAX_PROVIDER_CONCURRENCY: "4",
      LLM_MAX_FLASH_CONCURRENCY: "4",
      LLM_MAX_PRO_CONCURRENCY: "4",
      LLM_PROVIDER_COOLDOWN_MS: "40",
      LLM_PROVIDER_COOLDOWN_JITTER_MS: "0",
    });

    noteProviderCooldown("zhipu", 10);

    const startedAt = Date.now();

    await runWithLLMConcurrency("zhipu", "flash", async () => undefined);

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(35);
  });
});
