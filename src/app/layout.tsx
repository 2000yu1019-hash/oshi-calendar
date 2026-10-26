import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "推し活カレンダー",
  description: "推しのライブ、チケット締切、テレビ・ラジオ出演、コラボ情報をまとめて管理",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "推し活", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0b0b0d", viewportFit: "cover", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getUser();
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" />
      </head>
      <body>
        <Nav signedIn={!!user} />
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
