-- ============================================================
-- コミュニティ強化：解決済みマーク ＋ いいね
-- ============================================================

alter table public.community_posts add column if not exists resolved boolean not null default false;

create table if not exists public.community_post_likes (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
create index if not exists community_likes_post_idx on public.community_post_likes(post_id);

alter table public.community_post_likes enable row level security;

-- 会員（有料/加盟店/本部）は参照可、いいねは本人のみ追加・削除。
create policy "community_likes_member_read" on public.community_post_likes for select using (
  exists (select 1 from public.profiles pr where pr.id = auth.uid() and (pr.role = 'admin' or pr.member_tier = 'paid'))
  or exists (select 1 from public.dealers d where d.owner_id = auth.uid())
  or exists (select 1 from public.dealer_staff s where s.user_id = auth.uid())
);
create policy "community_likes_own_insert" on public.community_post_likes for insert with check (user_id = auth.uid());
create policy "community_likes_own_delete" on public.community_post_likes for delete using (user_id = auth.uid());
