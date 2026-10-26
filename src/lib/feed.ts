import type { SupabaseClient } from "@supabase/supabase-js";
import type { Artist, EventRow, EventWithStatus } from "./types";

/** フォロー中の推しの予定と、自分で登録した予定。参加状況つき */
export async function loadFeed(db: SupabaseClient, userId: string, opts: { from?: string; to?: string; artistId?: string } = {}) {
  const [{ data: follows }, { data: artists }, { data: statuses }] = await Promise.all([
    db.from("follows").select("artist_id,color").eq("user_id", userId),
    db.from("artists").select("*").order("name"),
    db.from("user_events").select("event_id,status,hidden").eq("user_id", userId),
  ]);
  const followIds = (follows ?? []).map((f) => f.artist_id as string);
  const ids = opts.artistId ? [opts.artistId] : followIds;
  let q = db.from("events").select("*").order("start_at", { ascending: true, nullsFirst: false });
  q = ids.length ? q.or(`owner_id.eq.${userId},artist_ids.ov.{${ids.join(",")}}`) : q.eq("owner_id", userId);
  if (opts.artistId) q = q.contains("artist_ids", [opts.artistId]);
  if (opts.from) q = q.or(`start_at.gte.${opts.from},end_at.gte.${opts.from}`);
  if (opts.to) q = q.lte("start_at", opts.to);
  const { data: events } = await q.limit(1000);
  const st = new Map((statuses ?? []).map((s) => [s.event_id as string, s]));
  const colorOverride = new Map((follows ?? []).filter((f) => f.color).map((f) => [f.artist_id as string, f.color as string]));
  const allArtists = ((artists ?? []) as Artist[]).map((a) => ({ ...a, color: colorOverride.get(a.id) ?? a.color }));
  const list: EventWithStatus[] = ((events ?? []) as EventRow[])
    .filter((e) => !st.get(e.id)?.hidden)
    .map((e) => ({ ...e, status: (st.get(e.id)?.status as string) ?? "" }));
  return { events: list, artists: allArtists, followIds };
}
