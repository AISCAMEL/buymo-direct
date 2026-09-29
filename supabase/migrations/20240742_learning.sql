-- ============================================================
-- オンライン学習コンテンツ「買取を学ぶ」
--   - is_premium=true は有料会員・加盟店・本部のみ全文閲覧（無料は概要まで）
--   - published=true のみ一般公開。本部が管理。
-- ============================================================

create table if not exists public.learning_contents (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  summary     text,
  body        text,
  category    text,                          -- basics|appraisal|pricing|sourcing|legal|sales
  is_premium  boolean not null default true,
  published   boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists learning_published_idx on public.learning_contents(published, sort);
alter table public.learning_contents enable row level security;

-- 公開分は誰でも参照（本文のゲートはアプリ側で制御）、本部は全操作。
create policy "learning_public_read" on public.learning_contents for select using (published = true);
create policy "learning_admin_all" on public.learning_contents for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- サンプル講座（初回のみ）
insert into public.learning_contents (slug, title, summary, category, is_premium, sort, body) values
  ('kaitori-basics', '買取の基礎：はじめての中古車買取', '買取ビジネスの全体像、必要な許認可、リスクと利益の考え方を学びます。', 'basics', false, 1,
   E'買取ビジネスの全体像\n\n中古車買取は「仕入れ（買取）→ 整備・商品化 → 販売」で利益を生みます。まずは古物商許可を取得し、適正な査定と在庫管理を身につけることが第一歩です。\n\nこの無料レッスンでは全体像だけを扱います。実践的な査定手法・相場の読み方は有料の各レッスンで詳しく解説します。'),
  ('appraisal-method', '査定の実践：ポイントと減点方式', '外装・内装・機関・修復歴の見方、減点方式の査定手順を実例で解説。', 'appraisal', true, 2,
   E'査定の基本は減点方式です。\n\n1. 外装：キズ・へこみ・再塗装の見分け\n2. 内装：におい・シート・電装の動作\n3. 機関：エンジン・ミッション・下回り\n4. 修復歴：骨格部位の確認\n\n各項目の減点幅と、相場からの調整方法を具体例で学びます。'),
  ('pricing-market', '相場の読み方：オークション相場と小売相場', 'AA相場・小売相場・在庫回転から、買取上限額を導く方法。', 'pricing', true, 3,
   E'買取価格は「販売見込み − 経費 − 利益」から逆算します。\n\nオークション相場（AA）と小売相場の差、在庫回転日数、整備費用を織り込み、買取上限額を決めます。相場データの集め方と更新頻度もあわせて解説します。'),
  ('sourcing', '仕入れを増やす：集客と信頼構築', '個人からの直接買取を増やすための集客と、選ばれる店づくり。', 'sourcing', true, 4,
   E'仕入れの安定にはリピートと紹介が重要です。\n\n査定の透明性、スピード、丁寧な説明が信頼につながります。BUYMO上でのプロフィール・実績・レビューを整え、指名される店を目指しましょう。'),
  ('legal-compliance', '法令とコンプライアンス：古物営業法の要点', '古物商許可、本人確認、帳簿記録など守るべき基本ルール。', 'legal', true, 5,
   E'古物営業法では、取引時の本人確認や帳簿への記録が求められます。\n\n盗品防止の観点から、売主の本人確認・記録の保存は必須です。BUYMOの本人確認・取引記録を活用し、コンプライアンスを担保しましょう。')
on conflict (slug) do nothing;
