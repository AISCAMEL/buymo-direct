-- ============================================================
-- マッチング手数料（加盟店 → 本部の成果報酬）
-- 案件成立時に成約金額と手数料を記録し、本部が請求管理する。
-- ============================================================

-- 案件の成約金額（手数料計算の基礎）
alter table public.cases add column if not exists amount integer;

-- 案件ごとの手数料請求（1案件=1請求）
create table if not exists public.case_charges (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  partner_id  uuid references public.dealers(id) on delete set null,
  user_id     uuid references public.profiles(id) on delete set null,
  category    text,                                  -- サービスカテゴリー
  base_amount integer not null default 0,            -- 成約金額
  fee_rate    numeric not null default 0,            -- 適用料率
  fee_amount  integer not null default 0,            -- 手数料（税抜）
  tax         integer not null default 0,            -- 消費税
  total       integer not null default 0,            -- 請求総額（税込）
  status      text not null default 'pending',       -- pending|invoiced|paid|waived|cancelled
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (case_id)
);
create index if not exists case_charges_partner_idx on public.case_charges(partner_id, created_at desc);
create index if not exists case_charges_status_idx  on public.case_charges(status);
alter table public.case_charges enable row level security;

-- 参照: 加盟店オーナーは自社の手数料、依頼者は自分の案件の手数料（透明性）、管理者は全件。
-- 挿入・更新はサーバーアクション（service role）が担うため、書き込みポリシーは置かない。
create policy "case_charges_partner_read" on public.case_charges for select
  using (exists (select 1 from public.dealers d where d.id = partner_id and d.owner_id = auth.uid()));
create policy "case_charges_user_read" on public.case_charges for select
  using (auth.uid() = user_id);
create policy "case_charges_admin_read" on public.case_charges for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
