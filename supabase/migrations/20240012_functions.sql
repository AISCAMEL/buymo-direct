-- ============================================================================
-- BUYMO C2C — 便利なデータベース関数
-- Migration: 20240012_functions.sql
--
-- 管理画面・ダッシュボード・検索機能で使用するユーティリティ関数を定義します。
-- ============================================================================

-- pg_trgm 拡張（全文検索・あいまい検索に必要）
create extension if not exists pg_trgm;

-- unaccent 拡張（アクセント記号を無視した検索）
create extension if not exists unaccent;

-- ---------------------------------------------------------------------------
-- get_listing_stats() — プラットフォーム全体の出品統計
--
-- 返却値:
--   total_listings  : 全出品数（drafts除く）
--   active_listings : アクティブ中の出品数
--   total_gmv       : 成約済み総取引額（円）
--   avg_price       : アクティブ出品の平均価格（円）
-- ---------------------------------------------------------------------------
create or replace function public.get_listing_stats()
returns table (
  total_listings  bigint,
  active_listings bigint,
  total_gmv       bigint,
  avg_price       bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)                                                                     as total_listings,
    count(*) filter (where l.status = 'active')                                    as active_listings,
    coalesce(sum(et.amount) filter (where et.status = 'completed'), 0)::bigint   as total_gmv,
    coalesce(avg(price) filter (where l.status = 'active'), 0)::bigint           as avg_price
  from public.listings l
  left join public.escrow_transactions et on et.listing_id = l.id
  where l.status <> 'draft';
$$;

-- 認証ユーザーと管理者のみ統計を閲覧可能
grant execute on function public.get_listing_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- get_user_rank(user_id uuid) — ポイントに基づくランク文字列を返す
--
-- ランク基準:
--   platinum  : 5,000pt 以上
--   gold      : 2,000pt 以上
--   silver    : 500pt 以上
--   bronze    : それ以下（デフォルト）
-- ---------------------------------------------------------------------------
create or replace function public.get_user_rank(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when coalesce(points, 0) >= 5000 then 'platinum'
      when coalesce(points, 0) >= 2000 then 'gold'
      when coalesce(points, 0) >= 500  then 'silver'
      else                                  'bronze'
    end
  from public.user_points
  where user_id = p_user_id;
$$;

-- 自分または管理者のみ参照可能
grant execute on function public.get_user_rank(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- sync_user_rank(user_id uuid) — ポイント変動後にランクを同期する
--
-- point_transactions 変更時にトリガから呼び出すか、
-- ポイント付与後に手動で呼び出す。
-- ---------------------------------------------------------------------------
create or replace function public.sync_user_rank(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rank text;
begin
  v_rank := public.get_user_rank(p_user_id);

  -- user_points が存在しなければ初期レコードを作成
  insert into public.user_points (user_id, points, rank)
  values (p_user_id, 0, 'bronze')
  on conflict (user_id) do nothing;

  update public.user_points
     set rank = v_rank, updated_at = now()
   where user_id = p_user_id;
end;
$$;

grant execute on function public.sync_user_rank(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- add_user_points(user_id, amount, reason, ref_id) — ポイント付与ヘルパー
--
-- point_transactions にレコードを挿入し、user_points を自動同期します。
-- amount が負の場合はポイント消費（0 を下回ることはありません）。
-- ---------------------------------------------------------------------------
create or replace function public.add_user_points(
  p_user_id uuid,
  p_amount  integer,
  p_reason  text,
  p_ref_id  uuid default null
)
returns integer  -- 変更後のポイント残高
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_points integer;
  v_new_points     integer;
begin
  -- user_points レコードが存在しなければ作成
  insert into public.user_points (user_id, points, rank)
  values (p_user_id, 0, 'bronze')
  on conflict (user_id) do nothing;

  -- 現在のポイントを取得（行ロック）
  select points into v_current_points
  from public.user_points
  where user_id = p_user_id
  for update;

  -- 消費の場合、残高が不足していればエラー
  if p_amount < 0 and (v_current_points + p_amount) < 0 then
    raise exception 'ポイント残高不足: 現在 % pt、使用しようとしたポイント: % pt',
      v_current_points, abs(p_amount);
  end if;

  v_new_points := greatest(v_current_points + p_amount, 0);

  -- point_transactions に記録
  insert into public.point_transactions (user_id, amount, reason, ref_id)
  values (p_user_id, p_amount, p_reason, p_ref_id);

  -- user_points を更新してランクを同期
  update public.user_points
     set points     = v_new_points,
         rank       = case
                        when v_new_points >= 5000 then 'platinum'
                        when v_new_points >= 2000 then 'gold'
                        when v_new_points >= 500  then 'silver'
                        else                           'bronze'
                      end,
         updated_at = now()
   where user_id = p_user_id;

  return v_new_points;
end;
$$;

grant execute on function public.add_user_points(uuid, integer, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- search_listings(query text, max_results int) — 全文検索（pg_trgm）
--
-- title / maker / model / description を対象にあいまい検索を行います。
-- 類似度スコア順に最大 max_results 件を返します。
--
-- 使用例:
--   select * from public.search_listings('プリウス ハイブリッド', 20);
--   select * from public.search_listings('アルファード 禁煙', 10);
-- ---------------------------------------------------------------------------
create or replace function public.search_listings(
  p_query      text,
  p_max_results integer default 20
)
returns table (
  id            uuid,
  title         text,
  maker         text,
  model         text,
  year          int,
  price         int,
  prefecture    text,
  status        listing_status,
  view_count    int,
  similarity    real,
  created_at    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.title,
    l.maker,
    l.model,
    l.year,
    l.price,
    l.prefecture,
    l.status,
    l.view_count,
    greatest(
      similarity(l.title,       p_query),
      similarity(l.maker,       p_query),
      similarity(l.model,       p_query),
      similarity(coalesce(l.description, ''), p_query)
    )                                                         as similarity,
    l.created_at
  from public.listings l
  where
    l.status = 'active'
    and (
         l.title       % p_query
      or l.maker       % p_query
      or l.model       % p_query
      or l.description % p_query
      or l.title       ilike '%' || p_query || '%'
      or l.maker       ilike '%' || p_query || '%'
      or l.model       ilike '%' || p_query || '%'
    )
  order by similarity desc, l.view_count desc, l.created_at desc
  limit p_max_results;
$$;

-- 未認証ユーザー（anon）でも検索可能
grant execute on function public.search_listings(text, integer) to anon, authenticated;

-- search_listings 高速化のための GIN インデックス
create index if not exists listings_title_trgm_idx
  on public.listings using gin (title gin_trgm_ops);

create index if not exists listings_maker_trgm_idx
  on public.listings using gin (maker gin_trgm_ops);

create index if not exists listings_model_trgm_idx
  on public.listings using gin (model gin_trgm_ops);

create index if not exists listings_description_trgm_idx
  on public.listings using gin (description gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- get_conversation_unread_count(conversation_id, user_id) — 未読数を返す
-- ---------------------------------------------------------------------------
create or replace function public.get_conversation_unread_count(
  p_conversation_id uuid,
  p_user_id         uuid
)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where
    m.conversation_id = p_conversation_id
    and m.sender_id   <> p_user_id
    and m.created_at  > case
      when c.buyer_id  = p_user_id then c.buyer_last_read_at
      when c.seller_id = p_user_id then c.seller_last_read_at
      else now()
    end;
$$;

grant execute on function public.get_conversation_unread_count(uuid, uuid) to authenticated;
