-- ============================================================
-- BUYMO 充実機能マイグレーション
-- ① 代理販売フィールド
-- ② 買取保証申請テーブル
-- ============================================================

-- listings テーブルに代理販売フィールドを追加
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'direct'
    CHECK (listing_type IN ('direct', 'proxy')),
  ADD COLUMN IF NOT EXISTS fee_rate DECIMAL(4,2) NOT NULL DEFAULT 3.00,
  ADD COLUMN IF NOT EXISTS ai_price_min INTEGER,
  ADD COLUMN IF NOT EXISTS ai_price_max INTEGER;

-- 買取保証申請テーブル
CREATE TABLE IF NOT EXISTS buyback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 車両スナップショット
  maker TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  mileage_km INTEGER NOT NULL,

  -- 価格情報
  ai_price_min INTEGER NOT NULL,
  ai_price_max INTEGER NOT NULL,
  buyback_price INTEGER NOT NULL,   -- AI査定中央値の75%

  -- ステータス
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'completed')),
  rejection_reason TEXT,

  -- 審査者
  reviewer_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_buyback_seller ON buyback_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_buyback_status ON buyback_requests(status);
CREATE INDEX IF NOT EXISTS idx_buyback_listing ON buyback_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(listing_type);

-- RLS
ALTER TABLE buyback_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyback_select_own" ON buyback_requests
  FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "buyback_insert_own" ON buyback_requests
  FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "buyback_admin_all" ON buyback_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
