import type { EventRow } from "./types";

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
const esc = (s: string | null | undefined) => String(s ?? "").replace(/[\;,]/g, (m) => "\\" + m).replace(/\r?\n/g, "\\n");
// 75オクテットで折り返す（RFC 5545）
const fold = (line: string) => {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > 74) { out.push(cur); cur = " " + ch; } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
};

export function eventTitle(e: EventRow, artistNames: string[]) {
  return `【${artistNames.join("×") || "推し"}】${e.title}`;
}

export function buildIcs(
  events: EventRow[],
  nameOf: (id: string) => string,
  opts: { calName?: string; startAlarms?: number[]; deadlineAlarms?: number[]; siteUrl?: string } = {},
) {
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//oshi-calendar//JP", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(opts.calName ?? "推し活カレンダー")}`, "X-WR-TIMEZONE:Asia/Tokyo", "REFRESH-INTERVAL;VALUE=DURATION:PT3H"];
  const stamp = icsDate(new Date().toISOString());
  const alarm = (min: number) => ["BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:推し活リマインド", `TRIGGER:-PT${min}M`, "END:VALARM"];
  for (const e of events) {
    if (!e.start_at) continue;
    const names = e.artist_ids.map(nameOf).filter(Boolean);
    const end = e.end_at ?? new Date(Date.parse(e.start_at) + 2 * 36e5).toISOString();
    const desc = [e.broadcast?.program && `番組: ${e.broadcast.station ?? ""} ${e.broadcast.program}`, e.broadcast?.segment && `内容: ${e.broadcast.segment}`,
      e.memo, e.url, opts.siteUrl && `${opts.siteUrl}/events/${e.id}`].filter(Boolean).join("\n");
    L.push("BEGIN:VEVENT", `UID:${e.id}@oshi-calendar`, `DTSTAMP:${stamp}`, `DTSTART:${icsDate(e.start_at)}`, `DTEND:${icsDate(end)}`,
      `SUMMARY:${esc(eventTitle(e, names))}`, `LOCATION:${esc(e.venue || e.broadcast?.station)}`, `DESCRIPTION:${esc(desc)}`);
    for (const m of opts.startAlarms ?? [1440, 60]) L.push(...alarm(m));
    L.push("END:VEVENT");
    e.deadlines.forEach((d, i) => {
      if (!d.at) return;
      L.push("BEGIN:VEVENT", `UID:${e.id}-dl${i}@oshi-calendar`, `DTSTAMP:${stamp}`, `DTSTART:${icsDate(d.at)}`,
        `DTEND:${icsDate(new Date(Date.parse(d.at) + 15 * 6e4).toISOString())}`, `SUMMARY:${esc(`⏰${d.label}：${e.title}`)}`);
      for (const m of opts.deadlineAlarms ?? [1440, 180]) L.push(...alarm(m));
      L.push("END:VEVENT");
    });
  }
  L.push("END:VCALENDAR");
  return L.map(fold).join("\r\n");
}

export function googleCalendarUrl(e: EventRow, artistNames: string[]) {
  if (!e.start_at) return "https://calendar.google.com/";
  const end = e.end_at ?? new Date(Date.parse(e.start_at) + 2 * 36e5).toISOString();
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: eventTitle(e, artistNames),
    dates: `${icsDate(e.start_at)}/${icsDate(end)}`,
    details: [e.memo, e.url].filter(Boolean).join("\n"),
    location: e.venue ?? e.broadcast?.station ?? "",
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
