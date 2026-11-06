import { NextResponse } from "next/server";
import { collectAll } from "@/lib/collect/run";
import { isCronAuthorized } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const report = await collectAll(createAdminClient());
  return NextResponse.json({ report });
}
