import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteEvent, hideEvent } from "@/app/actions";
import { artistColors, artistNames } from "@/components/EventRow";
import { StatusPicker } from "@/components/StatusPicker";
import { CATEGORY_LABEL, SOURCE_LABEL } from "@/lib/constants";
import { fmt, relLabel } from "@/lib/dates";
import { googleCalendarUrl } from "@/lib/ics";
import { getUser } from "@/lib/supabase/server";
import type { Artist, EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const { supabase, user } = await getUser();
  const [{ data: ev }, { data: st }, { data: artistRows }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    supabase.from("user_events").select("status").eq("user_id", user!.id).eq("event_id", id).maybeSingle(),
    supabase.from("artists").select("*"),
  ]);
  if (!ev) notFound();
  const e = ev as EventRow;
  const artists = (artistRows ?? []) as Artist[];
  const names = e.artist_ids.map((x) => artists.find((a) => a.id === x)?.name ?? "").filter(Boolean);
  const mine = e.owner_id === user!.id;
  const dls = [...e.deadlines].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const now = new Date();

  return (
    <div className="view" style={{ maxWidth: 760 }}>
      {saved && <div className="notice" role="status">保存しました</div>}
      <div className="card" style={{ display: "grid", gap: 14 }}>
        <div className="chips">
          {artistColors(e, artists).map((c, i) => <span key={i} className="penlight" style={{ ["--c" as string]: c, height: 20, width: 8 }} />)}
          <span className="chip cat">{CATEGORY_LABEL[e.category]}</span>
          {e.fc_only && <span className="chip lock">会員限定</span>}
          {e.origin === "auto" && <span className="chip auto">自動取得</span>}
          {e.origin === "mail" && <span className="chip">会員メールから</span>}
        </div>
        <h1 style={{ fontSize: 22 }}>{e.title}</h1>
        <dl className="kv">
          <dt>推し</dt><dd>{artistNames(e, artists)}</dd>
          <dt>日時</dt><dd className="num">{fmt(e.start_at, { allDay: e.all_day })}{e.end_at ? ` 〜 ${fmt(e.end_at)}` : ""}{e.start_at && Date.parse(e.start_at) > now.getTime() ? `（${relLabel(e.start_at, now)}）` : ""}</dd>
          {(e.broadcast?.station || e.broadcast?.program) && <><dt>番組</dt><dd>{[e.broadcast?.station, e.broadcast?.program].filter(Boolean).join(" ")}</dd></>}
          {e.broadcast?.segment && <><dt>出演内容</dt><dd>{e.broadcast.segment}</dd></>}
          {e.venue && <><dt>場所・販売店</dt><dd>{e.venue}</dd></>}
          {dls.length > 0 && <><dt>締切</dt><dd>{dls.map((d, i) => <div key={i}><span style={{ color: "var(--warn)" }}>{d.label}</span> <span className="num">{fmt(d.at)}</span> <span className="hint">{Date.parse(d.at) > now.getTime() ? relLabel(d.at, now) : "終了"}</span></div>)}</dd></>}
          <dt>情報源</dt><dd>{SOURCE_LABEL[e.source] ?? e.source}{e.url && <> ・ <a href={e.url} target="_blank" rel="noopener noreferrer">元の投稿・ページを開く ↗</a></>}</dd>
          {e.memo && <><dt>メモ</dt><dd>{e.memo}</dd></>}
        </dl>
        {e.origin === "auto" && <p className="hint" style={{ margin: 0 }}>ニュースから自動で作った予定です。日時は元の記事で確認してください。</p>}
        <div><div className="hint" style={{ marginBottom: 6 }}>参加状況</div><StatusPicker eventId={e.id} status={st?.status ?? ""} /></div>
        <div className="chips">
          <a className="btn sm" href={googleCalendarUrl(e, names)} target="_blank" rel="noopener noreferrer">Googleカレンダーに追加 ↗</a>
          <Link className="btn sm ghost" href="/settings#calendar">すべての予定をカレンダーに自動反映</Link>
        </div>
        <div className="formfoot">
          {mine ? (
            <>
              <form action={deleteEvent} className="left"><input type="hidden" name="id" value={e.id} /><button className="btn ghost danger">削除</button></form>
              <Link className="btn primary" href={`/events/${e.id}/edit`}>編集</Link>
            </>
          ) : (
            <form action={hideEvent} className="left"><input type="hidden" name="id" value={e.id} /><button className="btn ghost">自分の画面から隠す</button></form>
          )}
        </div>
      </div>
    </div>
  );
}
