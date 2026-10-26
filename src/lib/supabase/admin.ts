import { createClient } from "@supabase/supabase-js";

/** サービスロール。定期実行やWebhookなど、サーバー内だけで使う */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
