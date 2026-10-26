-- 推し活カレンダー 初期スキーマ
create extension if not exists pgcrypto;

-- ユーザー設定
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  remind_days int not null default 7,
  notify_push boolean not null default true,
  notify_email boolean not null default true,
  notify_line boolean not null default false,
  -- イベント開始の何分前に通知するか / 締切の何分前に通知するか
  remind_before_start int[] not null default '{1440,60}',
  remind_before_deadline int[] not null default '{1440,180}',
  line_user_id text,
  line_link_code text unique default upper(substr(encode(gen_random_bytes(6),'hex'),1,8)),
  ics_token text unique not null default encode(gen_random_bytes(16),'hex'),
  inbound_token text unique not null default encode(gen_random_bytes(8),'hex'),
  created_at timestamptz not null default now()
);

-- アーティスト（全ユーザー共通のカタログ）
create table public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  aliases text[] not null default '{}',   -- 検索・ニュース照合用の別名（例: ミセス, Taylor Swift）
  color text not null default '#e9d8a6',
  links jsonb not null default '{}',      -- {official,x,instagram,tiktok,youtube,fc,shop}
  country text not null default 'JP',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- 自動取得の情報源（RSSなど）
create table public.artist_sources (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists on delete cascade,
  kind text not null check (kind in ('rss','google_news','tv')),
  url text,
  query text,
  label text,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.follows (
  user_id uuid not null references auth.users on delete cascade,
  artist_id uuid not null references public.artists on delete cascade,
  color text,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);

-- 予定。owner_id が null なら自動取得で全員に公開、ある場合はユーザー登録（is_public で共有）
create table public.events (
  id uuid primary key default gen_random_uuid(),
  artist_ids uuid[] not null default '{}',
  title text not null,
  category text not null default 'other',
  start_at timestamptz,
  end_at timestamptz,
  all_day boolean not null default false,
  venue text,
  url text,
  source text not null default 'other',
  fc_only boolean not null default false,
  memo text,
  -- TV・ラジオ: {station, program, segment}
  broadcast jsonb,
  deadlines jsonb not null default '[]',   -- [{label, at}]
  owner_id uuid references auth.users on delete cascade,
  is_public boolean not null default false,
  origin text not null default 'user' check (origin in ('user','auto','mail')),
  verified boolean not null default false,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_artist_ids_idx on public.events using gin (artist_ids);
create index events_start_idx on public.events (start_at);

-- ユーザーごとの参加状況
create table public.user_events (
  user_id uuid not null references auth.users on delete cascade,
  event_id uuid not null references public.events on delete cascade,
  status text not null default '' check (status in ('','consider','apply','got','go','skip')),
  hidden boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- 同じ通知を二度送らないための記録
create table public.notification_log (
  user_id uuid not null references auth.users on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- 新規ユーザーに profile を作る
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.artist_sources enable row level security;
alter table public.follows enable row level security;
alter table public.events enable row level security;
alter table public.user_events enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_log enable row level security;

create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

create policy "artists readable" on public.artists for select using (true);
create policy "artists insert by users" on public.artists for insert to authenticated with check (created_by = auth.uid());
create policy "artists update by creator" on public.artists for update to authenticated using (created_by = auth.uid());

create policy "sources readable" on public.artist_sources for select using (true);

create policy "own follows" on public.follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "events visible" on public.events for select
  using (owner_id is null or is_public or owner_id = auth.uid());
create policy "events insert own" on public.events for insert to authenticated with check (owner_id = auth.uid());
create policy "events update own" on public.events for update to authenticated using (owner_id = auth.uid());
create policy "events delete own" on public.events for delete to authenticated using (owner_id = auth.uid());

create policy "own user_events" on public.user_events for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own push" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- notification_log はサービスロールのみ（ポリシーなし）
