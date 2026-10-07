-- 廃車買取のお申し込み（その場提示買取）。全国買取価格表 − ¥5,000 を基準に提示。
create table if not exists public.haisha_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,

  -- 車両
  maker text,
  model text,
  year int,
  body text,
  color text,

  -- エリア・区分
  pref text,
  side text,                 -- 京都府/兵庫県の 日本海側/太平洋側
  disp_idx int,              -- 排気量区分 index（0=軽 … 6=3001cc〜）
  mileage text,

  -- 状態
  run_state text,            -- run/idle/nostart/accident/flood/burn
  key_state text,            -- ok/nokey
  shaken_months int,         -- 車検残り月数
  repaired boolean,          -- 修復歴
  missing text[],            -- 欠品・不足

  -- 名義・抹消
  owner_type text,           -- self/user/lien/deceased/other
  matsu_type text,           -- eikyu/ichiji

  -- 算定結果（申込時点のスナップショット）
  base_price int,            -- 全国買取価格表 基準額
  offer_price int,           -- その場提示 買取額（基準−5000−減額）
  refund_total int,          -- 還付金 概算 合計（別枠）
  needs_assessment boolean default false, -- 引取不可/別途査定フラグ

  -- 連絡先・希望
  contact_name text not null,
  contact_phone text not null,
  contact_email text,
  preferred_date text,
  notes text,

  -- 運営
  status text not null default 'pending'
    check (status in ('pending','assessing','arranged','picked_up','paid','erased','refunded','cancelled')),
  paid boolean not null default false,
  erased boolean not null default false,
  refunded boolean not null default false,
  admin_memo text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_haisha_status on public.haisha_requests(status, created_at desc);

alter table public.haisha_requests enable row level security;

-- 保存は service role（APIサーバー）経由のみ。閲覧・更新は管理者。
drop policy if exists "haisha_admin_all" on public.haisha_requests;
create policy "haisha_admin_all" on public.haisha_requests
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 本人は自分の申込を閲覧可。
drop policy if exists "haisha_own_select" on public.haisha_requests;
create policy "haisha_own_select" on public.haisha_requests
  for select using (user_id = auth.uid());
