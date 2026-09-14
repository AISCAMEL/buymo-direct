-- ============================================================================
-- BUYMO C2C Marketplace — Database schema (Supabase / PostgreSQL)
-- 個人間（C2C）中古車売買プラットフォーム
--
-- 実行方法: Supabase Dashboard > SQL Editor に貼り付けて Run。
-- 認証は Supabase Auth（auth.users）を利用します。
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ENUM 型
-- ---------------------------------------------------------------------------
do $$ begin
  create type listing_status as enum ('draft', 'active', 'reserved', 'sold', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type escrow_status as enum (
    'initiated',      -- 取引開始（合意）
    'funds_held',     -- 買主が入金しエスクローで保全
    'inspection',     -- 現車確認・整備
    'title_transfer', -- 名義変更手続き中
    'completed',      -- 取引完了・売主へ送金
    'cancelled',      -- キャンセル
    'disputed'        -- トラブル・係争中
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type title_transfer_option as enum ('self', 'standard', 'remote');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash', 'loan', 'credit');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles : auth.users に対する公開プロフィール
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '名無しユーザー',
  avatar_url   text,
  prefecture   text,
  bio          text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- listings : 出品中古車
-- ---------------------------------------------------------------------------
create table if not exists public.listings (
  id              uuid primary key default gen_random_uuid(),
  seller_id       uuid not null references public.profiles(id) on delete cascade,
  title           text not null,
  maker           text not null,
  model           text not null,
  year            int  not null,
  mileage_km      int  not null default 0,
  price           int  not null,            -- 円（税込）
  body_type       text,
  transmission    text,                     -- AT / MT / CVT 等
  fuel            text,                     -- ガソリン / HV / EV / ディーゼル
  color           text,
  prefecture      text not null,
  repair_history  boolean not null default false,  -- 修復歴あり=true
  description     text,
  status          listing_status not null default 'active',
  view_count      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists listings_status_idx     on public.listings (status);
create index if not exists listings_maker_idx       on public.listings (maker);
create index if not exists listings_price_idx       on public.listings (price);
create index if not exists listings_created_at_idx  on public.listings (created_at desc);
create index if not exists listings_seller_idx      on public.listings (seller_id);

-- ---------------------------------------------------------------------------
-- listing_images : 出品画像（Supabase Storage の公開URL）
-- ---------------------------------------------------------------------------
create table if not exists public.listing_images (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  url         text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists listing_images_listing_idx on public.listing_images (listing_id, sort_order);

-- ---------------------------------------------------------------------------
-- conversations : 出品ごとの 売主×買主 1対1スレッド
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  buyer_id        uuid not null references public.profiles(id) on delete cascade,
  seller_id       uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (listing_id, buyer_id)
);
create index if not exists conversations_buyer_idx  on public.conversations (buyer_id, last_message_at desc);
create index if not exists conversations_seller_idx on public.conversations (seller_id, last_message_at desc);

-- ---------------------------------------------------------------------------
-- messages : スレッド内メッセージ
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- escrow_transactions : エスクロー決済 + 名義変更
-- ---------------------------------------------------------------------------
create table if not exists public.escrow_transactions (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references public.listings(id) on delete cascade,
  conversation_id  uuid references public.conversations(id) on delete set null,
  buyer_id         uuid not null references public.profiles(id) on delete cascade,
  seller_id        uuid not null references public.profiles(id) on delete cascade,
  amount           int  not null,                -- 車両代金（円）
  escrow_fee       int  not null default 5500,   -- エスクロー手数料（円）
  title_option     title_transfer_option not null default 'standard',
  title_fee        int  not null default 49800,  -- 名義変更代行費（円）
  payment_method   payment_method,               -- 現金 / ローン / クレジット
  installment_fee  int  not null default 0,       -- クレジット分割手数料（4.2%）
  square_payment_id text,                         -- Square 決済ID（クレジット時）
  status           escrow_status not null default 'initiated',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists escrow_buyer_idx  on public.escrow_transactions (buyer_id);
create index if not exists escrow_seller_idx on public.escrow_transactions (seller_id);

-- 既存DB向け（決済方法カラムの後付け）
alter table public.escrow_transactions
  add column if not exists payment_method    payment_method,
  add column if not exists installment_fee   int not null default 0,
  add column if not exists square_payment_id text;

-- ---------------------------------------------------------------------------
-- updated_at 自動更新トリガ
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_listings_touch on public.listings;
create trigger trg_listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_escrow_touch on public.escrow_transactions;
create trigger trg_escrow_touch before update on public.escrow_transactions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 新規ユーザー登録時に profiles を自動作成
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- conversation に新規メッセージが入ったら last_message_at を更新
create or replace function public.bump_conversation()
returns trigger language plpgsql as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists trg_messages_bump on public.messages;
create trigger trg_messages_bump after insert on public.messages
  for each row execute function public.bump_conversation();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles            enable row level security;
alter table public.listings            enable row level security;
alter table public.listing_images      enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;
alter table public.escrow_transactions enable row level security;

-- profiles: 誰でも閲覧可、本人のみ更新
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- listings: active は誰でも閲覧 / 売主は自分の全状態を閲覧・編集
drop policy if exists "listings_select_public" on public.listings;
create policy "listings_select_public" on public.listings for select
  using (status = 'active' or status = 'reserved' or status = 'sold' or seller_id = auth.uid());
drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own" on public.listings for insert with check (seller_id = auth.uid());
drop policy if exists "listings_update_own" on public.listings;
create policy "listings_update_own" on public.listings for update using (seller_id = auth.uid());
drop policy if exists "listings_delete_own" on public.listings;
create policy "listings_delete_own" on public.listings for delete using (seller_id = auth.uid());

-- listing_images: 出品が見えれば画像も見える / 売主のみ追加・削除
drop policy if exists "listing_images_select" on public.listing_images;
create policy "listing_images_select" on public.listing_images for select using (
  exists (select 1 from public.listings l where l.id = listing_id
          and (l.status <> 'draft' or l.seller_id = auth.uid()))
);
drop policy if exists "listing_images_write_own" on public.listing_images;
create policy "listing_images_write_own" on public.listing_images for all using (
  exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
) with check (
  exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
);

-- conversations: 当事者（買主/売主）のみ
drop policy if exists "conversations_select_party" on public.conversations;
create policy "conversations_select_party" on public.conversations for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());
drop policy if exists "conversations_insert_buyer" on public.conversations;
create policy "conversations_insert_buyer" on public.conversations for insert
  with check (buyer_id = auth.uid());

-- messages: 当事者のみ閲覧 / 送信は本人かつ当事者
drop policy if exists "messages_select_party" on public.messages;
create policy "messages_select_party" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id
          and (c.buyer_id = auth.uid() or c.seller_id = auth.uid()))
);
drop policy if exists "messages_insert_party" on public.messages;
create policy "messages_insert_party" on public.messages for insert with check (
  sender_id = auth.uid() and
  exists (select 1 from public.conversations c where c.id = conversation_id
          and (c.buyer_id = auth.uid() or c.seller_id = auth.uid()))
);

-- escrow: 当事者のみ
drop policy if exists "escrow_select_party" on public.escrow_transactions;
create policy "escrow_select_party" on public.escrow_transactions for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());
drop policy if exists "escrow_insert_party" on public.escrow_transactions;
create policy "escrow_insert_party" on public.escrow_transactions for insert
  with check (buyer_id = auth.uid() or seller_id = auth.uid());
