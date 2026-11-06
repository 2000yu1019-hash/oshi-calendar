import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyNews, type NewsItem } from "../claude";
import { fromLocalInput, ymd } from "../dates";
import { fetchFeed, googleNewsUrl } from "./rss";

type Source = { id: string; artist_id: string; kind: string; url: string | null; query: string | null; last_fetched_at: string | null };

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 24);

// テレビ・ラジオ出演はアーティスト本人より局・番組側が先に告知することが多いので、別の検索で拾う
const TV_QUERY = (name: string) => `"${name}" (出演 OR 生出演 OR ゲスト OR 番組 OR ラジオ OR オンエア)`;

function feedUrl(s: Source, artistName: string): string | null {
  if (s.kind === "rss") return s.url;
  if (s.kind === "google_news") return googleNewsUrl(s.query || `"${artistName}"`, /[a-z]/i.test(s.query ?? "") && !/[ぁ-んァ-ン一-龥]/.test(s.query ?? "") ? "en" : "ja");
  if (s.kind === "tv") return googleNewsUrl(s.query || TV_QUERY(artistName));
  return null;
}

/** 全アーティストの情報源を巡回して、新しい予定を events に追加する */
export async function collectAll(db: SupabaseClient, opts: { maxSources?: number } = {}) {
  const { data: artists } = await db.from("artists").select("id,name");
  const { data: sources } = await db.from("artist_sources").select("*").order("last_fetched_at", { ascending: true, nullsFirst: true }).limit(opts.maxSources ?? 30);
  const names = new Map((artists ?? []).map((a) => [a.id as string, a.name as string]));
  const report: { source: string; fetched: number; added: number; error?: string }[] = [];

  // 番組表検索が未登録のアーティストには自動で追加する
  for (const a of artists ?? []) {
    if (!(sources ?? []).some((s) => s.artist_id === a.id && s.kind === "tv")) {
      await db.from("artist_sources").insert({ artist_id: a.id, kind: "tv", label: "テレビ・ラジオ" });
    }
  }

  for (const s of (sources ?? []) as Source[]) {
    const name = names.get(s.artist_id) ?? "";
    const url = feedUrl(s, name);
    if (!url) continue;
    try {
      const since = s.last_fetched_at ? Date.parse(s.last_fetched_at) - 36e5 : Date.now() - 14 * 864e5;
      const items: NewsItem[] = (await fetchFeed(url)).filter((it) => it.title && (!it.published || Date.parse(it.published) >= since)).slice(0, 40);

      // 既に取り込んだ記事は除く
      const ids = items.map((it) => `news:${hash(it.link || it.title)}`);
      const { data: seen } = await db.from("events").select("external_id").in("external_id", ids.length ? ids : ["-"]);
      const seenSet = new Set((seen ?? []).map((r) => r.external_id));
      const fresh = items.filter((_, i) => !seenSet.has(ids[i]));

      const found = await classifyNews(name, fresh);
      let added = 0;
      for (const { item, draft } of found) {
        const start = fromLocalInput(draft.start);
        if (!start) continue;
        // 同じ日・同じ種類の予定がすでにあれば重複とみなす
        const { data: dup } = await db.from("events").select("id").contains("artist_ids", [s.artist_id]).eq("category", draft.category)
          .gte("start_at", `${ymd(start)}T00:00:00+09:00`).lte("start_at", `${ymd(start)}T23:59:59+09:00`).limit(1);
        if (dup?.length) continue;
        const { error } = await db.from("events").insert({
          artist_ids: [s.artist_id],
          title: draft.title || item.title,
          category: draft.category,
          start_at: start,
          end_at: fromLocalInput(draft.end),
          venue: draft.venue || null,
          url: item.link,
          source: s.kind === "tv" ? "tv_guide" : "news",
          fc_only: draft.fc_only,
          memo: [draft.memo, `出典: ${item.source || "ニュース"}「${item.title}」`].filter(Boolean).join("\n"),
          broadcast: draft.station || draft.program ? { station: draft.station, program: draft.program, segment: draft.segment } : null,
          deadlines: draft.deadlines.map((d) => ({ label: d.label, at: fromLocalInput(d.at) })).filter((d) => d.at),
          origin: "auto",
          external_id: `news:${hash(item.link || item.title)}`,
        });
        if (!error) added++;
      }
      await db.from("artist_sources").update({ last_fetched_at: new Date().toISOString() }).eq("id", s.id);
      report.push({ source: `${name} / ${s.kind}`, fetched: items.length, added });
    } catch (e) {
      report.push({ source: `${name} / ${s.kind}`, fetched: 0, added: 0, error: String(e) });
    }
  }
  return report;
}
