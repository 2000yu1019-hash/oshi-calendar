// 表示はすべて日本時間。海外アーティストの発表も日本時間に直して扱う
export const TZ = "Asia/Tokyo";
const WD = ["日", "月", "火", "水", "木", "金", "土"];

function parts(d: Date) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23", weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const wdIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { y: +get("year"), m: +get("month"), d: +get("day"), h: +get("hour"), min: +get("minute"), wd: wdIdx };
}
export const jst = parts;

const pad = (n: number) => String(n).padStart(2, "0");

/** 日本時間の YYYY-MM-DD */
export function ymd(d: Date | string): string {
  const p = parts(new Date(d));
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** 10/26(月) 18:30 */
export function fmt(iso: string | null | undefined, opts: { time?: boolean; allDay?: boolean } = {}): string {
  if (!iso) return "日付未定";
  const p = parts(new Date(iso));
  const base = `${p.m}/${p.d}(${WD[p.wd]})`;
  if (opts.time === false || opts.allDay) return base;
  return `${base} ${pad(p.h)}:${pad(p.min)}`;
}

export function weekday(iso: string): string {
  return WD[parts(new Date(iso)).wd];
}

/** datetime-local の値（日本時間）→ ISO */
export function fromLocalInput(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.length === 10 ? `${v}T00:00` : v.slice(0, 16);
  const d = new Date(`${s}:00+09:00`);
  return isNaN(+d) ? null : d.toISOString();
}

/** ISO → datetime-local の値（日本時間） */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = parts(new Date(iso));
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`;
}

export function daysUntil(iso: string, now = new Date()): number {
  const a = Date.parse(`${ymd(iso)}T00:00:00+09:00`);
  const b = Date.parse(`${ymd(now)}T00:00:00+09:00`);
  return Math.round((a - b) / 864e5);
}

export function relLabel(iso: string, now = new Date()): string {
  const ms = Date.parse(iso) - now.getTime();
  const d = daysUntil(iso, now);
  const t = fmt(iso).split(" ")[1] ?? "";
  if (ms < 0) return "終了";
  if (ms < 36e5) return `あと${Math.max(1, Math.round(ms / 6e4))}分`;
  if (d === 0) return `今日 ${t}`;
  if (d === 1) return `明日 ${t}`;
  return `あと${d}日`;
}

export function isPast(e: { start_at: string | null; end_at: string | null }, now = new Date()): boolean {
  const end = e.end_at ?? e.start_at;
  if (!end) return false;
  return Date.parse(end) + (e.end_at ? 0 : 3 * 36e5) < now.getTime();
}

/** 分 → 「1日前」「1時間前」 */
export function beforeLabel(min: number): string {
  if (min % 1440 === 0) return `${min / 1440}日前`;
  if (min % 60 === 0) return `${min / 60}時間前`;
  return `${min}分前`;
}
