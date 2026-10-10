-- 見学・試乗の日程調整（売り手・買い手のスケジュール機能）。
-- 買い手または売り手が候補日時を提案し、相手が1つ選んで確定する。会話単位で管理。

create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  listing_id       uuid references public.listings(id) on delete set null,
  buyer_id         uuid not null references public.profiles(id) on delete cascade,
  seller_id        uuid not null references public.profiles(id) on delete cascade,
  kind             text not null default 'visit',       -- visit（現車確認）/ testdrive（試乗）
  status           text not null default 'proposed'      -- proposed / confirmed / declined / cancelled
    check (status in ('proposed','confirmed','declined','cancelled')),
  proposed_slots   jsonb not null default '[]'::jsonb,   -- 候補日時（ISO文字列の配列）
  confirmed_slot   timestamptz,                          -- 確定した日時（未確定なら NULL）
  note             text,
  proposed_by      uuid not null references public.profiles(id),  -- 候補を出した側
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists appointments_conv_idx on public.appointments (conversation_id, created_at desc);

alter table public.appointments enable row level security;

-- 当事者（買い手・売り手）のみ参照・作成・更新できる。
drop policy if exists "appointments_select_parties" on public.appointments;
create policy "appointments_select_parties" on public.appointments for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());

drop policy if exists "appointments_insert_parties" on public.appointments;
create policy "appointments_insert_parties" on public.appointments for insert
  with check ((buyer_id = auth.uid() or seller_id = auth.uid()) and proposed_by = auth.uid());

drop policy if exists "appointments_update_parties" on public.appointments;
create policy "appointments_update_parties" on public.appointments for update
  using (buyer_id = auth.uid() or seller_id = auth.uid());
