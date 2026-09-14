-- 価格交渉（オファー）
create type if not exists offer_status as enum (
  'pending',      -- 提示中（売主待ち）
  'countered',    -- 売主が反対提示（買主待ち）
  'accepted',     -- 成立
  'rejected',     -- 拒否
  'cancelled',    -- 買主がキャンセル
  'expired'       -- 期限切れ（cron で更新）
);

create table if not exists public.offers (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references public.listings(id) on delete cascade,
  conversation_id  uuid references public.conversations(id) on delete set null,
  buyer_id         uuid not null references auth.users(id) on delete cascade,
  seller_id        uuid not null references auth.users(id) on delete cascade,
  amount           integer not null check (amount > 0),      -- 提示額（円）
  message          text,                                      -- 購入希望メッセージ
  counter_amount   integer check (counter_amount > 0),       -- 反対提示額
  counter_message  text,
  status           offer_status not null default 'pending',
  expires_at       timestamptz not null default (now() + interval '3 days'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- 1 出品につき買主 1 件のアクティブオファーのみ許可
  unique nulls not distinct (listing_id, buyer_id)
);

alter table public.offers enable row level security;

-- 買主: 自分のオファーを全操作
create policy "Buyer own offers"
  on public.offers for all
  using  (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

-- 売主: 自分の出品へのオファーを閲覧・更新
create policy "Seller view offers"
  on public.offers for select
  using (auth.uid() = seller_id);

create policy "Seller update offers"
  on public.offers for update
  using (auth.uid() = seller_id);
