import { config } from "dotenv";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { dirname, join, resolve } from "path";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { buildLarkDailyCategoryMarkdownMessagesFromMarkdown } from "./lib/lark-rich-post.js";
import {
  buildSummaryPreview,
  hasSuccessfulDelivery,
  readDeliveryRecords,
  upsertDeliveryRecord,
} from "./lib/delivery.js";
import { CONFIGS_DIR, CONTENT_DIR } from "./lib/runtime-paths.js";
import { getDefaultTargetDate } from "./lib/business-date.js";
import type { DeliveryRecord, PlatformConfig } from "./lib/types.js";
import type { LarkPostPayload } from "./lib/lark-rich-post.js";

const execFileAsync = promisify(execFile);
const DEFAULT_CHAT_ID = "oc_c6c99cc6a292740330a85c21a89b6913";
const __dirname = dirname(fileURLToPath(import.meta.url));

interface SendOptions {
  date: string;
  chatId?: string;
  identity?: "bot" | "user";
  contentDir: string;
  dryRun: boolean;
  force: boolean;
}

function loadDotenv(): void {
  const candidates = [
    resolve(__dirname, "../.env"),
    resolve(__dirname, "../../.env"),
  ];
  const envPath = candidates.find((candidate) => existsSync(candidate));
  if (envPath) {
    config({ path: envPath });
  } else {
    config();
  }
}

function resolveEnvVars(obj: unknown): unknown {
  if (typeof obj === "string") {
    return obj.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] ?? "");
  }
  if (Array.isArray(obj)) return obj.map(resolveEnvVars);
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveEnvVars(value);
    }
    return result;
  }
  return obj;
}

function assertDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --date value "${value}". Expected YYYY-MM-DD.`);
  }
  return value;
}

function parseArgs(argv: string[]): SendOptions {
  const options: SendOptions = {
    date: process.env.PIPELINE_DATE?.trim() || getDefaultTargetDate(),
    chatId: process.env.LARK_DAILY_CHAT_ID?.trim() || undefined,
    identity:
      process.env.LARK_DAILY_IDENTITY === "user" ||
      process.env.LARK_DAILY_IDENTITY === "bot"
        ? process.env.LARK_DAILY_IDENTITY
        : undefined,
    contentDir: CONTENT_DIR,
    dryRun: false,
    force: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--date") {
      if (!next || next.startsWith("--")) {
        throw new Error("Missing value for --date. Expected YYYY-MM-DD.");
      }
      options.date = assertDate(next);
      index++;
      continue;
    }

    if (arg === "--chat-id") {
      if (!next || next.startsWith("--")) {
        throw new Error("Missing value for --chat-id.");
      }
      options.chatId = next;
      index++;
      continue;
    }

    if (arg === "--as") {
      if (next !== "bot" && next !== "user") {
        throw new Error('Invalid --as value. Expected "bot" or "user".');
      }
      options.identity = next;
      index++;
      continue;
    }

    if (arg === "--content-dir") {
      if (!next || next.startsWith("--")) {
        throw new Error("Missing value for --content-dir.");
      }
      options.contentDir = resolve(next);
      index++;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  options.date = assertDate(options.date);
  return options;
}

async function loadPlatformConfig(): Promise<PlatformConfig | null> {
  try {
    const raw = await readFile(join(CONFIGS_DIR, "platforms.json"), "utf-8");
    return resolveEnvVars(JSON.parse(raw)) as PlatformConfig;
  } catch {
    return null;
  }
}

function resolveEffectiveOptions(
  options: SendOptions,
  platformConfig: PlatformConfig | null
): Required<Pick<SendOptions, "date" | "contentDir" | "dryRun" | "force">> &
  Pick<SendOptions, "chatId" | "identity"> & {
    targetName: string;
  } {
  const larkCli = platformConfig?.feishu?.larkCli;
  const chatId = options.chatId || larkCli?.chatId?.trim() || DEFAULT_CHAT_ID;
  const identity = options.identity || larkCli?.identity || "bot";
  const targetName = larkCli?.targetName?.trim() || "daily-rich-post";

  return {
    ...options,
    chatId,
    identity,
    targetName,
  };
}

function formatIdempotencyTimestamp(now: Date): string {
  return now
    .toISOString()
    .replace(/[-:.]/g, "")
    .replace(/^20/, "")
    .replace(/Z$/, "");
}

function compactIdempotencySegment(value: string, maxChars: number): string {
  const compact = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (compact || "target").slice(0, maxChars);
}

export function buildLarkDailyIdempotencyKey(params: {
  date: string;
  targetName: string;
  force: boolean;
  partIndex?: number;
  now?: Date;
}): string {
  const parts = [
    "ld",
    params.date.replace(/-/g, ""),
    compactIdempotencySegment(params.targetName, 15),
  ];

  if (params.force) {
    parts.push("f", formatIdempotencyTimestamp(params.now ?? new Date()));
  }

  if (typeof params.partIndex === "number") {
    parts.push(`p${Math.max(1, Math.floor(params.partIndex))}`);
  }

  return parts.join("-");
}

export function formatLarkDailySkipMessage(params: {
  date: string;
  targetName: string;
}): string {
  return `[飞书日报] ${params.date}/${params.targetName} 已有成功发送记录，本次默认跳过。需要重发请执行：npm run lark:daily -- --date ${params.date} --force`;
}

export function formatLarkDailyResultMessage(params: {
  dryRun: boolean;
  messageCount: number;
  date: string;
  chatId: string;
  identity: "bot" | "user";
}): string {
  const action = params.dryRun ? "已预览" : "已发送";
  return `[飞书日报] ${action} ${params.messageCount} 条分类消息：日期 ${params.date}，群 ${params.chatId}，身份 ${params.identity}`;
}

export function buildLarkMarkdownSendArgs(params: {
  chatId: string;
  identity: "bot" | "user";
  markdown: string;
  dryRun: boolean;
  idempotencyKey: string;
}): string[] {
  const args = [
    "im",
    "+messages-send",
    "--chat-id",
    params.chatId,
    "--as",
    params.identity,
    "--markdown",
    params.markdown,
    "--idempotency-key",
    params.idempotencyKey,
  ];

  if (params.dryRun) {
    args.push("--dry-run");
  }

  return args;
}

async function sendLarkMarkdown(params: {
  chatId: string;
  identity: "bot" | "user";
  markdown: string;
  dryRun: boolean;
  idempotencyKey: string;
}): Promise<string | undefined> {
  const { stdout, stderr } = await execFileAsync(
    "lark-cli",
    buildLarkMarkdownSendArgs(params),
    {
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  if (stderr.trim()) {
    console.warn(stderr.trim());
  }

  const trimmed = stdout.trim();
  if (!trimmed) return undefined;

  try {
    const payload = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof payload.message_id === "string") return payload.message_id;
  } catch {
    if (params.dryRun) {
      console.log(trimmed);
    }
  }

  return undefined;
}

export function buildLarkDailyFallbackText(post: LarkPostPayload): string {
  const lines = [post.zh_cn.title, ""];
  for (const paragraph of post.zh_cn.content) {
    const text = paragraph
      .map((element) => element.text)
      .join("")
      .trim();
    if (text) {
      lines.push(text);
    }
  }
  return lines.join("\n").trim();
}

async function main(): Promise<void> {
  loadDotenv();
  const parsedOptions = parseArgs(process.argv.slice(2));
  const platformConfig = await loadPlatformConfig();
  const options = resolveEffectiveOptions(parsedOptions, platformConfig);
  const dailyPath = join(options.contentDir, options.date, "daily.md");

  if (!existsSync(dailyPath)) {
    throw new Error(`找不到日报 Markdown 文件：${dailyPath}`);
  }

  if (
    !options.dryRun &&
    !options.force &&
    (await hasSuccessfulDelivery(options.date, "feishu-lark-cli", options.targetName))
  ) {
    console.log(
      formatLarkDailySkipMessage({
        date: options.date,
        targetName: options.targetName,
      })
    );
    return;
  }

  const markdown = await readFile(dailyPath, "utf-8");
  const messages = buildLarkDailyCategoryMarkdownMessagesFromMarkdown(markdown, {
    fallbackDate: options.date,
  });
  const existingRecord = (await readDeliveryRecords(options.date)).find(
    (record) =>
      record.channel === "feishu-lark-cli" &&
      record.target === options.targetName
  );
  const attempts = (existingRecord?.attempts ?? 0) + 1;
  const baseRecord: DeliveryRecord = {
    date: options.date,
    channel: "feishu-lark-cli",
    target: options.targetName,
    status: "pending",
    attempts,
    summaryPreview: buildSummaryPreview(
      `${options.date} 飞书日报 ${messages.length} 条分类消息`
    ),
  };

  if (!options.dryRun) {
    await upsertDeliveryRecord(baseRecord);
  }

  try {
    const externalIds: string[] = [];

    for (const [index, message] of messages.entries()) {
      const externalId = await sendLarkMarkdown({
        chatId: options.chatId!,
        identity: options.identity!,
        markdown: message.markdown,
        dryRun: options.dryRun,
        idempotencyKey: buildLarkDailyIdempotencyKey({
          date: options.date,
          targetName: options.targetName,
          force: options.force,
          partIndex: index + 1,
        }),
      });

      if (externalId) {
        externalIds.push(externalId);
      }
    }

    if (!options.dryRun) {
      await upsertDeliveryRecord({
        ...baseRecord,
        status: "sent",
        sentAt: new Date().toISOString(),
        externalId: externalIds.join(",") || undefined,
      });
    }

    console.log(
      formatLarkDailyResultMessage({
        dryRun: options.dryRun,
        messageCount: messages.length,
        date: options.date,
        chatId: options.chatId!,
        identity: options.identity!,
      })
    );
  } catch (error) {
    if (!options.dryRun) {
      await upsertDeliveryRecord({
        ...baseRecord,
        status: "failed",
        lastError: (error as Error).message,
      });
    }
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`[飞书日报] 发送失败：${(error as Error).message}`);
    process.exitCode = 1;
  });
}
