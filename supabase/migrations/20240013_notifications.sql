-- 通知テーブル
do $$ begin
  if not exists (select 1 from pg_type where typname='notification_type') then
    create type notification_type as enum ('message', 'escrow', 'kyc', 'system');
  end if;
end $$;

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       notification_type not null default 'system',
  title      text not null,
  body       text not null default '',
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- ユーザーは自分の通知のみ参照・更新可
create policy "Own notifications select"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Own notifications update"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- サービスロールからの INSERT を許可（RLS は service_role をバイパスするが明示化）
create policy "Service insert notifications"
  on public.notifications for insert
  with check (true);

-- 検索・ソート用インデックス
create index if not exists notifications_user_created
  on public.notifications (user_id, created_at desc);
