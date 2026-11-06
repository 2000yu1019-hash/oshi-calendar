import Link from "next/link";
import { notFound } from "next/navigation";
import { EventRow } from "@/components/EventRow";
import { FollowButton } from "@/components/FollowButton";
import { LINK_KINDS } from "@/lib/constants";
import { fmt, isPast } from "@/lib/dates";
import { loadFeed } from "@/lib/feed";
import { getUser } from "@/lib/supabase/server";
import { addSource } from "../sources";

export const dynamic = "force-dynamic";
const KIND = { rss: "RSS", google_news: "ニュース検索", tv: "テレビ・ラジオ出演検索" } as Record<string, string>;

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { events, artists, followIds } = await loadFeed(supabase, user!.id, { artistId: id });
  const a = artists.find((x) => x.id === id);
  if (!a) notFound();
  const { data: sources } = await supabase.from("artist_sources").select("*").eq("artist_id", id);
  const upcoming = events.filter((e) => !isPast(e));
  const past = events.filter((e) => isPast(e)).reverse().slice(0, 10);

  return (
    <div className="view">
      <div className="card acard" style={{ ["--c" as string]: a.color }}>
        <div className="ahead">
          <span className="penlight" style={{ height: 56 }} />
          <div style={{ minWidth: 0, flex: 1 }}><h1 style={{ fontSize: 24 }}>{a.name}</h1>{a.aliases.length > 0 && <div className="hint">{a.aliases.join("・")}</div>}</div>
        </div>
        <div className="links">{LINK_KINDS.filter(([k]) => a.links[k]).map(([k, l]) => <a key={k} href={a.links[k]} target="_blank" rel="noopener noreferrer">{l} ↗</a>)}</div>
        <div className="chips">
          <FollowButton artistId={a.id} following={followIds.includes(a.id)} />
          <Link className="btn sm" href={`/events/new?artist=${a.id}`}>＋ 予定を追加</Link>
          {a.created_by === user!.id && <Link className="btn sm ghost" href={`/artists/${a.id}/edit`}>編集</Link>}
        </div>
      </div>

      <section>
        <div className="sechead"><h2>これからの予定（{upcoming.length}件）</h2></div>
        <div className="list">{upcoming.length ? upcoming.map((e) => <EventRow key={e.id} e={e} artists={artists} />) : <div className="empty">これからの予定はまだありません</div>}</div>
      </section>
      {past.length > 0 && (
        <section>
          <div className="sechead"><h2>最近の予定</h2></div>
          <div className="list">{past.map((e) => <EventRow key={e.id} e={e} artists={artists} />)}</div>
        </section>
      )}

      <section className="card" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ fontSize: 16 }}>自動取得している情報源</h2>
        <ul className="hint" style={{ margin: 0, paddingLeft: "1.2em" }}>
          {(sources ?? []).map((s) => <li key={s.id}>{KIND[s.kind] ?? s.kind}{s.label ? `（${s.label}）` : ""}{s.url ? ` ${s.url}` : ""} ・ 最終確認 {s.last_fetched_at ? fmt(s.last_fetched_at) : "まだ"}</li>)}
          {!sources?.length && <li>次回の自動取得からニュース検索とテレビ・ラジオ出演検索が始まります</li>}
        </ul>
        <form action={addSource} className="filters">
          <input type="hidden" name="artist_id" value={a.id} />
          <input type="url" id="src-url" name="url" className="field" placeholder="公式サイトのRSSのURL" required style={{ flex: 1, minWidth: 200 }} aria-label="RSSのURL" />
          <input type="text" id="src-label" name="label" className="field" placeholder="名前（例: 公式ニュース）" aria-label="情報源の名前" />
          <button className="btn">追加</button>
        </form>
      </section>
    </div>
  );
}
