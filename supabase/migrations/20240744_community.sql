-- ============================================================
-- 買取コミュニティ（加盟店・有料会員向け）
-- 初心者が安心して質問・相談できる場。運営が見守り・ピン留め可能。
-- 閲覧・投稿は「有料会員 or 加盟店オーナー/スタッフ or 本部」のみ。
-- ============================================================

create table if not exists public.community_posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid references public.profiles(id) on delete set null,
  category   text not null default 'question',  -- question|beginner|success|consult|official
  title      text not null,
  body       text,
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_posts_idx on public.community_posts(pinned desc, created_at desc);

create table if not exists public.community_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists community_comments_post_idx on public.community_comments(post_id, created_at);

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;

-- 会員判定（有料 or 加盟店 or 本部）を満たす人だけ閲覧・投稿できる。
-- 投稿・コメントの author は本人。編集/ピン/削除は本部。
create policy "community_posts_member_read" on public.community_posts for select using (
  exists (select 1 from public.profiles pr where pr.id = auth.uid() and (pr.role = 'admin' or pr.member_tier = 'paid'))
  or exists (select 1 from public.dealers d where d.owner_id = auth.uid())
  or exists (select 1 from public.dealer_staff s where s.user_id = auth.uid())
);
create policy "community_posts_member_insert" on public.community_posts for insert with check (
  author_id = auth.uid() and (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and (pr.role = 'admin' or pr.member_tier = 'paid'))
    or exists (select 1 from public.dealers d where d.owner_id = auth.uid())
    or exists (select 1 from public.dealer_staff s where s.user_id = auth.uid())
  )
);
create policy "community_posts_own_update" on public.community_posts for update using (author_id = auth.uid());
create policy "community_posts_admin_all" on public.community_posts for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "community_comments_member_read" on public.community_comments for select using (
  exists (select 1 from public.profiles pr where pr.id = auth.uid() and (pr.role = 'admin' or pr.member_tier = 'paid'))
  or exists (select 1 from public.dealers d where d.owner_id = auth.uid())
  or exists (select 1 from public.dealer_staff s where s.user_id = auth.uid())
);
create policy "community_comments_member_insert" on public.community_comments for insert with check (
  author_id = auth.uid() and (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and (pr.role = 'admin' or pr.member_tier = 'paid'))
    or exists (select 1 from public.dealers d where d.owner_id = auth.uid())
    or exists (select 1 from public.dealer_staff s where s.user_id = auth.uid())
  )
);
create policy "community_comments_admin_all" on public.community_comments for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ウェルカム投稿（運営・ピン留め）
insert into public.community_posts (id, author_id, category, title, pinned, body)
values (
  '00000000-0000-0000-0000-0000000c0de1', null, 'official',
  'ようこそ！買取コミュニティのご案内', true,
  E'買取加盟店のみなさま、ようこそ。\n\nここは買取初心者の方も安心して質問・相談できるコミュニティです。運営も見守っています。\n\n■ 安心してご利用いただくために\n・分からないことは「初心者質問」で気軽にどうぞ\n・誹謗中傷、個人情報・外部連絡先の書き込みは禁止です\n・成功事例やコツの共有も歓迎します\n\nまずは自己紹介や、いま困っていることを投稿してみましょう。学びは「買取を学ぶ」講座もご活用ください。'
)
on conflict (id) do nothing;
