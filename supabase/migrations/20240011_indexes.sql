-- ============================================================================
-- BUYMO C2C — パフォーマンス最適化インデックス
-- Migration: 20240011_indexes.sql
--
-- 検索・フィルタリング・ソートが頻繁に行われるカラムに複合インデックスを追加します。
-- すでに schema.sql に単一カラムインデックスが存在する場合は、それを補完する
-- 複合インデックス・追加インデックスのみ定義しています。
-- ============================================================================

-- ---------------------------------------------------------------------------
-- listings — 検索・一覧表示の高速化
-- ---------------------------------------------------------------------------

-- ステータス絞り込み + 新着順ソート（一覧ページ最頻クエリ）
create index if not exists listings_status_created_idx
  on public.listings (status, created_at desc);

-- メーカー＋モデル複合検索（車種絞り込み）
create index if not exists listings_maker_model_idx
  on public.listings (maker, model);

-- 都道府県絞り込み
create index if not exists listings_prefecture_idx
  on public.listings (prefecture);

-- 価格範囲検索（BETWEEN クエリの最適化）
create index if not exists listings_price_range_idx
  on public.listings (price);

-- ブースト中の出品を優先表示するためのインデックス
create index if not exists listings_boosted_until_idx
  on public.listings (boosted_until desc nulls last)
  where boosted_until is not null;

-- 出品期限（expires_at）管理 — バッチ処理で期限切れ出品を閉じる際に使用
create index if not exists listings_expires_at_idx
  on public.listings (expires_at)
  where expires_at is not null and status = 'active';

-- ---------------------------------------------------------------------------
-- escrow_transactions — 取引管理画面・通知処理の高速化
-- ---------------------------------------------------------------------------

-- 買主ダッシュボード（自分の取引一覧）
create index if not exists escrow_buyer_created_idx
  on public.escrow_transactions (buyer_id, created_at desc);

-- 売主ダッシュボード（自分の取引一覧）
create index if not exists escrow_seller_created_idx
  on public.escrow_transactions (seller_id, created_at desc);

-- 管理者ステータス別集計・フィルタリング
create index if not exists escrow_status_created_idx
  on public.escrow_transactions (status, created_at desc);

-- ---------------------------------------------------------------------------
-- messages — チャット画面の高速化
-- ---------------------------------------------------------------------------

-- スレッド内メッセージ取得（conversation_id + 時系列順）
-- ※ schema.sql に同名インデックスが既に存在するため IF NOT EXISTS でスキップ
create index if not exists messages_conversation_time_idx
  on public.messages (conversation_id, created_at asc);

-- ---------------------------------------------------------------------------
-- point_transactions — ポイント履歴一覧の高速化
-- ---------------------------------------------------------------------------

-- ユーザーのポイント取引履歴（新着順）
create index if not exists point_transactions_user_created_idx
  on public.point_transactions (user_id, created_at desc);

-- 特定の reason でのポイント集計
create index if not exists point_transactions_reason_idx
  on public.point_transactions (reason, created_at desc);

-- ---------------------------------------------------------------------------
-- favorites — お気に入り数カウント最適化
-- ---------------------------------------------------------------------------

-- 特定出品のお気に入り数を数える（出品詳細ページ）
create index if not exists favorites_listing_idx
  on public.favorites (listing_id);

-- ---------------------------------------------------------------------------
-- reviews — 評価集計の高速化
-- ---------------------------------------------------------------------------

-- 特定ユーザーへのレビュー集計（平均評価計算）
create index if not exists reviews_reviewee_rating_idx
  on public.reviews (reviewee_id, rating);

-- ---------------------------------------------------------------------------
-- offers — オファー管理の高速化
-- ---------------------------------------------------------------------------

-- 出品に対する有効なオファー一覧（売主用）
create index if not exists offers_listing_status_idx
  on public.offers (listing_id, status);

-- ---------------------------------------------------------------------------
-- audit_logs — 管理画面ログ検索の高速化
-- ---------------------------------------------------------------------------

-- アクターIDでの絞り込み（管理者ごとの操作履歴）
create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor_id, created_at desc);
