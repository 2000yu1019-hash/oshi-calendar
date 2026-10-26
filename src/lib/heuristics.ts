// Claude API が使えないときの簡易読み取り。テストしやすいよう純粋関数にしている
import type { EventDraft } from "./types";

export function guessSource(text: string): string {
  const t = text.toLowerCase();
  if (/x\.com|twitter\.com/.test(t)) return "x";
  if (/instagram\.com/.test(t)) return "instagram";
  if (/tiktok\.com/.test(t)) return "tiktok";
  if (/youtube\.com|youtu\.be/.test(t)) return "youtube";
  if (/ファンクラブ|fc会員|fc先行|会員限定/i.test(text)) return "fc";
  if (/メルマガ|メール会員|件名[:：]|from:/i.test(text)) return "mail";
  return "other";
}

export function guessCategory(text: string): string {
  if (/ミスド|ミスタードーナツ|カフェ|ドーナツ|フード|ドリンク|メニュー|コンビニ|ローソン|ファミマ|ファミリーマート|セブン-?イレブン|マクドナルド|スタバ|お菓子/.test(text)) return "food";
  if (/アパレル|パーカー|Tシャツ|ユニクロ|\bGU\b|コーデ|着用|ブランド/i.test(text)) return "fashion";
  if (/ラジオ|radio|オールナイトニッポン|J-WAVE|TOKYO FM|FM\b/i.test(text)) return "radio";
  if (/テレビ|TV|地上波|生放送|生出演|Mステ|ミュージックステーション|紅白|CDTV|番組|NHK|日テレ|テレ朝|TBS|フジテレビ|テレビ東京/i.test(text)) return "tv";
  if (/先行|抽選|一般発売|受付/.test(text)) return "ticket";
  if (/グッズ|ポップアップ/.test(text)) return "goods";
  if (/リリース|発売|配信開始|シングル|アルバム/.test(text)) return "release";
  if (/コラボ|キャンペーン|広告|CM/.test(text)) return "collab";
  if (/ライブ|ツアー|公演|フェス|来日/.test(text)) return "live";
  return "other";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 「11/30(日) 18:00」「2026年12月1日 19時」などを日本時間の datetime-local 形式で返す */
export function findDates(text: string, now = new Date()): string[] {
  const re = /(?:(\d{4})[\/年.\-])?(\d{1,2})[\/月.](\d{1,2})日?(?:\s*[(（][^)）]{1,3}[)）])?(?:\s*(\d{1,2})[:：時](\d{2})?)?/g;
  const out: string[] = [];
  const y = now.getFullYear();
  for (const m of text.matchAll(re)) {
    const month = +m[2], day = +m[3];
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    let year = m[1] ? +m[1] : y;
    // 年がなく、2か月以上前の日付なら来年とみなす
    if (!m[1] && Date.UTC(year, month - 1, day) < now.getTime() - 60 * 864e5) year += 1;
    const h = m[4] ? Math.min(23, +m[4]) : 0;
    const min = m[5] ? +m[5] : 0;
    out.push(`${year}-${pad(month)}-${pad(day)}T${pad(h)}:${pad(min)}`);
  }
  return out;
}

export function heuristicDraft(text: string, artistNames: string[], now = new Date()): EventDraft {
  const url = text.match(/https?:\/\/[^\s）)」]+/)?.[0] ?? "";
  const dates = findDates(text, now);
  const hasDeadline = /締切|締め切り|まで|〜|～/.test(text) && dates.length > 1;
  const firstLine = text.split("\n").map((s) => s.replace(/https?:\/\/\S+/g, "").trim()).find(Boolean) ?? "";
  const artist = artistNames.find((n) => text.toLowerCase().includes(n.toLowerCase())) ?? "";
  return {
    title: firstLine.slice(0, 60),
    artist,
    category: guessCategory(text),
    source: guessSource(text),
    start: dates[0] ?? "",
    end: "",
    venue: "",
    url,
    fc_only: /FC|ファンクラブ|会員限定|メール会員/i.test(text),
    deadlines: hasDeadline ? [{ label: "申込締切", at: dates[dates.length - 1] }] : [],
    station: "",
    program: "",
    segment: "",
    memo: "",
  };
}
