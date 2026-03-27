import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";
import { getDeliveryRecordPath } from "./runtime-paths.js";
import type { DeliveryRecord, NewsInsight } from "./types.js";

const DEFAULT_MAX_HIGHLIGHTS = 3;
const MAX_HIGHLIGHTS = 5;

function clampHighlights(value?: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_MAX_HIGHLIGHTS;
  }

  return Math.max(1, Math.min(MAX_HIGHLIGHTS, Math.round(value)));
}

function normalizeMultilineText(value: string | undefined): string {
  return (value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeOneLinerKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9 ]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getHighlightText(item: NewsInsight): string {
  return normalizeMultilineText(item.oneLiner || item.title);
}

export function buildDailyUrl(
  reportBaseUrl: string | undefined,
  date: string
): string | undefined {
  const normalizedBase = reportBaseUrl?.trim().replace(/\/+$/, "");
  if (!normalizedBase) return undefined;
  return `${normalizedBase}/${date}`;
}

export function selectHighlights(
  insights: NewsInsight[],
  maxHighlights?: number
): NewsInsight[] {
  const limit = clampHighlights(maxHighlights);
  const selected: NewsInsight[] = [];
  const seenCategories = new Set<string>();
  const seenKeys = new Set<string>();

  const pushIfEligible = (
    item: NewsInsight,
    enforceCategoryDiversity: boolean
  ) => {
    if (selected.length >= limit) return;

    const text = getHighlightText(item);
    if (!text) return;

    const key = normalizeOneLinerKey(text);
    if (seenKeys.has(key)) return;
    if (enforceCategoryDiversity && seenCategories.has(item.category)) return;

    selected.push(item);
    seenKeys.add(key);
    seenCategories.add(item.category);
  };

  for (const item of insights) {
    pushIfEligible(item, true);
  }

  for (const item of insights) {
    pushIfEligible(item, false);
  }

  return selected;
}

export function buildFeishuDigest(params: {
  reportName: string;
  date: string;
  dailySummary: string;
  insights: NewsInsight[];
  dailyUrl?: string;
  maxHighlights?: number;
}): string {
  const reportTitle = `${params.reportName} | ${params.date}`;
  const summary =
    normalizeMultilineText(params.dailySummary) || `${params.reportName} 已生成。`;
  const highlightItems = selectHighlights(params.insights, params.maxHighlights);

  const lines = [reportTitle, "", "今日摘要：", summary];

  if (highlightItems.length > 0) {
    lines.push("", "今日 Highlights：");
    for (const [index, item] of highlightItems.entries()) {
      lines.push(`${index + 1}. ${getHighlightText(item)}`);
    }
  }

  if (params.dailyUrl) {
    lines.push("", "阅读全文：", params.dailyUrl);
  }

  return lines.join("\n").trim();
}

export function buildSummaryPreview(text: string, max = 96): string {
  const normalized = normalizeMultilineText(text).replace(/\n/g, " ");
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}...`;
}

export async function readDeliveryRecords(date: string): Promise<DeliveryRecord[]> {
  const filePath = getDeliveryRecordPath(date);
  if (!existsSync(filePath)) return [];

  try {
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as DeliveryRecord[];
    }
    if (parsed && typeof parsed === "object") {
      return [parsed as DeliveryRecord];
    }
  } catch {
    // Ignore malformed files and treat as empty. The next write will repair it.
  }

  return [];
}

export async function upsertDeliveryRecord(record: DeliveryRecord): Promise<void> {
  const filePath = getDeliveryRecordPath(record.date);
  const records = await readDeliveryRecords(record.date);
  const index = records.findIndex(
    (candidate) =>
      candidate.channel === record.channel && candidate.target === record.target
  );

  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(records, null, 2), "utf-8");
}

export async function hasSuccessfulDelivery(
  date: string,
  channel: DeliveryRecord["channel"],
  target: string
): Promise<boolean> {
  const records = await readDeliveryRecords(date);
  return records.some(
    (record) =>
      record.channel === channel &&
      record.target === target &&
      record.status === "sent"
  );
}

export async function sendFeishuTextMessage(
  webhookUrl: string,
  text: string
): Promise<string | undefined> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msg_type: "text",
      content: { text },
    }),
  });

  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    // Ignore JSON parse failures and fall back to HTTP status handling.
  }

  if (!response.ok) {
    throw new Error(`Feishu webhook HTTP ${response.status}`);
  }

  const code =
    typeof payload?.code === "number"
      ? payload.code
      : typeof payload?.StatusCode === "number"
        ? payload.StatusCode
        : 0;
  if (code !== 0) {
    const message =
      typeof payload?.msg === "string"
        ? payload.msg
        : typeof payload?.StatusMessage === "string"
          ? payload.StatusMessage
          : "Feishu webhook returned a non-zero code";
    throw new Error(message);
  }

  return typeof payload?.message_id === "string"
    ? payload.message_id
    : typeof payload?.data === "string"
      ? payload.data
      : undefined;
}
