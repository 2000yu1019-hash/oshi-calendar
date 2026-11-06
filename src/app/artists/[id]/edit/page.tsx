import { notFound } from "next/navigation";
import { ArtistForm } from "@/components/ArtistForm";
import { getUser } from "@/lib/supabase/server";
import type { Artist } from "@/lib/types";

export default async function EditArtist({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data } = await supabase.from("artists").select("*").eq("id", id).maybeSingle();
  if (!data || data.created_by !== user!.id) notFound();
  return <div className="view"><ArtistForm a={data as Artist} /></div>;
}
