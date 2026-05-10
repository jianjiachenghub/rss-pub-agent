import { config } from "dotenv";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import {
  getWeChatAccessToken,
  sendWeChatOfficialAccountTextMessage,
} from "./lib/delivery.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveEnvPath(): string | undefined {
  const candidates = [
    resolve(__dirname, "../.env"),
    resolve(__dirname, "../../.env"),
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

const envPath = resolveEnvPath();
if (envPath) {
  config({ path: envPath });
} else {
  config();
}

interface WeChatFollowerListPayload {
  errcode?: number;
  errmsg?: string;
  total?: number;
  count?: number;
  data?: { openid?: string[] };
  next_openid?: string;
}

function getArgValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function maskOpenId(openId: string): string {
  if (openId.length <= 8) return "****";
  return `${openId.slice(0, 4)}...${openId.slice(-4)}`;
}

function resolveConfiguredOpenIds(): string[] {
  const values = [process.env.WECHAT_OPENID, process.env.WECHAT_OPENIDS];
  const seen = new Set<string>();

  for (const value of values) {
    for (const item of (value ?? "").split(",")) {
      const openId = item.trim();
      if (openId) {
        seen.add(openId);
      }
    }
  }

  return [...seen];
}

function getWeChatCredentials(): {
  appId?: string;
  appSecret?: string;
  accessToken?: string;
} {
  return {
    appId: process.env.WECHAT_APP_ID?.trim(),
    appSecret:
      process.env.WECHAT_APP_SECRET?.trim() || process.env.WECHAT_API_KEY?.trim(),
    accessToken: process.env.WECHAT_ACCESS_TOKEN?.trim(),
  };
}

function assertCredentials(credentials: ReturnType<typeof getWeChatCredentials>): void {
  if (credentials.accessToken) return;
  if (credentials.appId && credentials.appSecret) return;

  throw new Error(
    "Missing WeChat credentials. Set WECHAT_APP_ID plus WECHAT_APP_SECRET, or WECHAT_ACCESS_TOKEN in .env."
  );
}

async function readFollowers(accessToken: string): Promise<string[]> {
  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/user/get?access_token=${encodeURIComponent(
      accessToken
    )}`,
    { method: "GET" }
  );
  const payload = (await response.json()) as WeChatFollowerListPayload;

  if (!response.ok) {
    throw new Error(`WeChat follower list HTTP ${response.status}`);
  }

  if (typeof payload.errcode === "number" && payload.errcode !== 0) {
    throw new Error(
      `WeChat follower list error ${payload.errcode}: ${payload.errmsg ?? "unknown"}`
    );
  }

  return payload.data?.openid ?? [];
}

async function main() {
  const credentials = getWeChatCredentials();
  assertCredentials(credentials);

  const message =
    getArgValue("--message") ??
    `LLM News Flow WeChat test ${new Date().toISOString()}`;
  const sendAll = hasFlag("--all");
  const accessToken =
    credentials.accessToken ??
    (await getWeChatAccessToken({
      appId: credentials.appId!,
      appSecret: credentials.appSecret!,
    }));

  let openIds = resolveConfiguredOpenIds();
  if (openIds.length === 0) {
    const followers = await readFollowers(accessToken);

    if (followers.length === 0) {
      throw new Error("No WeChat followers were returned by the Official Account API.");
    }

    if (followers.length === 1) {
      openIds = followers;
    } else if (sendAll) {
      openIds = followers;
    } else {
      console.log(
        `Found ${followers.length} followers. Set WECHAT_OPENID to one target or rerun with --all.`
      );
      console.log(`Masked OPENIDs: ${followers.map(maskOpenId).join(", ")}`);
      return;
    }
  }

  console.log(
    `Sending WeChat Official Account test message to ${openIds.length} recipient(s): ${openIds
      .map(maskOpenId)
      .join(", ")}`
  );

  for (const openId of openIds) {
    await sendWeChatOfficialAccountTextMessage({
      ...credentials,
      accessToken,
      openId,
      text: message,
    });
    console.log(`Sent to ${maskOpenId(openId)}`);
  }
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
