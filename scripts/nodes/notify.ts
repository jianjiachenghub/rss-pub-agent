import type { PipelineStateType } from "../state.js";

export async function notifyNode(
  state: PipelineStateType
): Promise<Partial<PipelineStateType>> {
  const { platformConfig, platformContents, date, errors } = state;
  const brief = platformContents?.brief ?? `AI 日报 ${date} 已发布`;

  const notifications: Promise<void>[] = [];

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
    notifications.push(
      sendWechat(platformConfig.wechat.webhookUrl, brief)
    );
  }

  if (errors.length > 0) {
    const errorMsg = `Pipeline errors (${date}):\n${errors.map((e) => `- [${e.node}] ${e.message}`).join("\n")}`;
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
  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    }
  );
  if (!res.ok) {
    console.warn(`[notify] Telegram error: ${res.status}`);
  }
}

async function sendWechat(
  webhookUrl: string,
  text: string
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msgtype: "text", text: { content: text } }),
  });
  if (!res.ok) {
    console.warn(`[notify] WeChat error: ${res.status}`);
  }
}
