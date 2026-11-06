import Link from "next/link";
import { FollowButton } from "@/components/FollowButton";
import { LINK_KINDS } from "@/lib/constants";
import { isPast } from "@/lib/dates";
import { loadFeed } from "@/lib/feed";
import { getUser } from "@/lib/supabase/server";
import type { Artist, EventWithStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ArtistsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase, user } = await getUser();
  const { events, artists, followIds } = await loadFeed(supabase, user!.id);
  const mine = artists.filter((a) => followIds.includes(a.id));
  const needle = (q ?? "").trim().toLowerCase();
  const others = artists.filter((a) => !followIds.includes(a.id) && (!needle || [a.name, ...a.aliases].some((n) => n.toLowerCase().includes(needle))));

  return (
    <div className="view">
      <section>
        <div className="sechead"><h2>あなたの推し（{mine.length}組）</h2><Link className="btn primary" href="/artists/new">＋ 新しい推しを登録</Link></div>
        {mine.length ? <div className="agrid">{mine.map((a) => <ArtistCard key={a.id} a={a} events={events} following />)}</div>
          : <div className="empty">まだ推しがいません。下のリストから選ぶか、新しく登録してください。何組でも登録できます。</div>}
      </section>
      <section>
        <div className="sechead"><h2>みんなが登録した推し</h2></div>
        <form className="filters" action="/artists" style={{ marginBottom: 12 }}>
          <input type="search" id="aq" name="q" className="field" defaultValue={q} placeholder="アーティスト名で探す" aria-label="アーティスト名で探す" />
          <button className="btn">探す</button>
        </form>
        {others.length ? <div className="agrid">{others.map((a) => <ArtistCard key={a.id} a={a} events={events} following={false} />)}</div>
          : <div className="empty">見つかりませんでした。「＋ 新しい推しを登録」から追加できます。</div>}
      </section>
    </div>
  );
}

function ArtistCard({ a, events, following }: { a: Artist; events: EventWithStatus[]; following: boolean }) {
  const evs = events.filter((e) => e.artist_ids.includes(a.id));
  const missing = [!a.links.official && "公式サイト", !a.links.x && !a.links.instagram && "SNS", !a.links.fc && "ファンクラブ"].filter(Boolean);
  return (
    <div className="card acard" style={{ ["--c" as string]: a.color }}>
      <div className="ahead">
        <span className="penlight" />
        <div style={{ minWidth: 0 }}><h3><Link href={`/artists/${a.id}`}>{a.name}</Link></h3>{a.aliases.length > 0 && <div className="hint">{a.aliases.slice(0, 3).join("・")}</div>}</div>
      </div>
      {following && <div className="stats"><span><b className="num">{evs.filter((e) => !isPast(e)).length}</b>これから</span><span><b className="num">{evs.length}</b>登録済み</span></div>}
      <div className="links">
        {LINK_KINDS.filter(([k]) => a.links[k]).map(([k, l]) => <a key={k} href={a.links[k]} target="_blank" rel="noopener noreferrer">{l} ↗</a>)}
        {!Object.keys(a.links).length && <span className="hint">リンク未登録</span>}
      </div>
      {following && missing.length > 0 && <div className="hint" style={{ color: "var(--warn)" }}>{missing.join("・")}のURLを登録すると見落としが減ります</div>}
      <div className="chips"><FollowButton artistId={a.id} following={following} /><Link className="btn sm ghost" href={`/artists/${a.id}`}>詳細</Link></div>
    </div>
  );
}