drop policy if exists "escrow_update_party" on public.escrow_transactions;
create policy "escrow_update_party" on public.escrow_transactions for update
  using (buyer_id = auth.uid() or seller_id = auth.uid());

-- ============================================================================
-- Storage バケット（出品画像）
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

drop policy if exists "listing_images_public_read" on storage.objects;
create policy "listing_images_public_read" on storage.objects for select
  using (bucket_id = 'listing-images');

drop policy if exists "listing_images_auth_upload" on storage.objects;
create policy "listing_images_auth_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "listing_images_auth_delete" on storage.objects;
create policy "listing_images_auth_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- Realtime（messages のリアルタイム購読を有効化）
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- favorites : お気に入り（ウォッチリスト）
-- ============================================================================
create table if not exists public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index if not exists favorites_user_idx on public.favorites (user_id, created_at desc);

alter table public.favorites enable row level security;
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites for select using (user_id = auth.uid());
drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites for insert with check (user_id = auth.uid());
drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites for delete using (user_id = auth.uid());

-- ============================================================================
-- reviews : 取引相手レビュー（完了したエスクロー取引に紐づく相互評価）
-- ============================================================================
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  escrow_id   uuid not null references public.escrow_transactions(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (escrow_id, reviewer_id)
);
create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);

