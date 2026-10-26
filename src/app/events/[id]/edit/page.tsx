import { notFound } from "next/navigation";
import { EventForm } from "@/components/EventForm";
import { toLocalInput } from "@/lib/dates";
import { getUser } from "@/lib/supabase/server";
import type { Artist, EventRow } from "@/lib/types";

export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const [{ data: ev }, { data: st }, { data: all }, { data: follows }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    supabase.from("user_events").select("status").eq("user_id", user!.id).eq("event_id", id).maybeSingle(),
    supabase.from("artists").select("*").order("name"),
    supabase.from("follows").select("artist_id").eq("user_id", user!.id),
  ]);
  if (!ev || ev.owner_id !== user!.id) notFound();
  const e = ev as EventRow;
  const ids = new Set([...(follows ?? []).map((f) => f.artist_id), ...e.artist_ids]);
  return (
    <div className="view" style={{ maxWidth: 760 }}>
      <EventForm artists={((all ?? []) as Artist[]).filter((a) => ids.has(a.id))} init={{
        id: e.id, title: e.title, artist_ids: e.artist_ids, category: e.category, source: e.source,
        start: toLocalInput(e.start_at), end: toLocalInput(e.end_at), venue: e.venue ?? "", url: e.url ?? "",
        fc_only: e.fc_only, is_public: e.is_public, memo: e.memo ?? "", status: st?.status ?? "",
        station: e.broadcast?.station, program: e.broadcast?.program, segment: e.broadcast?.segment,
        deadlines: e.deadlines.map((d) => ({ label: d.label, at: toLocalInput(d.at) })),
      }} />
    </div>
  );
}
