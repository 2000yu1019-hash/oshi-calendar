import { saveSettings, signOut } from "@/app/actions";
import { CopyField } from "@/components/CopyField";
import { PushToggle } from "@/components/PushToggle";
import { beforeLabel } from "@/lib/dates";
import { getUser } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
const START_OPTS = [10080, 4320, 1440, 180, 60, 15];
const DL_OPTS = [4320, 1440, 360, 180, 60];

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const { supabase, user } = await getUser();
  const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  const p = data as Profile;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const icsUrl = `${site}/api/ics/${p.ics_token}.ics`;
  const webcal = icsUrl.replace(/^https?:/, "webcal:");
  const inbound = process.env.INBOUND_MAIL_DOMAIN ? `u-${p.inbound_token}@${process.env.INBOUND_MAIL_DOMAIN}` : null;
  const lineUrl = process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL;

  return (
    <div className="view" style={{ maxWidth: 760 }}>
      {saved && <div className="notice" role="status">設定を保存しました</div>}
      <form action={saveSettings} className="card settings">
        <h2>通知</h2>
        <div className="form" style={{ gridTemplateColumns: "1fr" }}>
          <label>表示名<input id="display_name" name="display_name" defaultValue={p.display_name ?? ""} /></label>
          <label className="check"><input type="checkbox" id="notify_push" name="notify_push" defaultChecked={p.notify_push} /> プッシュ通知</label>
          <label className="check"><input type="checkbox" id="notify_email" name="notify_email" defaultChecked={p.notify_email} /> メール（{user!.email}）</label>
          <label className="check"><input type="checkbox" id="notify_line" name="notify_line" defaultChecked={p.notify_line} disabled={!p.line_user_id} /> LINE{p.line_user_id ? "（連携済み）" : "（下で連携すると選べます）"}</label>
        </div>
        <div>
          <div className="hint" style={{ marginBottom: 6 }}>ライブ・出演・発売の何分前に知らせるか</div>
          <div className="seg">{START_OPTS.map((m) => <label key={m} className="check" style={{ fontSize: 13 }}><input type="checkbox" name="remind_before_start" value={m} defaultChecked={p.remind_before_start.includes(m)} /> {beforeLabel(m)}</label>)}</div>
        </div>
        <div>
          <div className="hint" style={{ marginBottom: 6 }}>申込・入金などの締切の何分前に知らせるか</div>
          <div className="seg">{DL_OPTS.map((m) => <label key={m} className="check" style={{ fontSize: 13 }}><input type="checkbox" name="remind_before_deadline" value={m} defaultChecked={p.remind_before_deadline.includes(m)} /> {beforeLabel(m)}</label>)}</div>
        </div>
        <label className="hint">ホームのリマインド欄に出す期間{" "}
          <select id="remind_days" name="remind_days" className="field" defaultValue={String(p.remind_days)}>{[1, 3, 7, 14, 30].map((n) => <option key={n} value={n}>{n}日以内</option>)}</select>
        </label>
        <div className="formfoot"><button className="btn primary">保存</button></div>
      </form>

      <section className="card settings">
        <h2>この端末のプッシュ通知</h2>
        <PushToggle />
      </section>

      <section className="card settings" id="calendar">
        <h2>Googleカレンダー・iPhoneのカレンダーに自動反映</h2>
        <p className="hint" style={{ margin: 0 }}>このURLを登録すると、推しの予定と締切がカレンダーに入り、新しい予定も自動で追加されます。Googleカレンダーは「他のカレンダー」の＋ →「URLで追加」に貼り付けてください。</p>
        <CopyField id="ics" value={icsUrl} />
        <div className="chips">
          <a className="btn sm" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noopener noreferrer">Googleカレンダーで開く ↗</a>
          <a className="btn sm ghost" href={webcal}>iPhone・Macのカレンダーで開く</a>
        </div>
        <p className="hint" style={{ margin: 0 }}>このURLを知っている人はあなたの予定を見られます。人に教えないでください。</p>
      </section>

      <section className="card settings">
        <h2>LINEで通知を受け取る</h2>
        {p.line_user_id ? <p className="hint" style={{ margin: 0 }}>連携済みです。</p> : (
          <>
            <p className="hint" style={{ margin: 0 }}>LINE公式アカウントを友だち追加して、この連携コードをトークで送ってください。</p>
            <CopyField id="linecode" value={p.line_link_code ?? ""} />
            {lineUrl ? <div><a className="btn sm" href={lineUrl} target="_blank" rel="noopener noreferrer">LINEで友だち追加 ↗</a></div> : <p className="hint" style={{ margin: 0 }}>LINE公式アカウントは準備中です。</p>}
          </>
        )}
      </section>

      <section className="card settings">
        <h2>ファンクラブ・会員メールの取り込み</h2>
        {inbound ? (
          <>
            <p className="hint" style={{ margin: 0 }}>Gmailの「設定 → メール転送」で、ファンクラブやメルマガのメールをこのアドレスに自動転送すると、締切や日時を読み取って自分だけの予定として登録します（ほかの人には公開されません）。</p>
            <CopyField id="inbound" value={inbound} />
          </>
        ) : <p className="hint" style={{ margin: 0 }}>準備中です。それまでは、メール本文を「＋ 予定を追加」に貼り付けると読み取れます。</p>}
      </section>

      <form action={signOut}><button className="btn ghost">ログアウト</button></form>
    </div>
  );
}
