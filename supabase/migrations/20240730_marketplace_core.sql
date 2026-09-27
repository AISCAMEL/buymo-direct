-- ============================================================
-- マーケットプレイス中核：スキルマスタ / 加盟店スキル / 案件(Case)
-- 「車のプロを探す × スキルマーケット × 案件マッチング」の土台。
-- ============================================================

-- スキルマスタ（車のプロが提供できる仕事の種類）
create table if not exists public.skills (
  key      text primary key,
  name     text not null,
  category text,
  sort     int not null default 0
);
alter table public.skills enable row level security;
create policy "skills_public_read" on public.skills for select using (true);

insert into public.skills (key, name, category, sort) values
  ('appraisal','車両査定','査定・買取',1),
  ('buyback','中古車買取','査定・買取',2),
  ('sales','中古車販売','査定・買取',3),
  ('maintenance','整備','整備・修理',10),
  ('inspection','車検','整備・修理',11),
  ('bodywork','板金','整備・修理',12),
  ('painting','塗装','整備・修理',13),
  ('tire','タイヤ交換','整備・修理',14),
  ('coating','コーティング','美装',20),
  ('cleaning','ルームクリーニング','美装',21),
  ('nav_install','ナビ取付','電装・取付',30),
  ('drive_recorder','ドラレコ取付','電装・取付',31),
  ('electrical','電装','電装・取付',32),
  ('transport','陸送','物流・手続き',40),
  ('delivery','納車','物流・手続き',41),
  ('registration','名義変更','物流・手続き',50),
  ('scrap','廃車','物流・手続き',51),
  ('dismantle','解体','物流・手続き',52),
  ('other','その他','その他',99)
on conflict (key) do nothing;

-- 加盟店の提供スキル（作業×価格×エリア）
create table if not exists public.partner_skills (
  id         uuid primary key default gen_random_uuid(),
  dealer_id  uuid not null references public.dealers(id) on delete cascade,
  skill_key  text not null references public.skills(key),
  price_from integer,
  area       text,
  note       text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (dealer_id, skill_key)
);
create index if not exists partner_skills_dealer_idx on public.partner_skills(dealer_id);
create index if not exists partner_skills_skill_idx  on public.partner_skills(skill_key);
alter table public.partner_skills enable row level security;
create policy "partner_skills_public_read" on public.partner_skills for select using (active = true);
create policy "partner_skills_owner_all" on public.partner_skills for all
  using (exists (select 1 from public.dealers d where d.id = dealer_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.dealers d where d.id = dealer_id and d.owner_id = auth.uid()));

-- 案件(Case)：査定/整備/車検/陸送/名義変更… 全案件を統一管理
create table if not exists public.cases (
  id         uuid primary key default gen_random_uuid(),
  case_no    bigint generated always as identity,
  type       text not null,                       -- skills.key（査定/整備/…）
  source     text not null default 'DIRECT',      -- HQ | DIRECT | PARTNER
  status     text not null default 'new',         -- new|accepted|in_progress|awaiting|completed|paid|closed|declined
  user_id    uuid not null references public.profiles(id) on delete cascade,
  partner_id uuid references public.dealers(id) on delete set null,
  vehicle_id uuid references public.listings(id) on delete set null,
  title      text,
  detail     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cases_user_idx    on public.cases(user_id, created_at desc);
create index if not exists cases_partner_idx on public.cases(partner_id, created_at desc);
alter table public.cases enable row level security;
-- 依頼者は自分の案件を参照/更新（キャンセル等）
create policy "cases_user_read"   on public.cases for select using (auth.uid() = user_id);
create policy "cases_user_insert" on public.cases for insert with check (auth.uid() = user_id);
create policy "cases_user_update" on public.cases for update using (auth.uid() = user_id);
-- 加盟店オーナーは自社宛の案件を参照/更新（受注/辞退/進行）
create policy "cases_partner_read"   on public.cases for select
  using (exists (select 1 from public.dealers d where d.id = partner_id and d.owner_id = auth.uid()));
create policy "cases_partner_update" on public.cases for update
  using (exists (select 1 from public.dealers d where d.id = partner_id and d.owner_id = auth.uid()));
