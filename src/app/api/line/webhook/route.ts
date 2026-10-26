import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendLine } from "@/lib/notify/channels";
import { createAdminClient } from "@/lib/supabase/admin";

// LINE公式アカウントに、設定画面に出る8文字の連携コードを送ると通知先として登録される
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.LINE_CHANNEL_SECRET;
  const sig = req.headers.get("x-line-signature") ?? "";
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const expected = createHmac("sha256", secret).update(raw).digest("base64");
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  const db = createAdminClient();
  for (const ev of JSON.parse(raw).events ?? []) {
    const lineId = ev.source?.userId;
    if (ev.type !== "message" || ev.message?.type !== "text" || !lineId) continue;
    const code = String(ev.message.text).trim().toUpperCase();
    const { data } = await db.from("profiles").update({ line_user_id: lineId, notify_line: true }).eq("line_link_code", code).select("id");
    await sendLine(lineId, data?.length ? "推し活カレンダーと連携しました。締切や出演の前にここでお知らせします。" : "連携コードが見つかりませんでした。設定画面に表示されている8文字のコードを送ってください。");
  }
  return NextResponse.json({ ok: true });
}
