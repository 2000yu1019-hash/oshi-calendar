import webpush from "web-push";

export type Message = { title: string; body: string; url: string };

let vapidReady = false;
function setupVapid() {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  vapidReady = true;
  return true;
}

/** 戻り値 false = 購読が無効になっているので削除してよい */
export async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, msg: Message): Promise<boolean> {
  if (!setupVapid()) return true;
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(msg));
    return true;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    return !(code === 404 || code === 410);
  }
}

export async function sendEmail(to: string, msg: Message) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "推し活カレンダー <noreply@example.com>",
      to,
      subject: msg.title,
      text: `${msg.body}\n\n${msg.url}\n\n通知の設定: ${process.env.NEXT_PUBLIC_SITE_URL}/settings`,
    }),
  });
}

export async function sendLine(lineUserId: string, msg: Message | string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;
  const text = typeof msg === "string" ? msg : `${msg.title}\n${msg.body}\n${msg.url}`;
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ to: lineUserId, messages: [{ type: "text", text }] }),
  });
}
