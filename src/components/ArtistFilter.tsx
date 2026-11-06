import Link from "next/link";
import type { Artist } from "@/lib/types";

export function ArtistFilter({ artists, current, base, keep = {} }: { artists: Artist[]; current?: string; base: string; keep?: Record<string, string | undefined> }) {
  const href = (a?: string) => base + "?" + new URLSearchParams(Object.entries({ ...keep, a }).filter(([, v]) => v) as [string, string][]);
  return (
    <div className="seg" role="group" aria-label="推しで絞り込み">
      <Link href={href(undefined)} aria-current={!current ? "true" : undefined}>すべての推し</Link>
      {artists.map((a) => (
        <Link key={a.id} href={href(a.id)} aria-current={current === a.id ? "true" : undefined}>
          <span className="dot" style={{ ["--c" as string]: a.color }} />{a.name}
        </Link>
      ))}
    </div>
  );
}
