export type LLMModelTier = "flash" | "pro";

export interface LLMConcurrencyConfig {
  maxConcurrency: number;
  maxProviderConcurrency: number;
  maxFlashConcurrency: number;
  maxProConcurrency: number;
  providerCooldownMs: number;
  providerCooldownJitterMs: number;
}

interface QueueTask {
  providerName: string;
  tier: LLMModelTier;
  run: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

const DEFAULT_CONFIG: LLMConcurrencyConfig = {
  maxConcurrency: 8,
  maxProviderConcurrency: 4,
  maxFlashConcurrency: 4,
  maxProConcurrency: 2,
  providerCooldownMs: 6000,
  providerCooldownJitterMs: 1500,
};

const state = {
  queue: [] as QueueTask[],
  activeTotal: 0,
  activeByProvider: new Map<string, number>(),
  activeByTier: new Map<LLMModelTier, number>(),
  providerCooldownUntil: new Map<string, number>(),
  pumpTimer: null as ReturnType<typeof setTimeout> | null,
  pumpScheduledAt: 0,
  pumping: false,
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getMapCount<K>(map: Map<K, number>, key: K): number {
  return map.get(key) ?? 0;
}

function incrementMapCount<K>(map: Map<K, number>, key: K): void {
  map.set(key, getMapCount(map, key) + 1);
}

function decrementMapCount<K>(map: Map<K, number>, key: K): void {
  const next = getMapCount(map, key) - 1;
  if (next <= 0) {
    map.delete(key);
    return;
  }
  map.set(key, next);
}

function getTierLimit(
  config: LLMConcurrencyConfig,
  tier: LLMModelTier
): number {
  return tier === "pro" ? config.maxProConcurrency : config.maxFlashConcurrency;
}

function getProviderCooldownRemaining(
  providerName: string,
  now = Date.now()
): number {
  return Math.max(0, (state.providerCooldownUntil.get(providerName) ?? 0) - now);
}

function canRunTask(
  task: QueueTask,
  config: LLMConcurrencyConfig,
  now: number
): boolean {
  if (state.activeTotal >= config.maxConcurrency) return false;
  if (
    getMapCount(state.activeByProvider, task.providerName) >=
    config.maxProviderConcurrency
  ) {
    return false;
  }
  if (getMapCount(state.activeByTier, task.tier) >= getTierLimit(config, task.tier)) {
    return false;
  }
  return getProviderCooldownRemaining(task.providerName, now) === 0;
}

function schedulePump(delayMs = 0): void {
  const safeDelay = Math.max(0, delayMs);
  const target = Date.now() + safeDelay;

  if (state.pumpTimer && state.pumpScheduledAt <= target) {
    return;
  }

  if (state.pumpTimer) {
    clearTimeout(state.pumpTimer);
  }

  state.pumpScheduledAt = target;
  state.pumpTimer = setTimeout(() => {
    state.pumpTimer = null;
    state.pumpScheduledAt = 0;
    void pumpQueue();
  }, safeDelay);
}

function startTask(task: QueueTask): void {
  state.activeTotal += 1;
  incrementMapCount(state.activeByProvider, task.providerName);
  incrementMapCount(state.activeByTier, task.tier);

  void Promise.resolve()
    .then(task.run)
    .then(task.resolve, task.reject)
    .finally(() => {
      state.activeTotal -= 1;
      decrementMapCount(state.activeByProvider, task.providerName);
      decrementMapCount(state.activeByTier, task.tier);
      schedulePump(0);
    });
}

async function pumpQueue(): Promise<void> {
  if (state.pumping) {
    schedulePump(0);
    return;
  }

  state.pumping = true;
  try {
    const config = getLLMConcurrencyConfig();

    while (state.queue.length > 0 && state.activeTotal < config.maxConcurrency) {
      const now = Date.now();
      let runnableIndex = -1;
      let nextCooldownDelay = Number.POSITIVE_INFINITY;

      for (let index = 0; index < state.queue.length; index += 1) {
        const task = state.queue[index];
        const cooldownRemaining = getProviderCooldownRemaining(task.providerName, now);
        if (cooldownRemaining > 0) {
          nextCooldownDelay = Math.min(nextCooldownDelay, cooldownRemaining);
          continue;
        }

        if (canRunTask(task, config, now)) {
          runnableIndex = index;
          break;
        }
      }

      if (runnableIndex === -1) {
        if (Number.isFinite(nextCooldownDelay)) {
          schedulePump(nextCooldownDelay);
        }
        return;
      }

      const [task] = state.queue.splice(runnableIndex, 1);
      startTask(task);
    }
  } finally {
    state.pumping = false;
  }
}

export function getLLMConcurrencyConfig(
  env: NodeJS.ProcessEnv = process.env
): LLMConcurrencyConfig {
  return {
    maxConcurrency: parsePositiveInt(
      env.LLM_MAX_CONCURRENCY,
      DEFAULT_CONFIG.maxConcurrency
    ),
    maxProviderConcurrency: parsePositiveInt(
      env.LLM_MAX_PROVIDER_CONCURRENCY,
      DEFAULT_CONFIG.maxProviderConcurrency
    ),
    maxFlashConcurrency: parsePositiveInt(
      env.LLM_MAX_FLASH_CONCURRENCY,
      DEFAULT_CONFIG.maxFlashConcurrency
    ),
    maxProConcurrency: parsePositiveInt(
      env.LLM_MAX_PRO_CONCURRENCY,
      DEFAULT_CONFIG.maxProConcurrency
    ),
    providerCooldownMs: parsePositiveInt(
      env.LLM_PROVIDER_COOLDOWN_MS,
      DEFAULT_CONFIG.providerCooldownMs
    ),
    providerCooldownJitterMs: parseNonNegativeInt(
      env.LLM_PROVIDER_COOLDOWN_JITTER_MS,
      DEFAULT_CONFIG.providerCooldownJitterMs
    ),
  };
}

export function isProviderCoolingDown(providerName: string): boolean {
  return getProviderCooldownRemaining(providerName) > 0;
}

export function noteProviderCooldown(
  providerName: string,
  suggestedDelayMs: number
): void {
  const config = getLLMConcurrencyConfig();
  const jitter =
    config.providerCooldownJitterMs > 0
      ? Math.floor(Math.random() * (config.providerCooldownJitterMs + 1))
      : 0;
  const cooldownMs = Math.max(config.providerCooldownMs, suggestedDelayMs) + jitter;
  const nextUntil = Date.now() + cooldownMs;
  const currentUntil = state.providerCooldownUntil.get(providerName) ?? 0;

  if (nextUntil > currentUntil) {
    state.providerCooldownUntil.set(providerName, nextUntil);
  }

  schedulePump(cooldownMs);
}

export async function runWithLLMConcurrency<T>(
  providerName: string,
  tier: LLMModelTier,
  run: () => Promise<T>
): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    state.queue.push({
      providerName,
      tier,
      run,
      resolve: (value) => resolve(value as T),
      reject,
    });

    schedulePump(0);
  });
}

export function resetLLMConcurrencyStateForTests(): void {
  if (state.pumpTimer) {
    clearTimeout(state.pumpTimer);
  }

  state.queue = [];
  state.activeTotal = 0;
  state.activeByProvider.clear();
  state.activeByTier.clear();
  state.providerCooldownUntil.clear();
  state.pumpTimer = null;
  state.pumpScheduledAt = 0;
  state.pumping = false;
}
