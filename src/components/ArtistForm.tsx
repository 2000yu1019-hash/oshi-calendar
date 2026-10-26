import { saveArtist } from "@/app/actions";
import { COLORS, LINK_KINDS } from "@/lib/constants";
import type { Artist } from "@/lib/types";

export function ArtistForm({ a }: { a?: Artist }) {
  const color = a?.color ?? COLORS[0];
  return (
    <form action={saveArtist} className="card" style={{ display: "grid", gap: 16 }}>
      <h1 style={{ fontSize: 20 }}>{a ? "推しを編集" : "新しい推しを登録"}</h1>
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="form">
        <label className="full">名前（アーティスト・バンド・グループ・メンバー）<input id="name" name="name" required defaultValue={a?.name} /></label>
        <label className="full">別名・英語表記（カンマ区切り。ニュースの検索に使います）<input id="aliases" name="aliases" defaultValue={a?.aliases.join(", ")} placeholder="例: ミセス, Mrs. GREEN APPLE" /></label>
        <div className="full">
          <div className="hint" style={{ marginBottom: 6 }}>推し色（カレンダーの色になります）</div>
          <div className="colorrow">
            {COLORS.map((c) => (
              <span key={c} style={{ position: "relative" }}>
                <input type="radio" name="color" id={`c${c.slice(1)}`} value={c} defaultChecked={c === color} />
                <label htmlFor={`c${c.slice(1)}`} style={{ ["--c" as string]: c }} aria-label={c} />
              </span>
            ))}
          </div>
        </div>
        <label>活動の拠点<select id="country" name="country" defaultValue={a?.country ?? "JP"}><option value="JP">日本</option><option value="US">アメリカ</option><option value="CA">カナダ</option><option value="GB">イギリス</option><option value="KR">韓国</option><option value="OTHER">その他</option></select></label>
        <span />
        {LINK_KINDS.map(([k, l]) => <label key={k}>{l}のURL<input id={`link_${k}`} name={`link_${k}`} type="url" defaultValue={a?.links[k]} placeholder="https://" /></label>)}
      </div>
      <p className="hint" style={{ margin: 0 }}>公式サイトにRSS（お知らせのフィード）があれば、登録後に詳細画面から追加すると自動取得の精度が上がります。</p>
      <div className="formfoot"><button className="btn primary">保存</button></div>
    </form>
  );
}
