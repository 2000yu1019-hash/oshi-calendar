"use client";
import { useEffect, useRef, useState } from "react";
import { saveEvent } from "@/app/actions";
import { CATEGORIES, DEADLINE_NAMES, SOURCES, STATUSES } from "@/lib/constants";
import type { Artist, EventDraft } from "@/lib/types";

type Init = {
  id?: string; title?: string; artist_ids?: string[]; category?: string; source?: string; start?: string; end?: string;
  venue?: string; url?: string; fc_only?: boolean; is_public?: boolean; memo?: string; status?: string;
  station?: string; program?: string; segment?: string; deadlines?: { label: string; at: string }[];
};

export function EventForm({ artists, init, pasteText }: { artists: Artist[]; init: Init; pasteText?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [picked, setPicked] = useState<string[]>(init.artist_ids ?? []);
  const [category, setCategory] = useState(init.category ?? "live");
  const [deadlines, setDeadlines] = useState(init.deadlines ?? []);
  const [text, setText] = useState(pasteText ?? "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const broadcast = category === "tv" || category === "radio" || !!init.program;

  function set(name: string, v: string | boolean) {
    const el = formRef.current?.elements.namedItem(name) as HTMLInputElement | null;
    if (!el || v === "" || v === undefined) return;
    if (el.type === "checkbox") el.checked = !!v; else el.value = String(v);
  }

  async function read() {
    if (!text.trim()) { setMsg("先に告知文やURLを貼り付けてください"); return; }
    setBusy(true); setMsg("読み取り中…");
    try {
      const res = await fetch("/api/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const j = (await res.json()) as { draft?: EventDraft; artistId?: string | null; by?: string; error?: string };
      if (!res.ok || !j.draft) throw new Error(j.error);
      const d = j.draft;
      set("title", d.title); set("source", d.source); set("start", d.start); set("end", d.end);
      set("venue", d.venue); set("url", d.url); set("memo", d.memo); set("fc_only", d.fc_only);
      set("station", d.station); set("program", d.program); set("segment", d.segment);
      setCategory(d.category);
      if (j.artistId) setPicked((p) => (p.includes(j.artistId!) ? p : [...p, j.artistId!]));
      if (d.deadlines.length) setDeadlines(d.deadlines);
      // カテゴリ変更で出る番組欄は次の描画で埋める
      setTimeout(() => { set("station", d.station); set("program", d.program); set("segment", d.segment); }, 0);
      setMsg(j.by === "claude" ? "読み取りました。内容を確認して保存してください。" : "簡易読み取りで入力しました。日時と内容を確認してください。");
    } catch (e) {
      setMsg(`読み取れませんでした。${e instanceof Error && e.message ? e.message : "手で入力してください。"}`);
    }
    setBusy(false);
  }

  useEffect(() => { if (pasteText) void read(); /* 共有から開いたときは自動で読み取る */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form ref={formRef} action={saveEvent} onSubmit={() => setSaving(true)} className="card" style={{ display: "grid", gap: 16 }}>
      <h1 style={{ fontSize: 20 }}>{init.id ? "予定を編集" : "予定を追加"}</h1>
      {init.id && <input type="hidden" name="id" value={init.id} />}
      {!init.id && (
        <div className="ai">
          <label className="hint" htmlFor="paste">SNSの投稿・会員メール・お知らせページの文章やURLを貼り付けると、日時・締切・番組名を読み取って下に入力します</label>
          <textarea id="paste" className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder={"例：【FC先行】11/30(日) 東京公演 受付 11/1 12:00〜11/8 23:59 https://x.com/..."} />
          <div className="chips"><button type="button" className="btn sm" onClick={read} disabled={busy}>{busy ? "読み取り中…" : "貼り付けた内容から入力"}</button><span className="hint" role="status">{msg}</span></div>
        </div>
      )}
      <div className="form">
        <label className="full">タイトル<input id="title" name="title" required defaultValue={init.title} placeholder="例：全国ツアー 東京公演" /></label>
        <div className="full">
          <div className="hint" style={{ marginBottom: 6 }}>推し（複数選べます）</div>
          <div className="seg">
            {artists.map((a) => (
              <button key={a.id} type="button" aria-pressed={picked.includes(a.id)} onClick={() => setPicked((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))}>
                <span className="dot" style={{ ["--c" as string]: a.color }} />{a.name}
              </button>
            ))}
            {!artists.length && <span className="hint">先に「推し」から推しを登録してください</span>}
          </div>
          {picked.map((id) => <input key={id} type="hidden" name="artist_ids" value={id} />)}
        </div>
        <label>種類<select id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>情報源<select id="source" name="source" defaultValue={init.source ?? "official"}>{SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>開始（日本時間）<input id="start" name="start" type="datetime-local" defaultValue={init.start} /></label>
        <label>終了・販売終了（任意）<input id="end" name="end" type="datetime-local" defaultValue={init.end} /></label>
        {broadcast && (
          <>
            <label>放送局<input id="station" name="station" defaultValue={init.station} placeholder="例：テレビ朝日、J-WAVE" /></label>
            <label>番組名<input id="program" name="program" defaultValue={init.program} placeholder="例：ミュージックステーション" /></label>
            <label className="full">出演内容・コーナー<input id="segment" name="segment" defaultValue={init.segment} placeholder="例：新曲をテレビ初披露、トークコーナーにゲスト出演" /></label>
          </>
        )}
        <label>場所・販売店<input id="venue" name="venue" defaultValue={init.venue} /></label>
        <label>自分の参加状況<select id="status" name="status" defaultValue={init.status ?? ""}>{STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="full">元の投稿・ページのURL<input id="url" name="url" type="url" defaultValue={init.url} placeholder="https://" /></label>
        <label className="check full"><input type="checkbox" id="fc_only" name="fc_only" defaultChecked={init.fc_only} /> FC・メール会員限定</label>
        <label className="check full"><input type="checkbox" id="is_public" name="is_public" defaultChecked={init.is_public} /> この予定をほかのファンにも共有する（会員限定の内容は共有しないでください）</label>
        <div className="full">
          <div className="hint" style={{ marginBottom: 6 }}>締切（申込・入金・当落・予約特典など）</div>
          <div style={{ display: "grid", gap: 8 }}>
            {deadlines.map((d, i) => (
              <div className="dlrow" key={`${i}-${d.at}`}>
                <input className="field" name="dl_label" defaultValue={d.label} list="dlnames" aria-label="締切の名前" />
                <input className="field" name="dl_at" type="datetime-local" defaultValue={d.at} aria-label="締切の日時" />
                <button type="button" className="btn sm ghost" aria-label="この締切を削除" onClick={() => setDeadlines((x) => x.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
          <datalist id="dlnames">{DEADLINE_NAMES.map((n) => <option key={n} value={n} />)}</datalist>
          <button type="button" className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setDeadlines((x) => [...x, { label: "申込締切", at: "" }])}>＋ 締切を追加</button>
        </div>
        <label className="full">メモ<textarea id="memo" name="memo" defaultValue={init.memo} /></label>
      </div>
      <div className="formfoot"><button className="btn primary" disabled={saving}>{saving ? "保存中…" : "保存"}</button></div>
    </form>
  );
}
