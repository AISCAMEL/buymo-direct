-- チャットの外部連絡先・直接取引誘導の検知記録（AI/ルールベース共通の土台）。
alter table public.messages add column if not exists flagged    boolean not null default false;
alter table public.messages add column if not exists risk_level int not null default 0;

-- 検知イベント（証拠・監査）。元データ(original)を保持し、本部が確認できる。
create table if not exists public.moderation_events (
  id              uuid primary key default gen_random_uuid(),
  message_id      uuid references public.messages(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  actor_id        uuid,                 -- 送信者
  kind            text not null default 'chat',
  level           int not null default 0,
  reasons         text,
  original        text,                 -- マスク前の原文（本部確認用）
  created_at      timestamptz not null default now()
);
create index if not exists moderation_events_created_idx on public.moderation_events(created_at desc);
create index if not exists moderation_events_level_idx   on public.moderation_events(level);
alter table public.moderation_events enable row level security;
-- 参照は管理者のみ（挿入は service role 経由）。
create policy "moderation_admin_read" on public.moderation_events for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
