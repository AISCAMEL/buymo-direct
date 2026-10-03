-- ============================================================
-- 有料会員コンテンツ（相場・仕入れ・資料・動画）
--   閲覧は 有料会員 / 加盟店 / 本部（premium）のみ。
--   本部が追加・編集する。
-- ============================================================

create table if not exists public.premium_resources (
  id         uuid primary key default gen_random_uuid(),
  category   text not null default 'market',   -- market(相場)|sourcing(仕入れ)|doc(資料)|video(動画)
  title      text not null,
  summary    text,
  body       text,
  url        text,
  published  boolean not null default true,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists premium_resources_idx on public.premium_resources(published, sort, created_at desc);
alter table public.premium_resources enable row level security;

drop policy if exists "premium_resources_member_read" on public.premium_resources;
create policy "premium_resources_member_read" on public.premium_resources for select using (
  published and (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and (pr.role = 'admin' or pr.member_tier = 'paid'))
    or exists (select 1 from public.dealers d where d.owner_id = auth.uid())
    or exists (select 1 from public.dealer_staff s where s.user_id = auth.uid())
  )
);
drop policy if exists "premium_resources_admin_all" on public.premium_resources;
create policy "premium_resources_admin_all" on public.premium_resources for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 初期コンテンツ（サンプル）
insert into public.premium_resources (id, category, title, summary, sort) values
  ('00000000-0000-0000-0000-0000000d0001','market','今月の中古車相場ハイライト','人気車種の落札相場レンジと動向のまとめ。',10),
  ('00000000-0000-0000-0000-0000000d0002','sourcing','仕入れの狙い目リスト','回転が速く利益が残りやすい車種・条件の目安。',20),
  ('00000000-0000-0000-0000-0000000d0003','doc','査定チェックシート（PDF配布予定）','現車確認・査定時の確認項目テンプレート。',30),
  ('00000000-0000-0000-0000-0000000d0004','video','実践セミナー アーカイブ','買取の始め方・相場の読み方の録画（準備中）。',40)
on conflict (id) do nothing;
