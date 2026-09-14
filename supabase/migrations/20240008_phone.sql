-- 電話番号認証
alter table public.profiles
  add column if not exists phone             text,
  add column if not exists phone_verified_at timestamptz;

-- 電話番号 OTP トークン（一時保管）
create table if not exists public.phone_otp (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  phone      text not null,
  otp_hash   text not null,       -- bcrypt/sha256 ハッシュ（平文は SMS のみ）
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now()
);

alter table public.phone_otp enable row level security;

create policy "Own OTP"
  on public.phone_otp for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
