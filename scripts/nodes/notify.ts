import {
  buildDailyUrl,
  buildFeishuDigest,
  buildSummaryPreview,
  buildWeChatDigest,
  hasSuccessfulDelivery,
  readDeliveryRecords,
  sendFeishuTextMessage,
  sendWeChatOfficialAccountTextMessage,
  upsertDeliveryRecord,
} from "../lib/delivery.js";
import type {
  DeliveryRecord,
  WeChatOfficialAccountConfig,
} from "../lib/types.js";
import type { PipelineStateType } from "../state.js";

export async function notifyNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const {
    platformConfig,
    platformContents,
    date,
    errors,
    dailySummary,
    insights,
    config,
  } = state;
  const brief = platformContents?.brief ?? `AI 日报 ${date} 已发布`;

  const notifications: Promise<void>[] = [];

  if (
    platformConfig?.feishu?.enabled &&
    platformConfig.feishu.webhookUrl &&
    date &&
    insights.length > 0
  ) {
    notifications.push(
      deliverFeishuDigest({
        date,
        reportName: config?.reportName ?? "个人日报",
        dailySummary: dailySummary || brief,
        insights,
        reportBaseUrl: platformConfig.reportBaseUrl,
        webhookUrl: platformConfig.feishu.webhookUrl,
        targetName: platformConfig.feishu.targetName,
        maxHighlights: platformConfig.feishu.maxHighlights,
      }).catch((err) => {
        console.warn("[notify] Feishu failed:", err);
      })
    );
  }

  if (platformConfig?.telegram?.enabled && platformConfig.telegram.botToken) {
    notifications.push(
      sendTelegram(
        platformConfig.telegram.botToken,
        platformConfig.telegram.chatId,
        brief
      )
    );
  }

  if (platformConfig?.wechat?.enabled && platformConfig.wechat.webhookUrl) {
    notifications.push(sendWechat(platformConfig.wechat.webhookUrl, brief));
  }

  const wechatOfficialAccount = platformConfig?.wechat?.officialAccount;
  if (
    platformConfig?.wechat?.enabled &&
    wechatOfficialAccount?.enabled &&
    date &&
    insights.length > 0
  ) {
    const openIds = resolveWeChatOpenIds(wechatOfficialAccount);
    if (openIds.length === 0) {
      console.warn(
        "[notify] WeChat Official Account is enabled but no OPENID is configured"
      );
    }

    for (const [index, openId] of openIds.entries()) {
      notifications.push(
        deliverWeChatOfficialAccountDigest({
          date,
          reportName: config?.reportName ?? "涓汉鏃ユ姤",
          dailySummary: dailySummary || brief,
          insights,
          reportBaseUrl: platformConfig.reportBaseUrl,
          officialAccount: wechatOfficialAccount,
          openId,
          targetName: buildWeChatTargetName(
            wechatOfficialAccount.targetName,
            index,
            openIds.length
          ),
        }).catch((err) => {
          console.warn("[notify] WeChat Official Account failed:", err);
        })
      );
    }
  }

  if (errors.length > 0) {
    const errorMsg = `Pipeline errors (${date}):\n${errors
      .map((error) => `- [${error.node}] ${error.message}`)
      .join("\n")}`;
    if (platformConfig?.telegram?.enabled && platformConfig.telegram.botToken) {
      notifications.push(
        sendTelegram(
          platformConfig.telegram.botToken,
          platformConfig.telegram.chatId,
          errorMsg
        )
      );
    }
  }

  await Promise.allSettled(notifications);
  console.log(`[notify] Sent ${notifications.length} notifications`);
  return {};
}

async function sendTelegram(
  token: string,
  chatId: string,
  text: string
): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
  if (!res.ok) {
    console.warn(`[notify] Telegram error: ${res.status}`);
  }
}

async function sendWechat(webhookUrl: string, text: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msgtype: "text", text: { content: text } }),
  });
  if (!res.ok) {
    console.warn(`[notify] WeChat error: ${res.status}`);
  }
}

function resolveWeChatOpenIds(
  config: WeChatOfficialAccountConfig
): string[] {
  const candidates = [
    config.openId,
    ...(config.openIds ?? []),
    process.env.WECHAT_OPENIDS,
  ];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    for (const item of (candidate ?? "").split(",")) {
      const openId = item.trim();
      if (openId) {
        seen.add(openId);
      }
    }
  }

  return [...seen];
}

