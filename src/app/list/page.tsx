import { ArtistFilter } from "@/components/ArtistFilter";
import { EventRow, artistNames } from "@/components/EventRow";
import { CATEGORIES, SOURCES } from "@/lib/constants";
import { isPast, jst } from "@/lib/dates";
import { loadFeed } from "@/lib/feed";
import { getUser } from "@/lib/supabase/server";
import type { EventWithStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type SP = { q?: string; cat?: string; src?: string; range?: string; a?: string; st?: string };

export default async function ListPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const range = sp.range ?? "upcoming";
  const { supabase, user } = await getUser();
  const { events, artists, followIds } = await loadFeed(supabase, user!.id, { artistId: sp.a });
  const q = (sp.q ?? "").trim().toLowerCase();
  // 「テレビ出演」を選んだときはラジオも一緒に見たいことが多いので、出演系はまとめて出す
  const cats = sp.cat === "tv" || sp.cat === "radio" ? ["tv", "radio"] : sp.cat ? [sp.cat] : null;
  const list = events.filter((e) => {
    if (cats && !cats.includes(e.category)) return false;
    if (sp.src && e.source !== sp.src) return false;
    if (sp.st && e.status !== sp.st) return false;
    const past = isPast(e);
    if (range === "upcoming" && past) return false;
    if (range === "past" && !past) return false;
    if (q && ![e.title, e.venue, e.memo, e.broadcast?.program, e.broadcast?.station, artistNames(e, artists)].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
  if (range === "past") list.reverse();
  const groups = new Map<string, EventWithStatus[]>();
  for (const e of list) {
    const k = e.start_at ? `${jst(new Date(e.start_at)).y}年${jst(new Date(e.start_at)).m}月` : "日付未定";
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const keep = { q: sp.q, cat: sp.cat, src: sp.src, range: sp.range, st: sp.st };

  return (
    <div className="view">
      <form className="filters" action="/list">
        {sp.a && <input type="hidden" name="a" value={sp.a} />}
        <input type="search" id="q" name="q" className="field" placeholder="タイトル・会場・番組名で検索" defaultValue={sp.q} aria-label="検索" />
        <select id="cat" name="cat" className="field" defaultValue={sp.cat ?? ""} aria-label="種類">
          <option value="">すべての種類</option>
          {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select id="src" name="src" className="field" defaultValue={sp.src ?? ""} aria-label="情報源">
          <option value="">すべての情報源</option>
          {SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select id="range" name="range" className="field" defaultValue={range} aria-label="期間">
          <option value="upcoming">これから</option><option value="past">過去</option><option value="all">すべて</option>
        </select>
        <button className="btn">絞り込む</button>
      </form>
      <ArtistFilter artists={artists.filter((a) => followIds.includes(a.id))} current={sp.a} base="/list" keep={keep} />
      <div className="hint">{list.length}件</div>
      {groups.size ? [...groups].map(([k, v]) => (
        <section key={k}>
          <div className="sechead"><h2 className="num">{k}</h2></div>
          <div className="list">{v.map((e) => <EventRow key={e.id} e={e} artists={artists} />)}</div>
        </section>
      )) : <div className="empty">条件に合う予定はありません</div>}
    </div>
  );
}
