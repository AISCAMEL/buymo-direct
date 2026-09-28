-- ============================================================
-- フリーミアム動線：会員種別 ＋ 加盟店希望リード
--   - profiles.member_tier: free（無料）| paid（有料会員）
--   - dealer_leads: 加盟店・プロ希望フォームの受付（本部が追客）
-- ============================================================

alter table public.profiles add column if not exists member_tier text not null default 'free'; -- free | paid

create table if not exists public.dealer_leads (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references public.profiles(id) on delete set null,
  name               text,
  email              text,
  phone              text,
  business_type_wish text,                     -- pro（スキル提供）| sole_proprietor | corporation | undecided
  message            text,
  source             text,                     -- どの画面から来たか
  status             text not null default 'new', -- new|contacted|converted|closed
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists dealer_leads_status_idx on public.dealer_leads(status, created_at desc);
alter table public.dealer_leads enable row level security;

-- 本人は自分の申込を参照、管理者は全件。挿入はサーバー(service role)経由。
create policy "dealer_leads_own_read" on public.dealer_leads for select using (auth.uid() = user_id);
create policy "dealer_leads_admin_all" on public.dealer_leads for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
