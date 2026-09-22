-- 本部で編集する各種設定（料金・係数など）。key-value の JSON。
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.app_settings enable row level security;

-- 料金は購入者にも表示するため参照は公開、更新は管理者のみ（保存はservice role経由）。
create policy "settings_public_read" on public.app_settings for select using (true);
create policy "settings_admin_write" on public.app_settings
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
