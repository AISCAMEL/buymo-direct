-- 出品追加フィールド（VIN・動画・タイマー・ブースト）
alter table public.listings
  add column if not exists vin          text,
  add column if not exists video_url    text,
  add column if not exists expires_at   timestamptz,
  add column if not exists boosted_until timestamptz;

-- 整備記録テーブル
create table if not exists public.maintenance_records (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  title        text not null,
  performed_at date not null,
  mileage_km   integer,
  cost         integer,
  note         text,
  attachment_url text,
  created_at   timestamptz not null default now()
);

alter table public.maintenance_records enable row level security;

create policy "Public maintenance view"
  on public.maintenance_records for select
  using (true);

create policy "Owner maintenance manage"
  on public.maintenance_records for all
  using  (exists (select 1 from public.listings where id = listing_id and seller_id = auth.uid()))
  with check (exists (select 1 from public.listings where id = listing_id and seller_id = auth.uid()));

-- 整備記録添付ストレージ（公開）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('maintenance-docs', 'maintenance-docs', true, 10485760,
          array['image/jpeg','image/png','image/webp','application/pdf'])
  on conflict (id) do nothing;

create policy "Maintenance doc upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'maintenance-docs');

create policy "Maintenance doc read"
  on storage.objects for select
  using (bucket_id = 'maintenance-docs');
