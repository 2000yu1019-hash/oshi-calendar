import { NextResponse } from "next/server";
import { parseAnnouncement } from "@/lib/claude";
import { fromLocalInput } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 会員メールの取り込み。ユーザーは FC・メルマガのメールを
 * u-<inbound_token>@INBOUND_MAIL_DOMAIN へ自動転送しておく。
 * 受信サービス（Cloudflare Email Workers / Postmark / Resend Inbound など）から
 * {to, from, subject, text} の JSON をこのURLに POST してもらう。
 */
export async function POST(req: Request) {
  if (!process.env.INBOUND_MAIL_SECRET || req.headers.get("x-inbound-secret") !== process.env.INBOUND_MAIL_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const to: string = (Array.isArray(body.to) ? body.to[0] : body.to ?? body.To ?? "").toString();
  const token = to.match(/u-([a-f0-9]{16})@/i)?.[1];
  if (!token) return NextResponse.json({ error: "unknown recipient" }, { status: 404 });
  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("id").eq("inbound_token", token.toLowerCase()).maybeSingle();
  if (!profile) return NextResponse.json({ error: "unknown recipient" }, { status: 404 });

  const subject = body.subject ?? body.Subject ?? "";
  const text = (body.text ?? body.TextBody ?? body.plain ?? "").toString();
  const { data: artists } = await db.from("artists").select("id,name,aliases");
  const { draft } = await parseAnnouncement(`件名: ${subject}\nFrom: ${body.from ?? body.From ?? ""}\n\n${text}`.slice(0, 8000), (artists ?? []).flatMap((a) => [a.name, ...(a.aliases ?? [])]));
  const artist = (artists ?? []).find((a) => draft.artist && [a.name, ...(a.aliases ?? [])].some((n: string) => draft.artist.includes(n) || n.includes(draft.artist)));

  const { data, error } = await db.from("events").insert({
    owner_id: profile.id,
    artist_ids: artist ? [artist.id] : [],
    title: draft.title || subject || "会員メールのお知らせ",
    category: draft.category,
    start_at: fromLocalInput(draft.start),
    end_at: fromLocalInput(draft.end),
    venue: draft.venue || null,
    url: draft.url || null,
    source: "mail",
    fc_only: true,
    memo: [draft.memo, `メール件名: ${subject}`].filter(Boolean).join("\n"),
    broadcast: draft.station || draft.program ? { station: draft.station, program: draft.program, segment: draft.segment } : null,
    deadlines: draft.deadlines.map((d) => ({ label: d.label, at: fromLocalInput(d.at) })).filter((d) => d.at),
    origin: "mail",
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
