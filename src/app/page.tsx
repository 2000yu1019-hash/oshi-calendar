import Link from "next/link";
import { EventRow, artistColors, artistNames } from "@/components/EventRow";
import { StatusChip } from "@/components/StatusChip";
import { BROADCAST_CATEGORIES, CATEGORY_LABEL, COLLAB_CATEGORIES } from "@/lib/constants";
import { daysUntil, fmt, isPast, relLabel } from "@/lib/dates";
import { loadFeed } from "@/lib/feed";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { supabase, user } = await getUser();
  if (!user) return <Landing />;

  const { data: profile } = await supabase.from("profiles").select("remind_days").eq("id", user.id).single();
  const remindDays = profile?.remind_days ?? 7;
  const now = new Date();
  const { events, artists, followIds } = await loadFeed(supabase, user.id, { from: new Date(now.getTime() - 864e5).toISOString() });
  const upcoming = events.filter((e) => !isPast(e) && e.status !== "skip");
  const next = upcoming.find((e) => e.start_at && Date.parse(e.start_at) > now.getTime()) ?? upcoming[0];

  const limit = now.getTime() + remindDays * 864e5;
  const reminders = upcoming
    .flatMap((e) => [
      ...e.deadlines.map((d) => ({ e, at: d.at, label: d.label })),
      ...(e.start_at ? [{ e, at: e.start_at, label: CATEGORY_LABEL[e.category] ?? "予定" }] : []),
    ])
    .filter((r) => Date.parse(r.at) > now.getTime() && Date.parse(r.at) <= limit)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .slice(0, 8);
  const month = upcoming.filter((e) => e.start_at && daysUntil(e.start_at) <= 30);
  const broadcasts = upcoming.filter((e) => BROADCAST_CATEGORIES.includes(e.category)).slice(0, 6);
  const collabs = upcoming.filter((e) => COLLAB_CATEGORIES.includes(e.category)).slice(0, 6);

  if (!followIds.length && !events.length) {
    return (
      <div className="view">
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <h2>まずは推しを登録しましょう</h2>
          <p className="hint" style={{ margin: 0 }}>推しを選ぶと、ライブ・テレビやラジオの出演・コラボの情報が自動で集まり始めます。何組でも登録できます。</p>
          <div><Link href="/artists" className="btn primary">推しを選ぶ</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="hero">
        {next ? (
          <div className="card next" style={{ ["--c" as string]: artistColors(next, artists)[0] }}>
            <div className="eyebrow">次の推しごと</div>
            <div className="count num">
              {next.start_at && Date.parse(next.start_at) <= now.getTime() ? "開催中" : next.start_at ? (daysUntil(next.start_at) === 0 ? "今日" : <>{daysUntil(next.start_at)}<small>日後</small></>) : "日付未定"}
            </div>
            <h3>{next.title}</h3>
            <div className="hint">{artistNames(next, artists)} ・ <span className="num">{fmt(next.start_at)}</span>{next.venue ? ` ・ ${next.venue}` : ""}{next.broadcast?.program ? ` ・ ${next.broadcast.station ?? ""} ${next.broadcast.program}` : ""}</div>
            <div className="chips" style={{ marginTop: 12 }}>
              <span className="chip cat">{CATEGORY_LABEL[next.category]}</span>
              <StatusChip status={next.status} />
              <Link className="btn sm ghost" href={`/events/${next.id}`}>詳しく見る</Link>
            </div>
          </div>
        ) : (
          <div className="card"><div className="eyebrow">次の推しごと</div><h3 style={{ marginTop: 12 }}>予定はまだありません</h3><p className="hint">自動取得は3時間ごとに行われます。見つけた告知は「＋ 予定を追加」から貼り付けて登録できます。</p></div>
        )}
        <div>
          <div className="sechead"><h2>リマインド</h2><span className="hint">{remindDays}日以内の締切・開始</span></div>
          <div className="alerts">
            {reminders.length ? reminders.map((r, i) => {
              const ms = Date.parse(r.at) - now.getTime();
              return (
                <Link key={i} href={`/events/${r.e.id}`} className={`alert ${ms < 864e5 ? "urgent" : ms < 3 * 864e5 ? "soon" : ""}`}>
                  <span className="when">{relLabel(r.at, now)}</span>
                  <span><b>{r.label}：{r.e.title}</b><span className="num">{fmt(r.at)}</span> ・ <span>{artistNames(r.e, artists)}</span></span>
                </Link>
              );
            }) : <div className="empty">{remindDays}日以内のリマインドはありません</div>}
          </div>
        </div>
      </div>

      <div className="cols2">
        <section>
          <div className="sechead"><h2>30日以内の予定</h2><Link className="btn sm ghost" href="/list">すべて見る</Link></div>
          <div className="list">{month.length ? month.slice(0, 8).map((e) => <EventRow key={e.id} e={e} artists={artists} />) : <div className="empty">30日以内の予定はありません</div>}</div>
        </section>
        <div style={{ display: "grid", gap: 28, alignContent: "start" }}>
          <section>
            <div className="sechead"><h2>テレビ・ラジオ出演</h2><Link className="btn sm ghost" href="/list?cat=tv">一覧</Link></div>
            <div className="list">{broadcasts.length ? broadcasts.map((e) => <EventRow key={e.id} e={e} artists={artists} />) : <div className="empty">出演情報が見つかるとここに番組名と時間が出ます</div>}</div>
          </section>
          <section>
            <div className="sechead"><h2>コラボ・グッズ・服</h2><span className="hint">販売中・これから</span></div>
            <div className="list">{collabs.length ? collabs.map((e) => <EventRow key={e.id} e={e} artists={artists} />) : <div className="empty">ミスドなどの食べ物コラボや服・グッズの情報はここにまとまります</div>}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="landing">
      <div className="eyebrow">推しの予定を、ひとつも逃さない</div>
      <h1>ライブも、出演も、コラボも。<br />推しの全部がここに集まる。</h1>
      <ul>
        <li>ライブ・ツアー、チケット先行や入金の締切</li>
        <li>テレビ・ラジオの出演時間と番組名・コーナー</li>
        <li>ミスドなどのフードコラボ、服・グッズの発売</li>
        <li>SNSの投稿や会員メールを貼るだけで予定に変換</li>
        <li>プッシュ通知・メール・LINE・Googleカレンダーでリマインド</li>
      </ul>
      <div><Link href="/login" className="btn primary">無料で始める</Link></div>
    </div>
  );
}
