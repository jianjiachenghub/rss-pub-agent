import { callLLM } from "./llm.js";

export type EnglishArtifactKind =
  | "daily"
  | "podcast-script"
  | "brief"
  | "douyin"
  | "xhs";

export const ENGLISH_ARTIFACTS = [
  { kind: "daily", fileName: "daily.md" },
  { kind: "podcast-script", fileName: "podcast-script.md" },
  { kind: "brief", fileName: "brief.md" },
  { kind: "douyin", fileName: "douyin.md" },
  { kind: "xhs", fileName: "xhs.md" },
] as const satisfies ReadonlyArray<{
  kind: EnglishArtifactKind;
  fileName: string;
}>;

const DEFAULT_REPORT_NAME = "\u4e2a\u4eba\u65e5\u62a5";

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(
    /^```(?:markdown|md|text|txt)?\s*([\s\S]*?)\s*```$/i
  );
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function buildSystemPrompt(
  kind: EnglishArtifactKind,
  reportName: string
): string {
  switch (kind) {
    case "daily":
      return `You are translating a Chinese daily report into publication-ready English.

Rules:
- Return Markdown only. Do not wrap the result in code fences.
- Preserve the YAML frontmatter block and keep the keys exactly as title / date / itemCount.
- Translate the title value into natural English, but keep date and itemCount unchanged.
- Preserve heading levels, horizontal rules, links, images, tables, and code fences.
- Translate prose into concise editorial English.
- When a company, product, model, or project has an established English name, use that English name.
- Keep category section headings in English.
- Translate these recurring labels naturally:
  \u4eca\u65e5\u5224\u65ad -> Today's Take
  \u4e8b\u4ef6 -> Event
  \u89e3\u8bfb -> Why it matters
  \u8bc4\u5206 -> Score
  \u6765\u6e90 -> Source
  \u5bf9\u6bd4 -> Comparison
  \u4ee3\u7801\u7247\u6bb5 -> Code Snippet
  \u63a5\u4e0b\u6765\u8981\u76ef\u7684\u53d8\u91cf -> Watch Signals
  \u66f4\u591a 24h \u8d44\u8baf -> More in the Last 24h
- Keep bullets, timestamps, URLs, and image URLs intact.
- Do not add or remove sections.`;
    case "podcast-script":
      return `Translate this Chinese podcast script for ${reportName} into natural spoken English.

Rules:
- Return plain text or Markdown only. No code fences.
- Preserve line breaks, speaker turns, emphasis, and stage directions.
- Translate bracketed metadata such as \u8282\u76ee\u540d\u79f0 / \u65e5\u671f / \u4e3b\u6301\u4eba into English.
- Keep host labels consistent and readable in English.
- Make the dialogue sound natural, but do not rewrite the structure.`;
    case "brief":
      return `Translate this Chinese push brief for ${reportName} into concise English.

Rules:
- Return plain text or Markdown only. No code fences.
- Preserve numbering, bullets, and line breaks.
- Keep it short and direct.
- Translate labels such as \u4eca\u65e5\u5224\u65ad / \u63a5\u4e0b\u6765\u8981\u76ef\u4ec0\u4e48 into natural English.`;
    case "douyin":
      return `Translate this Chinese short-video script for ${reportName} into natural English.

Rules:
- Return plain text or Markdown only. No code fences.
- Preserve list structure, section breaks, and emphasis.
- Keep the script punchy and suitable for short-form spoken delivery.`;
    case "xhs":
      return `Translate this Chinese social post for ${reportName} into natural English.

Rules:
- Return plain text or Markdown only. No code fences.
- Preserve bullets, numbering, emojis, and line breaks when present.
- Keep the tone readable as a concise English post instead of over-literal translation.`;
    default:
      return `Translate this Chinese content for ${reportName} into English. Return text only.`;
  }
}

function getModel(kind: EnglishArtifactKind): "flash" | "pro" {
  return kind === "daily" || kind === "podcast-script" ? "pro" : "flash";
}

function getMaxTokens(kind: EnglishArtifactKind): number {
  switch (kind) {
    case "daily":
      return 8192;
    case "podcast-script":
      return 6144;
    default:
      return 2048;
  }
}

export function getEnglishArtifactKind(
  fileName: string
): EnglishArtifactKind | null {
  return (
    ENGLISH_ARTIFACTS.find((artifact) => artifact.fileName === fileName)?.kind ??
    null
  );
}

export async function translateArtifactToEnglish(params: {
  kind: EnglishArtifactKind;
  content: string;
  reportName?: string;
}): Promise<string> {
  if (!params.content.trim()) {
    return "";
  }

  const reportName = params.reportName?.trim() || DEFAULT_REPORT_NAME;
  const response = await callLLM({
    model: getModel(params.kind),
    maxTokens: getMaxTokens(params.kind),
    systemPrompt: buildSystemPrompt(params.kind, reportName),
    prompt: `Translate the following content into English while preserving its structure exactly.\n\n${params.content}`,
  });

  return stripMarkdownFence(response.text);
}

export function getEnglishArtifactFileName(fileName: string): string {
  return fileName.replace(/\.md$/i, ".en.md");
}
