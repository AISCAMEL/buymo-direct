-- 会員向け追加サービス

-- ポイント・ランクシステム
create table if not exists public.user_points (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  points      integer not null default 0 check (points >= 0),
  rank        text not null default 'bronze',  -- bronze/silver/gold/platinum
  updated_at  timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.point_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      integer not null,          -- positive = earn, negative = use
  reason      text not null,             -- 'escrow_completed', 'listing_sold', 'review_given', 'coupon_use', etc.
  ref_id      uuid,                      -- e.g. escrow_id
  created_at  timestamptz not null default now()
);

-- 車両査定申請
create table if not exists public.appraisal_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  maker          text not null,
  model          text not null,
  year           integer not null,
  mileage_km     integer not null,
  prefecture     text not null,
  condition      text not null default 'good',   -- excellent/good/fair/poor
  notes          text,
  status         text not null default 'pending', -- pending/in_review/completed
  price_low      integer,   -- 査定額下限
  price_high     integer,   -- 査定額上限
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);

-- 陸送手配
create table if not exists public.transport_bookings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  listing_id       uuid references public.listings(id),
  from_prefecture  text not null,
  to_prefecture    text not null,
  preferred_date   date,
  vehicle_info     text,
  status           text not null default 'pending',  -- pending/confirmed/in_transit/delivered
  estimated_price  integer,
  notes            text,
  created_at       timestamptz not null default now()
);

-- 延長保証
create table if not exists public.warranty_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  listing_id  uuid references public.listings(id),
  plan        text not null,       -- basic/standard/premium
  months      integer not null,    -- 3/6/12
  price       integer not null,
  starts_at   date not null,
  ends_at     date not null,
  status      text not null default 'active',  -- active/expired/cancelled
  created_at  timestamptz not null default now()
);

-- エスクロー確認チェックリスト
create table if not exists public.escrow_checklists (
  id          uuid primary key default gen_random_uuid(),
  escrow_id   uuid not null references public.escrow_transactions(id) on delete cascade,
  user_id     uuid not null references auth.users(id),
  item_key    text not null,
  checked     boolean not null default false,
  checked_at  timestamptz,
  unique(escrow_id, user_id, item_key)
);

-- エスクロー紛争申請
create table if not exists public.escrow_disputes (
  id          uuid primary key default gen_random_uuid(),
  escrow_id   uuid not null references public.escrow_transactions(id) on delete cascade,
  raised_by   uuid not null references auth.users(id),
  reason      text not null,
  description text,
  status      text not null default 'open',  -- open/investigating/resolved
  resolution  text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- RLS
alter table public.user_points enable row level security;
alter table public.point_transactions enable row level security;
alter table public.appraisal_requests enable row level security;
alter table public.transport_bookings enable row level security;
alter table public.warranty_subscriptions enable row level security;
alter table public.escrow_checklists enable row level security;
alter table public.escrow_disputes enable row level security;

create policy "own points" on public.user_points for all using (user_id = auth.uid());
create policy "own point tx" on public.point_transactions for all using (user_id = auth.uid());
create policy "own appraisals" on public.appraisal_requests for all using (user_id = auth.uid());
create policy "own transport" on public.transport_bookings for all using (user_id = auth.uid());
create policy "own warranty" on public.warranty_subscriptions for all using (user_id = auth.uid());
create policy "own checklists" on public.escrow_checklists for all using (user_id = auth.uid());
create policy "own disputes" on public.escrow_disputes for select using (raised_by = auth.uid() or exists (select 1 from public.escrow_transactions where id = escrow_id and (buyer_id = auth.uid() or seller_id = auth.uid())));
create policy "create dispute" on public.escrow_disputes for insert with check (raised_by = auth.uid());

-- admin access
create policy "admin points" on public.user_points for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "admin disputes" on public.escrow_disputes for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
