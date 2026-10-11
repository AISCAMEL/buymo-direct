-- パーツオークションの通報（不正・吊り上げ・禁止品など）。
create table if not exists public.part_reports (
  id          uuid primary key default gen_random_uuid(),
  auction_id  uuid not null references public.part_auctions(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,          -- prohibited|fake|shill|other
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists part_reports_auction_idx on public.part_reports (auction_id, created_at desc);
alter table public.part_reports enable row level security;
-- 本人は自分の通報のみ参照可。作成は本人。閲覧（全件）は運営がサービスロールで行う。
drop policy if exists "part_reports_select_own" on public.part_reports;
create policy "part_reports_select_own" on public.part_reports for select using (reporter_id = auth.uid());
drop policy if exists "part_reports_insert_own" on public.part_reports;
create policy "part_reports_insert_own" on public.part_reports for insert with check (reporter_id = auth.uid());
