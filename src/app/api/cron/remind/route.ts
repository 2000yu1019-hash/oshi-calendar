import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { runReminders } from "@/lib/notify/remind";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 120;

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runReminders(createAdminClient()));
}
