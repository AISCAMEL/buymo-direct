-- 査定履歴（無料査定・AI相場診断の結果を記録＝リード獲得）
-- 記録・閲覧はすべてサーバー（service role）経由。RLSは有効にしつつポリシーは設けない。
create table if not exists valuations (
  id uuid primary key default gen_random_uuid(),
  maker text not null,
  model text,
  year integer not null,
  mileage_km integer not null,
  condition text not null default 'good',
  price_low integer not null,
  price_high integer not null,
  price_est integer not null,
  source text not null default 'formula' check (source in ('ai', 'formula')),
  reasoning text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table valuations enable row level security;
-- ポリシーなし = anon/authenticated からは不可。サーバーの service role のみアクセス可能。

create index if not exists idx_valuations_created on valuations(created_at desc);
create index if not exists idx_valuations_user on valuations(user_id);
