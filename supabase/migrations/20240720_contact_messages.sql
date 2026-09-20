-- お問い合わせフォームの送信内容を保存するテーブル
-- 送信・閲覧はすべてサーバー（service role）経由で行うため、RLSは有効にしつつポリシーは設けない
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  category text not null default 'general',
  message text not null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table contact_messages enable row level security;
-- ポリシーなし = anon/authenticated からは不可。サーバーの service role のみアクセス可能。

create index if not exists idx_contact_messages_status on contact_messages(status);
create index if not exists idx_contact_messages_created on contact_messages(created_at desc);
