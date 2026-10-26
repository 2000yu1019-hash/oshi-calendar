import Link from "next/link";
import { CATEGORY_LABEL } from "@/lib/constants";
import { fmt, isPast, jst, weekday } from "@/lib/dates";
import type { Artist, EventWithStatus } from "@/lib/types";
import { StatusChip } from "./StatusChip";

export function artistColors(e: { artist_ids: string[] }, artists: Artist[]) {
  const cs = e.artist_ids.map((id) => artists.find((a) => a.id === id)?.color).filter(Boolean) as string[];
  return cs.length ? cs : ["#6b6977"];
}
export function artistNames(e: { artist_ids: string[] }, artists: Artist[]) {
  return e.artist_ids.map((id) => artists.find((a) => a.id === id)?.name).filter(Boolean).join(" × ") || "推し未設定";
}

export function EventRow({ e, artists }: { e: EventWithStatus; artists: Artist[] }) {
  const p = e.start_at ? jst(new Date(e.start_at)) : null;
  const now = Date.now();
  const nextDl = e.deadlines.filter((d) => Date.parse(d.at) > now).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0];
  const when = e.end_at ? `〜 ${fmt(e.end_at)}` : e.start_at && !e.all_day ? fmt(e.start_at).split(" ")[1] : "";
  return (
    <Link href={`/events/${e.id}`} className={`ev${isPast(e) ? " past" : ""}`}>
      <span className="stripe">{artistColors(e, artists).map((c, i) => <i key={i} style={{ background: c }} />)}</span>
      <span className="date">
        {p ? (<><div className="m">{p.m}月</div><div className="d">{p.d}</div><div className="w">{weekday(e.start_at!)}</div></>) : (<><div className="m">日付</div><div className="d">?</div></>)}
      </span>
      <span className="body">
        <div className="title">{e.title}</div>
        <div className="meta">
          <span>{artistNames(e, artists)}</span>
          {when && <span className="num">{when}</span>}
          {e.broadcast?.program && <span>{[e.broadcast.station, e.broadcast.program].filter(Boolean).join(" ")}</span>}
          {e.venue && <span>{e.venue}</span>}
          {nextDl && <span className="dl">{nextDl.label} {fmt(nextDl.at)}</span>}
        </div>
      </span>
      <span className="side chips">
        <span className="chip cat">{CATEGORY_LABEL[e.category] ?? "その他"}</span>
        {e.fc_only && <span className="chip lock">会員限定</span>}
        {e.origin === "auto" && <span className="chip auto">自動取得</span>}
        <StatusChip status={e.status} />
      </span>
    </Link>
  );
}