function buildWeChatTargetName(
  targetName: string | undefined,
  index: number,
  total: number
): string {
  const base = targetName?.trim() || "official-account";
  return total > 1 ? `${base}-${index + 1}` : base;
}

async function deliverFeishuDigest(params: {
  date: string;
  reportName: string;
  dailySummary: string;
  insights: PipelineStateType["insights"];
  reportBaseUrl?: string;
  webhookUrl: string;
  targetName?: string;
  maxHighlights?: number;
}): Promise<void> {
  const target = params.targetName?.trim() || "default";
  if (await hasSuccessfulDelivery(params.date, "feishu", target)) {
    console.log(
      `[notify] Feishu already sent for ${params.date}/${target}, skipping`
    );
    return;
  }

  const existingRecord = (await readDeliveryRecords(params.date)).find(
    (record) => record.channel === "feishu" && record.target === target
  );
  const attempts = (existingRecord?.attempts ?? 0) + 1;
  const dailyUrl = buildDailyUrl(params.reportBaseUrl, params.date);
  const messageText = buildFeishuDigest({
    reportName: params.reportName,
    date: params.date,
    dailySummary: params.dailySummary,
    insights: params.insights,
    dailyUrl,
    maxHighlights: params.maxHighlights,
  });
  const baseRecord: DeliveryRecord = {
    date: params.date,
    channel: "feishu",
    target,
    status: "pending",
    attempts,
    summaryPreview: buildSummaryPreview(params.dailySummary),
    url: dailyUrl,
  };

  await upsertDeliveryRecord(baseRecord);

  try {
    const externalId = await sendFeishuTextMessage(
      params.webhookUrl,
      messageText
    );
    await upsertDeliveryRecord({
      ...baseRecord,
      status: "sent",
      sentAt: new Date().toISOString(),
      externalId,
    });
  } catch (err) {
    await upsertDeliveryRecord({
      ...baseRecord,
      status: "failed",
      lastError: (err as Error).message,
    });
    throw err;
  }
}

async function deliverWeChatOfficialAccountDigest(params: {
  date: string;
  reportName: string;
  dailySummary: string;
  insights: PipelineStateType["insights"];
  reportBaseUrl?: string;
  officialAccount: WeChatOfficialAccountConfig;
  openId: string;
  targetName: string;
}): Promise<void> {
  const target = params.targetName;
  if (
    await hasSuccessfulDelivery(
      params.date,
      "wechat-official-account",
      target
    )
  ) {
    console.log(
      `[notify] WeChat Official Account already sent for ${params.date}/${target}, skipping`
    );
    return;
  }

  const existingRecord = (await readDeliveryRecords(params.date)).find(
    (record) =>
      record.channel === "wechat-official-account" &&
      record.target === target
  );
  const attempts = (existingRecord?.attempts ?? 0) + 1;
  const dailyUrl = buildDailyUrl(params.reportBaseUrl, params.date);
  const messageText = buildWeChatDigest({
    reportName: params.reportName,
    date: params.date,
    dailySummary: params.dailySummary,
    insights: params.insights,
    dailyUrl,
    maxHighlights: params.officialAccount.maxHighlights,
  });
  const baseRecord: DeliveryRecord = {
    date: params.date,
    channel: "wechat-official-account",
    target,
    status: "pending",
    attempts,
    summaryPreview: buildSummaryPreview(params.dailySummary),
    url: dailyUrl,
  };

  await upsertDeliveryRecord(baseRecord);

  try {
    const externalId = await sendWeChatOfficialAccountTextMessage({
      appId: params.officialAccount.appId,
      appSecret: params.officialAccount.appSecret || process.env.WECHAT_API_KEY,
      accessToken: params.officialAccount.accessToken,
      openId: params.openId,
      text: messageText,
    });
    await upsertDeliveryRecord({
      ...baseRecord,
      status: "sent",
      sentAt: new Date().toISOString(),
      externalId,
    });
  } catch (err) {
    await upsertDeliveryRecord({
      ...baseRecord,
      status: "failed",
      lastError: (err as Error).message,
    });
    throw err;
  }
}
