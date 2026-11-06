import Link from "next/link";
import { EventRow, artistColors } from "@/components/EventRow";
import { ArtistFilter } from "@/components/ArtistFilter";
import { jst, ymd } from "@/lib/dates";
import { loadFeed } from "@/lib/feed";
import { getUser } from "@/lib/supabase/server";
import type { EventWithStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
const WD = ["日", "月", "火", "水", "木", "金", "土"];
const pad = (n: number) => String(n).padStart(2, "0");

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string; d?: string; a?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await getUser();
  const today = ymd(new Date());
  const [y, m] = (sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7)).split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const gridStart = new Date(first.getTime() - first.getUTCDay() * 864e5);
  const gridEnd = new Date(gridStart.getTime() + 42 * 864e5);
  const { events, artists, followIds } = await loadFeed(supabase, user!.id, {
    from: new Date(gridStart.getTime() - 60 * 864e5).toISOString(), to: gridEnd.toISOString(), artistId: sp.a,
  });

  const byDay = new Map<string, { e: EventWithStatus; dl?: string }[]>();
  const add = (k: string, v: { e: EventWithStatus; dl?: string }) => byDay.set(k, [...(byDay.get(k) ?? []), v]);
  for (const e of events) {
    if (e.start_at) {
      const s = Date.parse(`${ymd(e.start_at)}T00:00:00+09:00`);
      const end = e.end_at ? Date.parse(`${ymd(e.end_at)}T00:00:00+09:00`) : s;
      for (let t = s, n = 0; t <= end && n < 62; t += 864e5, n++) add(ymd(new Date(t)), { e });
    }
    for (const d of e.deadlines) add(ymd(d.at), { e, dl: d.label });
  }
  const sel = sp.d ?? today;
  const seen = new Set<string>();
  const selEvents = (byDay.get(sel) ?? []).filter(({ e }) => !seen.has(e.id) && !!seen.add(e.id)).map(({ e }) => e);
  const q = (o: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ m: `${y}-${pad(m)}`, a: sp.a, ...o }).filter(([, v]) => v) as [string, string][]);
  const prev = new Date(Date.UTC(y, m - 2, 1)), nextM = new Date(Date.UTC(y, m, 1));
  const selP = jst(new Date(`${sel}T12:00:00+09:00`));

  return (
    <div className="view">
      <div className="calhead">
        <Link className="btn sm ghost" href={q({ m: `${prev.getUTCFullYear()}-${pad(prev.getUTCMonth() + 1)}`, d: undefined })} aria-label="前の月">◀</Link>
        <h2>{y}.{pad(m)}</h2>
        <Link className="btn sm ghost" href={q({ m: `${nextM.getUTCFullYear()}-${pad(nextM.getUTCMonth() + 1)}`, d: undefined })} aria-label="次の月">▶</Link>
        <Link className="btn sm ghost" href={q({ m: today.slice(0, 7), d: undefined })}>今月</Link>
      </div>
      <ArtistFilter artists={artists.filter((a) => followIds.includes(a.id))} current={sp.a} base="/calendar" keep={{ m: `${y}-${pad(m)}` }} />
      <div style={{ overflowX: "auto" }}>
        <div className="cal">
          {WD.map((w, i) => <div key={w} className={`dow${i === 0 ? " sun" : i === 6 ? " sat" : ""}`}>{w}</div>)}
          {Array.from({ length: 42 }, (_, i) => {
            const d = new Date(gridStart.getTime() + i * 864e5);
            const k = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
            const items = byDay.get(k) ?? [];
            return (
              <Link key={k} href={q({ d: k })} scroll={false} className={`day${d.getUTCMonth() !== m - 1 ? " out" : ""}${k === today ? " today" : ""}${k === sel ? " sel" : ""}`} aria-label={`${d.getUTCMonth() + 1}月${d.getUTCDate()}日 ${items.length}件`}>
                <span className="n">{d.getUTCDate()}</span>
                {items.slice(0, 3).map((it, j) => (
                  <span key={j} className={`pill${it.dl ? " dl" : ""}`} style={{ ["--c" as string]: artistColors(it.e, artists)[0] }}>{it.dl ? `${it.dl}：` : ""}{it.e.title}</span>
                ))}
                {items.length > 3 && <span className="hint more" style={{ fontSize: 11 }}>ほか{items.length - 3}件</span>}
                <span className="dots">{items.slice(0, 5).map((it, j) => <i key={j} style={{ ["--c" as string]: it.dl ? "var(--warn)" : artistColors(it.e, artists)[0] }} />)}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <section>
        <div className="sechead"><h2>{selP.m}月{selP.d}日（{WD[selP.wd]}）</h2><Link className="btn sm" href={`/events/new?date=${sel}`}>この日に追加</Link></div>
        <div className="list">{selEvents.length ? selEvents.map((e) => <EventRow key={e.id} e={e} artists={artists} />) : <div className="empty">この日の予定はありません</div>}</div>
      </section>
    </div>
  );
}
