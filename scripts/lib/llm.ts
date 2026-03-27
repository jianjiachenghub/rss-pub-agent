import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

// ============================================================
// LLM Provider 统一接入层
// 支持：智谱 GLM / OpenAI / Gemini，可在 configs 中自由切换
// ============================================================

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  model?: "flash" | "pro";
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  provider: string;
  model: string;
  tokensUsed?: number;
}

function getSchemaRootType(
  schema?: Record<string, unknown>
): string | undefined {
  const rawType = schema?.type;
  return typeof rawType === "string" ? rawType.toUpperCase() : undefined;
}

function buildJsonOnlyInstruction(
  schema?: Record<string, unknown>
): string | undefined {
  if (!schema) return undefined;

  const rootType = getSchemaRootType(schema);
  if (rootType === "ARRAY") {
    return "Return valid JSON only. The top-level value must be a raw JSON array. Do not wrap it in an object, markdown, or explanation.";
  }
  if (rootType === "OBJECT") {
    return "Return valid JSON only. The top-level value must be a JSON object. Do not include markdown or explanation.";
  }
  return "Return valid JSON only. Do not include markdown or explanation.";
}

function withJsonOnlyInstruction(req: LLMRequest): LLMRequest {
  const instruction = buildJsonOnlyInstruction(req.jsonSchema);
  if (!instruction) return req;

  return {
    ...req,
    systemPrompt: req.systemPrompt
      ? `${req.systemPrompt}\n\n${instruction}`
      : instruction,
  };
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function isContentSafetyError(err: unknown): boolean {
  const message = getErrorMessage(err);
  return (
    message.includes("1301") ||
    message.includes("不安全或敏感内容") ||
    message.toLowerCase().includes("content safety")
  );
}

// ---------- Provider 定义 ----------

interface ProviderConfig {
  name: string;
  envKey: string;
  models: { flash: string; pro: string };
  call: (req: LLMRequest) => Promise<LLMResponse>;
}

// --- OpenAI-compatible 通用调用 ---
function createOpenAICompatibleProvider(opts: {
  name: string;
  envKey: string;
  baseURL?: string;
  models: { flash: string; pro: string };
}): ProviderConfig {
  let _client: OpenAI | null = null;

  function getClient(): OpenAI {
    if (!_client) {
      const apiKey = process.env[opts.envKey];
      if (!apiKey) throw new Error(`${opts.envKey} not set`);
      _client = new OpenAI({
        apiKey,
        ...(opts.baseURL ? { baseURL: opts.baseURL } : {}),
      });
    }
    return _client;
  }

  return {
    name: opts.name,
    envKey: opts.envKey,
    models: opts.models,
    async call(req: LLMRequest): Promise<LLMResponse> {
      const model = opts.models[req.model ?? "flash"];
      const effectiveReq = withJsonOnlyInstruction(req);
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      if (effectiveReq.systemPrompt) {
        messages.push({ role: "system", content: effectiveReq.systemPrompt });
      }
      messages.push({ role: "user", content: effectiveReq.prompt });

      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model,
        messages,
        max_tokens: effectiveReq.maxTokens ?? 4096,
      };

      if (getSchemaRootType(effectiveReq.jsonSchema) === "OBJECT") {
        params.response_format = { type: "json_object" };
      }

      const response = await getClient().chat.completions.create(params);
      const choice = response.choices[0];
      const message = choice?.message as any;

      // GLM-5 等推理模型可能会把主要内容放在 reasoning_content 里（或者 content 为空）
      const text = message?.content || message?.reasoning_content || "";

      return {
        text,
        provider: opts.name,
        model,
        tokensUsed: response.usage?.total_tokens,
      };
    },
  };
}

// --- Gemini (Google GenAI SDK) ---
function createGeminiProvider(): ProviderConfig {
  let _client: GoogleGenAI | null = null;

  function getClient(): GoogleGenAI {
    if (!_client) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not set");
      _client = new GoogleGenAI({ apiKey });
    }
    return _client;
  }

  const models = { flash: "gemini-2.0-flash", pro: "gemini-2.5-pro" };

  return {
    name: "gemini",
    envKey: "GEMINI_API_KEY",
    models,
    async call(req: LLMRequest): Promise<LLMResponse> {
      const model = models[req.model ?? "flash"];
      const effectiveReq = withJsonOnlyInstruction(req);
      const contents = effectiveReq.systemPrompt
        ? `${effectiveReq.systemPrompt}\n\n---\n\n${effectiveReq.prompt}`
        : effectiveReq.prompt;

      const config: Record<string, unknown> = {};
      if (effectiveReq.jsonSchema) {
        config.responseMimeType = "application/json";
        config.responseJsonSchema = effectiveReq.jsonSchema;
      }
      if (effectiveReq.maxTokens) {
        config.maxOutputTokens = effectiveReq.maxTokens;
      }

      const response = await getClient().models.generateContent({
        model,
        contents,
        config,
      });

      return {
        text: response.text ?? "",
        provider: "gemini",
        model,
        tokensUsed: response.usageMetadata?.totalTokenCount,
      };
    },
  };
}

// ---------- Provider 注册表 ----------

