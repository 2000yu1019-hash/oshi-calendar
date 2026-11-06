"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromLocalInput } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/supabase/server";

async function requireUser() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function saveEvent(form: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(form, "id");
  const labels = form.getAll("dl_label").map(String);
  const ats = form.getAll("dl_at").map(String);
  const station = str(form, "station"), program = str(form, "program"), segment = str(form, "segment");
  const row = {
    title: str(form, "title") || "無題の予定",
    artist_ids: form.getAll("artist_ids").map(String),
    category: str(form, "category") || "other",
    source: str(form, "source") || "other",
    start_at: fromLocalInput(str(form, "start")),
    end_at: fromLocalInput(str(form, "end")),
    venue: str(form, "venue") || null,
    url: str(form, "url") || null,
    fc_only: form.get("fc_only") === "on",
    is_public: form.get("is_public") === "on",
    memo: str(form, "memo") || null,
    broadcast: station || program || segment ? { station, program, segment } : null,
    deadlines: ats.map((at, i) => ({ label: labels[i]?.trim() || "締切", at: fromLocalInput(at) })).filter((d) => d.at),
    updated_at: new Date().toISOString(),
  };
  let eventId = id;
  if (id) {
    const { error } = await supabase.from("events").update(row).eq("id", id).eq("owner_id", user.id);
    if (error) throw new Error("保存できませんでした: " + error.message);
  } else {
    const { data, error } = await supabase.from("events").insert({ ...row, owner_id: user.id, origin: "user" }).select("id").single();
    if (error) throw new Error("保存できませんでした: " + error.message);
    eventId = data.id;
  }
  const status = str(form, "status");
  if (status) await supabase.from("user_events").upsert({ user_id: user.id, event_id: eventId, status, updated_at: new Date().toISOString() });
  revalidatePath("/", "layout");
  redirect(`/events/${eventId}?saved=1`);
}

export async function deleteEvent(form: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("events").delete().eq("id", str(form, "id")).eq("owner_id", user.id);
  revalidatePath("/", "layout");
  redirect("/list");
}

/** 自動取得の予定を自分の画面から隠す */
export async function hideEvent(form: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("user_events").upsert({ user_id: user.id, event_id: str(form, "id"), hidden: true, updated_at: new Date().toISOString() });
  revalidatePath("/", "layout");
  redirect("/list");
}

export async function setStatus(eventId: string, status: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("user_events").upsert({ user_id: user.id, event_id: eventId, status, updated_at: new Date().toISOString() });
  revalidatePath("/", "layout");
}

export async function toggleFollow(artistId: string, follow: boolean) {
  const { supabase, user } = await requireUser();
  if (follow) await supabase.from("follows").upsert({ user_id: user.id, artist_id: artistId });
  else await supabase.from("follows").delete().eq("user_id", user.id).eq("artist_id", artistId);
  revalidatePath("/", "layout");
}

export async function saveArtist(form: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(form, "id");
  const links: Record<string, string> = {};
  for (const k of ["official", "x", "instagram", "tiktok", "youtube", "fc", "shop"]) if (str(form, `link_${k}`)) links[k] = str(form, `link_${k}`);
  const name = str(form, "name");
  if (!name) throw new Error("名前を入力してください");
  const row = {
    name,
    aliases: str(form, "aliases").split(/[,、\n]/).map((s) => s.trim()).filter(Boolean),
    color: str(form, "color") || "#e9d8a6",
    country: str(form, "country") || "JP",
    links,
  };
  let artistId = id;
  if (id) {
    const { error } = await supabase.from("artists").update(row).eq("id", id).eq("created_by", user.id);
    if (error) throw new Error("保存できませんでした: " + error.message);
  } else {
    const { data: existing } = await supabase.from("artists").select("id").ilike("name", name).maybeSingle();
    if (existing) artistId = existing.id;
    else {
      const { data, error } = await supabase.from("artists").insert({ ...row, created_by: user.id }).select("id").single();
      if (error) throw new Error("保存できませんでした: " + error.message);
      artistId = data.id;
      // ニュース検索とテレビ・ラジオ出演検索を自動で始める
      const q = [name, ...row.aliases].slice(0, 3).map((n) => `"${n}"`).join(" OR ");
      await createAdminClient().from("artist_sources").insert([
        { artist_id: artistId, kind: "google_news", query: `(${q}) (ライブ OR ツアー OR 出演 OR コラボ OR 発売 OR 限定)`, label: "ニュース" },
        { artist_id: artistId, kind: "tv", query: `(${q}) (出演 OR 生出演 OR ゲスト OR 番組 OR ラジオ)`, label: "テレビ・ラジオ" },
      ]);
    }
    await supabase.from("follows").upsert({ user_id: user.id, artist_id: artistId });
  }
  // 推し色は自分だけの設定としても保存する
  await supabase.from("follows").update({ color: row.color }).eq("user_id", user.id).eq("artist_id", artistId);
  revalidatePath("/", "layout");
  redirect(`/artists/${artistId}`);
}

export async function saveSettings(form: FormData) {
  const { supabase, user } = await requireUser();
  const nums = (k: string) => form.getAll(k).map(Number).filter((n) => n > 0).sort((a, b) => b - a);
  await supabase.from("profiles").update({
    display_name: str(form, "display_name") || null,
    remind_days: Number(str(form, "remind_days")) || 7,
    notify_push: form.get("notify_push") === "on",
    notify_email: form.get("notify_email") === "on",
    notify_line: form.get("notify_line") === "on",
    remind_before_start: nums("remind_before_start"),
    remind_before_deadline: nums("remind_before_deadline"),
  }).eq("id", user.id);
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function signOut() {
  const { supabase } = await getUser();
  await supabase.auth.signOut();
  redirect("/");
}
