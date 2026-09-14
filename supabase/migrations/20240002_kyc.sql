-- KYC (本人確認) ステータス
create type if not exists kyc_status as enum ('unverified', 'pending', 'verified', 'rejected');

alter table public.profiles
  add column if not exists kyc_status kyc_status not null default 'unverified',
  add column if not exists kyc_verified_at timestamptz;

-- 本人確認書類（管理者のみ閲覧可）
create table if not exists public.kyc_documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  id_front_url text not null,
  selfie_url   text,
  status       kyc_status not null default 'pending',
  note         text,                          -- 管理者メモ
  submitted_at timestamptz not null default now(),
  reviewed_at  timestamptz,
  unique(user_id)
);

alter table public.kyc_documents enable row level security;

-- 本人のみ自分の書類を閲覧・作成
create policy "Own KYC documents"
  on public.kyc_documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 管理者は全件閲覧・更新
create policy "Admin KYC review"
  on public.kyc_documents for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- KYC 書類ストレージバケット（非公開）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('kyc-documents', 'kyc-documents', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
  on conflict (id) do nothing;

-- ストレージ RLS: 本人は自分のフォルダへのみ書き込み・読み取り可
create policy "KYC own upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "KYC own read"
  on storage.objects for select to authenticated
  using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "KYC own update"
  on storage.objects for update to authenticated
  using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- 管理者はすべてのファイルを閲覧可
create policy "KYC admin read"
  on storage.objects for select to authenticated
  using (bucket_id = 'kyc-documents' and exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));