const PROVIDERS: Record<string, ProviderConfig> = {
  zhipu: createOpenAICompatibleProvider({
    name: "zhipu",
    envKey: "ZHIPU_API_KEY",
    baseURL: "https://open.bigmodel.cn/api/paas/v4/",
    models: { flash: "glm-4-flash", pro: "glm-5" },
  }),
  openai: createOpenAICompatibleProvider({
    name: "openai",
    envKey: "OPENAI_API_KEY",
    models: { flash: "gpt-4o-mini", pro: "gpt-4o" },
  }),
  gemini: createGeminiProvider(),
  deepseek: createOpenAICompatibleProvider({
    name: "deepseek",
    envKey: "DEEPSEEK_API_KEY",
    baseURL: "https://api.deepseek.com/",
    models: { flash: "deepseek-chat", pro: "deepseek-reasoner" },
  }),
  siliconflow: createOpenAICompatibleProvider({
    name: "siliconflow",
    envKey: "SILICONFLOW_API_KEY",
    baseURL: "https://api.siliconflow.cn/v1/",
    models: { flash: "Qwen/Qwen3-8B", pro: "deepseek-ai/DeepSeek-V3" },
  }),
};

// ---------- Provider 优先级 ----------
// 从环境变量 LLM_PROVIDERS 读取，逗号分隔，默认 "zhipu,gemini,openai"
function getProviderChain(): ProviderConfig[] {
  const raw = process.env.LLM_PROVIDERS ?? "zhipu,gemini,openai";
  const names = raw.split(",").map((s) => s.trim()).filter(Boolean);

  const chain: ProviderConfig[] = [];
  for (const name of names) {
    const provider = PROVIDERS[name];
    if (provider && process.env[provider.envKey]) {
      chain.push(provider);
    }
  }

  if (chain.length === 0) {
    throw new Error(
      `No LLM provider available. Set at least one API key: ${Object.values(PROVIDERS).map((p) => p.envKey).join(", ")}`
    );
  }

  return chain;
}

// ---------- 核心调用 ----------

async function callWithRetry(
  provider: ProviderConfig,
  req: LLMRequest,
  retries = 2
): Promise<LLMResponse> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await provider.call(req);
    } catch (err) {
      const msg = (err as Error).message;
      const isRetryable =
        msg.includes("429") ||
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("overloaded") ||
        msg.includes("rate") ||
        msg.includes("Premature close") ||
        msg.includes("ERR_STREAM_PREMATURE_CLOSE") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("socket hang up") ||
        msg.includes("network");
      if (isRetryable && i < retries) {
        const delay = (i + 1) * 3000;
        console.warn(
          `[LLM] ${provider.name} retrying in ${delay / 1000}s... (attempt ${i + 1}/${retries})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}

export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const chain = getProviderChain();

  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    console.log(`[LLM] Calling ${provider.name} (${req.model ?? "flash"})...`);
    try {
      return await callWithRetry(provider, req);
    } catch (err) {
      const isLast = i === chain.length - 1;
      if (isLast) throw err;
      console.warn(
        `[LLM] ${provider.name} failed (${req.model ?? "flash"}), trying ${chain[i + 1].name}:`,
        (err as Error).message
      );
    }
  }
  throw new Error("All LLM providers failed");
}

export async function callLLMJson<T>(req: LLMRequest): Promise<T> {
  const response = await callLLM(req);
  try {
    return parseJsonResponse<T>(response.text);
  } catch {
    const retryReq = {
      ...req,
      prompt:
        req.prompt +
        "\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown, no code fences, no extra text. If the expected output is an array, return a raw JSON array like [{...}, {...}], NOT wrapped in an object.",
    };
    const retry = await callLLM(retryReq);
    return parseJsonResponse<T>(retry.text);
  }
}

function stripCodeFences(text: string): string {
  const cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    return cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
  }
  return cleaned;
}

function tryParseJson(text: string): unknown {
  return JSON.parse(text);
}

function findBalancedJsonSlice(text: string, start: number): string | null {
  const opening = text[start];
  const closing = opening === "[" ? "]" : opening === "{" ? "}" : "";
  if (!closing) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === opening) {
      depth++;
      continue;
    }

    if (char === closing) {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function extractEmbeddedJson(text: string): string | null {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{" && text[i] !== "[") continue;
    const candidate = findBalancedJsonSlice(text, i);
    if (!candidate) continue;
    try {
      const parsed = tryParseJson(candidate);
      if (typeof parsed === "object" && parsed !== null) {
        return candidate;
      }
    } catch {
      // Ignore invalid slices and keep scanning.
    }
  }

  return null;
}

export function parseJsonResponse<T>(text: string): T {
  const cleaned = stripCodeFences(text);

  try {
    return normalizeParsedJson<T>(tryParseJson(cleaned));
  } catch (e) {
    const embeddedJson = extractEmbeddedJson(cleaned);
    if (embeddedJson) {
      return normalizeParsedJson<T>(tryParseJson(embeddedJson));
    }
    console.error(
      "[LLM] JSON parse failed. Raw text (first 500 chars):",
      cleaned.slice(0, 500)
    );
    throw e;
  }
}

function normalizeParsedJson<T>(parsed: unknown): T {
  if (Array.isArray(parsed)) {
    return parsed as T;
  }

  if (typeof parsed === "object" && parsed !== null) {
    // Look for the first array value in the object (e.g. {"results": [...]} or {"items": [...]})
    const values = Object.values(parsed);
    const arrayValue = values.find((v) => Array.isArray(v));
    if (arrayValue) {
      return arrayValue as T;
    }
  }

  return parsed as T;
}
