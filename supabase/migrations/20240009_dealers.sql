-- =============================================
-- 加盟店（ディーラー）管理システム
-- =============================================

create type if not exists dealer_status as enum ('pending', 'approved', 'suspended');
create type if not exists dealer_role   as enum ('owner', 'manager', 'staff');

-- 加盟店マスタ
create table if not exists public.dealers (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users(id) on delete restrict,
  name             text not null,
  company_name     text,
  prefecture       text,
  address          text,
  phone            text,
  website_url      text,
  logo_url         text,
  description      text,
  status           dealer_status not null default 'pending',
  commission_rate  numeric(5,2) not null default 3.00,  -- 本部への手数料率(%)
  rejection_note   text,
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.dealers enable row level security;

create policy "Public approved dealers"
  on public.dealers for select
  using (status = 'approved');

create policy "Own dealer"
  on public.dealers for all
  using  (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- スタッフテーブル
create table if not exists public.dealer_staff (
  id          uuid primary key default gen_random_uuid(),
  dealer_id   uuid not null references public.dealers(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        dealer_role not null default 'staff',
  invited_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  unique(dealer_id, user_id)
);

alter table public.dealer_staff enable row level security;

create policy "Dealer staff view"
  on public.dealer_staff for select
  using (
    exists (
      select 1 from public.dealer_staff ds
      where ds.dealer_id = dealer_staff.dealer_id
        and ds.user_id = auth.uid()
    )
    or
    exists (select 1 from public.dealers d where d.id = dealer_staff.dealer_id and d.owner_id = auth.uid())
  );

create policy "Dealer owner manage staff"
  on public.dealer_staff for all
  using (
    exists (select 1 from public.dealers d where d.id = dealer_staff.dealer_id and d.owner_id = auth.uid())
    or
    exists (
      select 1 from public.dealer_staff ds
      where ds.dealer_id = dealer_staff.dealer_id
        and ds.user_id = auth.uid()
        and ds.role in ('owner', 'manager')
    )
  )
  with check (
    exists (select 1 from public.dealers d where d.id = dealer_staff.dealer_id and d.owner_id = auth.uid())
    or
    exists (
      select 1 from public.dealer_staff ds
      where ds.dealer_id = dealer_staff.dealer_id
        and ds.user_id = auth.uid()
        and ds.role in ('owner', 'manager')
    )
  );

-- スタッフ招待
create table if not exists public.dealer_invitations (
  id          uuid primary key default gen_random_uuid(),
  dealer_id   uuid not null references public.dealers(id) on delete cascade,
  email       text not null,
  role        dealer_role not null default 'staff',
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.dealer_invitations enable row level security;

create policy "Dealer invitation manage"
  on public.dealer_invitations for all
  using (
    exists (select 1 from public.dealers d where d.id = dealer_invitations.dealer_id and d.owner_id = auth.uid())
    or
    exists (
      select 1 from public.dealer_staff ds
      where ds.dealer_id = dealer_invitations.dealer_id
        and ds.user_id = auth.uid()
        and ds.role in ('owner','manager')
    )
  )
  with check (
    exists (select 1 from public.dealers d where d.id = dealer_invitations.dealer_id and d.owner_id = auth.uid())
    or
    exists (
      select 1 from public.dealer_staff ds
      where ds.dealer_id = dealer_invitations.dealer_id
        and ds.user_id = auth.uid()
        and ds.role in ('owner','manager')
    )
  );

-- API キー（外部在庫システム連携用）
create table if not exists public.dealer_api_keys (
  id           uuid primary key default gen_random_uuid(),
  dealer_id    uuid not null references public.dealers(id) on delete cascade,
  name         text not null,
  key_prefix   text not null,               -- 先頭8文字（表示用）
  key_hash     text not null unique,        -- SHA-256 ハッシュ
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.dealer_api_keys enable row level security;

create policy "Own dealer api keys"
  on public.dealer_api_keys for all
  using (
    exists (select 1 from public.dealers d where d.id = dealer_api_keys.dealer_id and d.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.dealers d where d.id = dealer_api_keys.dealer_id and d.owner_id = auth.uid())
  );

-- 外部 Webhook 設定（取引完了通知等）
create table if not exists public.dealer_webhooks (
  id          uuid primary key default gen_random_uuid(),
  dealer_id   uuid not null references public.dealers(id) on delete cascade,
  url         text not null,
  secret      text not null default encode(gen_random_bytes(16), 'hex'),
  events      text[] not null default array['deal.completed'],
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.dealer_webhooks enable row level security;

create policy "Own dealer webhooks"
  on public.dealer_webhooks for all
  using (
    exists (select 1 from public.dealers d where d.id = dealer_webhooks.dealer_id and d.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.dealers d where d.id = dealer_webhooks.dealer_id and d.owner_id = auth.uid())
  );

-- listings に dealer_id を追加
alter table public.listings
  add column if not exists dealer_id uuid references public.dealers(id);

create index if not exists listings_dealer_id_idx on public.listings(dealer_id);
