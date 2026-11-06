import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORY_LABEL } from "../constants";
import { beforeLabel, fmt } from "../dates";
import type { EventRow, Profile } from "../types";
import { sendEmail, sendLine, sendPush, type Message } from "./channels";

type Due = { key: string; msg: Message };

/** これから通知すべきもの。通知時刻を過ぎていて、対象がまだ先で、6時間以内に通知時刻を迎えたもの */
export function dueReminders(events: EventRow[], profile: Pick<Profile, "remind_before_start" | "remind_before_deadline">, nameOf: (id: string) => string, now = new Date(), site = ""): Due[] {
  const out: Due[] = [];
  const t = now.getTime();
  const check = (at: string, offsets: number[], keyBase: string, make: (off: number) => Message) => {
    const target = Date.parse(at);
    if (!(target > t)) return;
    for (const off of offsets) {
      const fire = target - off * 6e4;
      if (fire <= t && fire > t - 6 * 36e5) out.push({ key: `${keyBase}:${off}`, msg: make(off) });
    }
  };
  for (const e of events) {
    const who = e.artist_ids.map(nameOf).filter(Boolean).join("×") || "推し";
    const url = `${site}/events/${e.id}`;
    if (e.start_at) {
      check(e.start_at, profile.remind_before_start, `${e.id}:start`, (off) => ({
        title: `${beforeLabel(off)}｜${who}`,
        body: `${e.title}\n${fmt(e.start_at)}${e.venue ? ` ・ ${e.venue}` : ""}${e.broadcast?.program ? ` ・ ${e.broadcast.station ?? ""} ${e.broadcast.program}` : ""}（${CATEGORY_LABEL[e.category] ?? ""}）`,
        url,
      }));
    }
    e.deadlines.forEach((d, i) =>
      check(d.at, profile.remind_before_deadline, `${e.id}:dl${i}`, (off) => ({
        title: `⏰${d.label}まで${beforeLabel(off).replace("前", "")}｜${who}`,
        body: `${e.title}\n${d.label}: ${fmt(d.at)}`,
        url,
      })),
    );
  }
  return out;
}

export async function runReminders(db: SupabaseClient, now = new Date()) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const horizon = new Date(now.getTime() + 120 * 864e5).toISOString();
  const { data: artists } = await db.from("artists").select("id,name");
  const nameOf = (id: string) => artists?.find((a) => a.id === id)?.name ?? "";
  const { data: profiles } = await db.from("profiles").select("*");
  let sent = 0;

  for (const p of (profiles ?? []) as Profile[]) {
    const [{ data: follows }, { data: statuses }, { data: subs }, { data: userRes }] = await Promise.all([
      db.from("follows").select("artist_id").eq("user_id", p.id),
      db.from("user_events").select("event_id,status,hidden").eq("user_id", p.id),
      db.from("push_subscriptions").select("*").eq("user_id", p.id),
      db.auth.admin.getUserById(p.id),
    ]);
    const followIds = (follows ?? []).map((f) => f.artist_id);
    const skip = new Set((statuses ?? []).filter((s) => s.status === "skip" || s.hidden).map((s) => s.event_id));
    // 締切は開始より前に来るので、開始が少し先の予定まで含めて取り、細かい判定は dueReminders で行う
    let q = db.from("events").select("*").gte("start_at", new Date(now.getTime() - 864e5).toISOString()).lte("start_at", horizon);
    q = followIds.length ? q.or(`owner_id.eq.${p.id},and(artist_ids.ov.{${followIds.join(",")}},or(owner_id.is.null,is_public.eq.true))`) : q.eq("owner_id", p.id);
    const { data: events } = await q.limit(500);
    const due = dueReminders(((events ?? []) as EventRow[]).filter((e) => !skip.has(e.id)), p, nameOf, now, site);
    if (!due.length) continue;

    const { data: logged } = await db.from("notification_log").select("key").eq("user_id", p.id).in("key", due.map((d) => d.key));
    const done = new Set((logged ?? []).map((l) => l.key));
    for (const d of due.filter((x) => !done.has(x.key))) {
      // 先に記録して、二重送信を防ぐ
      const { error } = await db.from("notification_log").insert({ user_id: p.id, key: d.key });
      if (error) continue;
      if (p.notify_push) for (const s of subs ?? []) if (!(await sendPush(s, d.msg))) await db.from("push_subscriptions").delete().eq("id", s.id);
      if (p.notify_email && userRes.user?.email) await sendEmail(userRes.user.email, d.msg);
      if (p.notify_line && p.line_user_id) await sendLine(p.line_user_id, d.msg);
      sent++;
    }
  }
  return { sent };
}
