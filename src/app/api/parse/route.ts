import { NextResponse } from "next/server";
import { parseAnnouncement } from "@/lib/claude";
import { getUser } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
  const { text } = await req.json();
  if (typeof text !== "string" || !text.trim()) return NextResponse.json({ error: "告知文を貼り付けてください" }, { status: 400 });
  const { data: artists } = await supabase.from("artists").select("id,name,aliases");
  const names = (artists ?? []).flatMap((a) => [a.name, ...(a.aliases ?? [])]);
  const { draft, by } = await parseAnnouncement(text.slice(0, 8000), names);
  // 別名で読み取った場合も正式なアーティストに対応づける
  const match = (artists ?? []).find((a) => draft.artist && [a.name, ...(a.aliases ?? [])].some((n: string) => n.toLowerCase() === draft.artist.toLowerCase() || draft.artist.includes(n)));
  return NextResponse.json({ draft, artistId: match?.id ?? null, by });
}
