-- ============================================================
-- ユーザーブロック（売り手が買い手をブロックするなど）
--   blocker_id が blocked_id をブロック。双方向の判定はアプリ側で。
--   ブロックすると、相手からの新規会話開始・メッセージ送信を拒否。
-- ============================================================

create table if not exists public.user_blocks (
  id          uuid primary key default gen_random_uuid(),
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);
create index if not exists user_blocks_blocker_idx on public.user_blocks(blocker_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);
alter table public.user_blocks enable row level security;

-- 自分がブロックした一覧は本人が全操作可能
drop policy if exists "user_blocks_owner_all" on public.user_blocks;
create policy "user_blocks_owner_all" on public.user_blocks for all
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

-- ブロックされた側も「自分がブロックされているか」を確認できる（送信制御の表示用）
drop policy if exists "user_blocks_blocked_read" on public.user_blocks;
create policy "user_blocks_blocked_read" on public.user_blocks for select
  using (blocked_id = auth.uid());

-- 2者間にブロック関係があるか（どちら向きでも）。SECURITY DEFINER で判定。
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;