alter table public.reviews enable row level security;

-- 誰でも閲覧可（プロフィールの信頼情報）
drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public" on public.reviews for select using (true);

-- 完了済み取引の当事者のみ、相手を評価できる
drop policy if exists "reviews_insert_party" on public.reviews;
create policy "reviews_insert_party" on public.reviews for insert with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from public.escrow_transactions e
    where e.id = escrow_id
      and e.status = 'completed'
      and (
        (e.buyer_id = auth.uid()  and e.seller_id = reviewee_id) or
        (e.seller_id = auth.uid() and e.buyer_id  = reviewee_id)
      )
  )
);

-- ============================================================================
-- increment_listing_view : 閲覧数を加算（RLSを跨ぐため SECURITY DEFINER）
-- ============================================================================
create or replace function public.increment_listing_view(p_listing_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.listings set view_count = view_count + 1 where id = p_listing_id;
$$;
grant execute on function public.increment_listing_view(uuid) to anon, authenticated;

-- ============================================================================
-- 未読管理 : conversations に各当事者の最終既読時刻を追加
-- ============================================================================
alter table public.conversations
  add column if not exists buyer_last_read_at  timestamptz not null default now(),
  add column if not exists seller_last_read_at timestamptz not null default now();

-- スレッドを既読にする（呼び出し本人の側の既読時刻を更新）
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set buyer_last_read_at  = case when buyer_id  = auth.uid() then now() else buyer_last_read_at  end,
         seller_last_read_at = case when seller_id = auth.uid() then now() else seller_last_read_at end
   where id = p_conversation_id
     and (buyer_id = auth.uid() or seller_id = auth.uid());
end $$;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ============================================================================
-- loan_applications : ローン仮審査申込（提携ローン会社へのリード）
-- ============================================================================
do $$ begin
  create type loan_app_status as enum ('submitted', 'reviewing', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.loan_applications (
  id             uuid primary key default gen_random_uuid(),
  applicant_id   uuid not null references public.profiles(id) on delete cascade,
  listing_id     uuid references public.listings(id) on delete set null,
  full_name      text not null,
  phone          text not null,
  email          text not null,
  birth_year     int,
  annual_income  int,                    -- 年収（万円）
  employment     text,                   -- 雇用形態
  vehicle_price  int  not null,          -- 車両価格
  down_payment   int  not null default 0,
  term_months    int  not null default 60,
  est_monthly    int,                    -- 申込時点の月々目安
  note           text,
  status         loan_app_status not null default 'submitted',
  created_at     timestamptz not null default now()
);
create index if not exists loan_applications_applicant_idx on public.loan_applications (applicant_id, created_at desc);

alter table public.loan_applications enable row level security;

drop policy if exists "loan_apps_select_own" on public.loan_applications;
create policy "loan_apps_select_own" on public.loan_applications for select using (applicant_id = auth.uid());
drop policy if exists "loan_apps_insert_own" on public.loan_applications;
create policy "loan_apps_insert_own" on public.loan_applications for insert with check (applicant_id = auth.uid());

-- ============================================================================
-- 運営（admin）: ロールと管理者用ポリシー
-- ============================================================================
do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

alter table public.profiles add column if not exists role user_role not null default 'user';

-- 管理者判定（RLSを跨ぐため SECURITY DEFINER。profilesを直接参照し再帰を回避）
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to authenticated;

-- 管理者は各テーブルを横断的に閲覧・更新可能（既存ポリシーに OR で追加される）
drop policy if exists "listings_admin_all" on public.listings;
create policy "listings_admin_all" on public.listings for all using (is_admin()) with check (is_admin());

drop policy if exists "escrow_admin_all" on public.escrow_transactions;
create policy "escrow_admin_all" on public.escrow_transactions for all using (is_admin()) with check (is_admin());

drop policy if exists "loan_apps_admin_all" on public.loan_applications;
create policy "loan_apps_admin_all" on public.loan_applications for all using (is_admin()) with check (is_admin());

drop policy if exists "reviews_admin_delete" on public.reviews;
create policy "reviews_admin_delete" on public.reviews for delete using (is_admin());

-- 管理者の付与（手動）:
--   update public.profiles set role = 'admin' where id = '<auth.uidのUUID>';

-- ============================================================================
-- reports : 通報（出品・ユーザー・レビュー）→ 運営が受理・対応
-- ============================================================================
do $$ begin
  create type report_target as enum ('listing', 'user', 'review');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  target_type  report_target not null,
  target_id    uuid not null,
  reason       text not null,
  detail       text,
  status       report_status not null default 'open',
  created_at   timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports for insert with check (reporter_id = auth.uid());
drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports for select using (reporter_id = auth.uid());
drop policy if exists "reports_admin_all" on public.reports;
create policy "reports_admin_all" on public.reports for all using (is_admin()) with check (is_admin());

-- ============================================================================
-- audit_logs : 管理操作の監査ログ
-- ============================================================================
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,        -- 例: listing.close / escrow.dispute / loan.approve
  target_type text,                 -- listing / escrow / loan / report
  target_id   uuid,
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_target_idx  on public.audit_logs (target_type, target_id);

alter table public.audit_logs enable row level security;

-- 管理者のみ閲覧。記録は本人(=管理者)としてのみ挿入可
drop policy if exists "audit_admin_select" on public.audit_logs;
create policy "audit_admin_select" on public.audit_logs for select using (is_admin());
drop policy if exists "audit_admin_insert" on public.audit_logs;
create policy "audit_admin_insert" on public.audit_logs for insert with check (is_admin() and actor_id = auth.uid());

-- ============================================================================
-- announcements : 運営からのお知らせ（バナー＋一覧）
-- ============================================================================
do $$ begin
  create type announcement_level as enum ('info', 'warning', 'important');
exception when duplicate_object then null; end $$;

create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  level       announcement_level not null default 'info',
  pinned      boolean not null default false,  -- 上部バナーに表示
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists announcements_pub_idx on public.announcements (published, created_at desc);

alter table public.announcements enable row level security;

-- 公開済みは誰でも閲覧、未公開は管理者のみ
drop policy if exists "announcements_select" on public.announcements;
create policy "announcements_select" on public.announcements for select using (published or is_admin());
-- 作成・更新・削除は管理者のみ
drop policy if exists "announcements_admin_all" on public.announcements;
create policy "announcements_admin_all" on public.announcements for all using (is_admin()) with check (is_admin());

-- ============================================================================
-- saved_searches : 保存した検索条件
-- ============================================================================
create table if not exists public.saved_searches (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  params          jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz not null default now(),  -- 新着判定の基準時刻
  created_at      timestamptz not null default now()
);
alter table public.saved_searches
  add column if not exists last_checked_at timestamptz not null default now();
create index if not exists saved_searches_user_idx on public.saved_searches (user_id, created_at desc);

alter table public.saved_searches enable row level security;

drop policy if exists "saved_searches_select_own" on public.saved_searches;
create policy "saved_searches_select_own" on public.saved_searches for select using (user_id = auth.uid());
drop policy if exists "saved_searches_insert_own" on public.saved_searches;
create policy "saved_searches_insert_own" on public.saved_searches for insert with check (user_id = auth.uid());
drop policy if exists "saved_searches_delete_own" on public.saved_searches;
create policy "saved_searches_delete_own" on public.saved_searches for delete using (user_id = auth.uid());
