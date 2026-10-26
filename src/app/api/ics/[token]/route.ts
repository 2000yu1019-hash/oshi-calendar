import { buildIcs } from "@/lib/ics";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadFeed } from "@/lib/feed";

// Googleカレンダーやスマホのカレンダーで「URLで追加」すると、自動で更新され続ける
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("*").eq("ics_token", token.replace(/\.ics$/, "")).maybeSingle();
  if (!profile) return new Response("not found", { status: 404 });
  const from = new Date(Date.now() - 30 * 864e5).toISOString();
  const { events, artists } = await loadFeed(db, profile.id, { from });
  const visible = events.filter((e) => e.status !== "skip" && (e.owner_id === profile.id || e.owner_id === null || e.is_public));
  const ics = buildIcs(visible, (id) => artists.find((a) => a.id === id)?.name ?? "", {
    startAlarms: profile.remind_before_start, deadlineAlarms: profile.remind_before_deadline, siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  });
  return new Response(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "public, max-age=900" } });
}
