-- 定期実行の設定（公開URLが決まってから、Supabase の SQL Editor で一度だけ実行する）
-- Vercel の無料プランでは定期実行が1日1回までなので、Supabase の pg_cron から呼び出す。
-- <SITE_URL> と <CRON_SECRET> を自分の値に置き換えてから実行してください。
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('oshi-collect', '0 */3 * * *', $$
  select net.http_get(url := '<SITE_URL>/api/cron/collect', headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'), timeout_milliseconds := 60000);
$$);

select cron.schedule('oshi-remind', '*/15 * * * *', $$
  select net.http_get(url := '<SITE_URL>/api/cron/remind', headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'), timeout_milliseconds := 60000);
$$);
