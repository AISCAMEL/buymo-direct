-- eKYC（TRUSTDOCK ホスト型）セッションの記録テーブル。
-- app/api/kyc/ekyc-start が pending 行を作成し、ekyc-callback が承認/却下で更新する。
-- callback_token は自己承認・改ざんを防ぐワンタイムトークン。
create table if not exists public.kyc_verifications (
  id text primary key,                 -- TRUSTDOCK セッションID（またはUUID）
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',   -- pending | verified | declined | failed
  trustdock_status text,
  redirect_url text,
  callback_token text,                 -- コールバック照合用ワンタイムトークン
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists kyc_verifications_user_idx on public.kyc_verifications (user_id);

alter table public.kyc_verifications enable row level security;

-- 本人のみ自分のセッションを参照可。作成・更新は service role 経由（ポリシー無し＝anon/authブロック）。
create policy "kyc_verifications_self_read" on public.kyc_verifications
  for select using (auth.uid() = user_id);
