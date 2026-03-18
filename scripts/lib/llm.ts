import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not set, cannot use OpenAI fallback");
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  model?: "flash" | "pro";
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  provider: "gemini" | "openai";
  tokensUsed?: number;
}

const GEMINI_MODELS = {
  flash: "gemini-2.0-flash",
  pro: "gemini-2.5-pro",
} as const;

const OPENAI_MODELS = {
  flash: "gpt-4o-mini",
  pro: "gpt-4o",
} as const;

async function callGemini(req: LLMRequest): Promise<LLMResponse> {
  const model = GEMINI_MODELS[req.model ?? "flash"];
  const contents = req.systemPrompt
    ? `${req.systemPrompt}\n\n---\n\n${req.prompt}`
    : req.prompt;

  const config: Record<string, unknown> = {};
  if (req.jsonSchema) {
    config.responseMimeType = "application/json";
    config.responseJsonSchema = req.jsonSchema;
  }
  if (req.maxTokens) {
    config.maxOutputTokens = req.maxTokens;
  }

  const response = await gemini.models.generateContent({
    model,
    contents,
    config,
  });

  return {
    text: response.text ?? "",
    provider: "gemini",
    tokensUsed: response.usageMetadata?.totalTokenCount,
  };
}

async function callOpenAI(req: LLMRequest): Promise<LLMResponse> {
  const model = OPENAI_MODELS[req.model ?? "flash"];
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (req.systemPrompt) {
    messages.push({ role: "system", content: req.systemPrompt });
  }
  messages.push({ role: "user", content: req.prompt });

  const params: OpenAI.Chat.ChatCompletionCreateParams = {
    model,
    messages,
    max_tokens: req.maxTokens ?? 4096,
  };

  if (req.jsonSchema) {
    params.response_format = { type: "json_object" };
  }

  const response = await getOpenAI().chat.completions.create(params);
  const choice = response.choices[0];

  return {
    text: choice?.message?.content ?? "",
    provider: "openai",
    tokensUsed: response.usage?.total_tokens,
  };
}

async function callGeminiWithRetry(req: LLMRequest, retries = 2): Promise<LLMResponse> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await callGemini(req);
    } catch (err) {
      const msg = (err as Error).message;
      const isRetryable = msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("overloaded");
      if (isRetryable && i < retries) {
        const delay = (i + 1) * 3000;
        console.warn(`[LLM] Gemini 503, retrying in ${delay / 1000}s... (attempt ${i + 1}/${retries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}

export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  try {
    return await callGeminiWithRetry(req);
  } catch (err) {
    console.warn(
      `[LLM] Gemini failed (${req.model ?? "flash"}), falling back to OpenAI:`,
      (err as Error).message
    );
    return await callOpenAI(req);
  }
}

export async function callLLMJson<T>(req: LLMRequest): Promise<T> {
  const response = await callLLM(req);
  try {
    return JSON.parse(response.text) as T;
  } catch {
    const retryReq = {
      ...req,
      prompt: req.prompt + "\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown, no code fences, no extra text.",
    };
    const retry = await callLLM(retryReq);
    return JSON.parse(retry.text) as T;
  }
}
