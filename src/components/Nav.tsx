"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/", "ホーム", "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"],
  ["/calendar", "カレンダー", "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"],
  ["/list", "一覧", "M5 6h14M5 12h14M5 18h14"],
  ["/artists", "推し", "M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"],
  ["/settings", "設定", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"],
] as const;

export function Nav({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const current = (href: string) => (href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined;
  const items = (icons: boolean) =>
    TABS.map(([href, label, d]) => (
      <Link key={href} href={href} className="tab" aria-current={current(href)}>
        {icons && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
        )}
        {label}
      </Link>
    ));
  return (
    <>
      <header className="top">
        <div className="topin">
          <Link href="/" className="logo">推し活<span>カレンダー</span></Link>
          {signedIn ? (
            <>
              <nav className="tabs" aria-label="メニュー">{items(false)}</nav>
              <Link href="/events/new" className="btn primary addtop">＋ 予定を追加</Link>
            </>
          ) : (
            <Link href="/login" className="btn primary" style={{ marginLeft: "auto" }}>ログイン・新規登録</Link>
          )}
        </div>
      </header>
      {signedIn && <nav className="bottomnav" aria-label="メニュー">{items(true)}</nav>}
    </>
  );
}
