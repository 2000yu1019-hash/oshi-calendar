import { EventForm } from "@/components/EventForm";
import { getUser } from "@/lib/supabase/server";
import type { Artist } from "@/lib/types";

// スマホの「共有」からも開ける（manifest の share_target が title/text/url を渡す）
export default async function NewEvent({ searchParams }: { searchParams: Promise<{ date?: string; artist?: string; title?: string; text?: string; url?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getUser();
  const [{ data: follows }, { data: all }] = await Promise.all([
    supabase.from("follows").select("artist_id,color").eq("user_id", user!.id),
    supabase.from("artists").select("*").order("name"),
  ]);
  const ids = new Set((follows ?? []).map((f) => f.artist_id));
  const artists = ((all ?? []) as Artist[]).filter((a) => ids.has(a.id) || a.id === sp.artist)
    .map((a) => ({ ...a, color: follows?.find((f) => f.artist_id === a.id)?.color ?? a.color }));
  const shared = [sp.title, sp.text, sp.url].filter(Boolean).join("\n");
  return (
    <div className="view" style={{ maxWidth: 760 }}>
      <EventForm artists={artists} pasteText={shared || undefined}
        init={{ artist_ids: sp.artist ? [sp.artist] : [], start: sp.date ? `${sp.date}T18:00` : "", url: sp.url }} />
    </div>
  );
}
