"use server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** 公式サイトのRSSなど、自動取得の情報源を追加する（誰でも追加できる。重複は無視） */
export async function addSource(form: FormData) {
  const { user } = await getUser();
  if (!user) return;
  const artistId = String(form.get("artist_id"));
  const url = String(form.get("url") ?? "").trim();
  if (!/^https?:\/\//.test(url)) return;
  const db = createAdminClient();
  const { data: dup } = await db.from("artist_sources").select("id").eq("artist_id", artistId).eq("url", url).limit(1);
  if (!dup?.length) await db.from("artist_sources").insert({ artist_id: artistId, kind: "rss", url, label: String(form.get("label") ?? "RSS") || "RSS" });
  revalidatePath(`/artists/${artistId}`);
}
