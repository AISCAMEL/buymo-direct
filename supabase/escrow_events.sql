-- エスクロー進捗タイムライン：取引ごとの進捗報告イベントを保存するテーブル。
-- Supabase SQL Editor で1回実行してください（既存データには影響しません）。

create table if not exists public.escrow_events (
  id          uuid primary key default gen_random_uuid(),
  escrow_id   uuid not null references public.escrow_transactions(id) on delete cascade,
  type        text not null,                 -- lib/escrow-events.ts の EscrowEventType
  actor_role  text not null,                 -- 'admin' | 'seller' | 'buyer'
  created_by  uuid,                          -- 投稿者(auth.users.id)
  title       text not null,
  body        text,
  meta        jsonb not null default '{}'::jsonb,  -- 例: {"etaDays": 5}
  created_at  timestamptz not null default now()
);

create index if not exists escrow_events_escrow_idx
  on public.escrow_events (escrow_id, created_at);

alter table public.escrow_events enable row level security;

-- 閲覧：取引の当事者（売主・買主）と管理者のみ。
drop policy if exists "escrow_events_select" on public.escrow_events;
create policy "escrow_events_select" on public.escrow_events
  for select using (
    exists (
      select 1 from public.escrow_transactions t
      where t.id = escrow_events.escrow_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 追加：INSERT ポリシーは設けない（投稿はサーバーアクションがサービスロールで
-- 認可チェックのうえ実行する。service_role は RLS をバイパスする）。
