-- クーポン・割引コード
create type if not exists coupon_type as enum ('percent', 'fixed');

create table if not exists public.coupons (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  type        coupon_type not null default 'fixed',
  value       integer not null check (value > 0),
  max_uses    integer,
  used_count  integer not null default 0,
  min_amount  integer not null default 0,
  expires_at  timestamptz,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.coupons enable row level security;

create policy "Public coupon lookup"
  on public.coupons for select
  using (active = true and (expires_at is null or expires_at > now()));

-- クーポン利用記録
create table if not exists public.coupon_uses (
  id         uuid primary key default gen_random_uuid(),
  coupon_id  uuid not null references public.coupons(id),
  user_id    uuid not null references auth.users(id),
  escrow_id  uuid references public.escrow_transactions(id),
  discount   integer not null,
  created_at timestamptz not null default now(),
  unique(coupon_id, user_id)
);

alter table public.coupon_uses enable row level security;

create policy "Own coupon uses"
  on public.coupon_uses for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- エスクローに割引額カラムを追加
alter table public.escrow_transactions
  add column if not exists coupon_discount integer not null default 0;
