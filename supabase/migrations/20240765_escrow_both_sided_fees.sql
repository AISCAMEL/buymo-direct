-- C2C エスクローを「売り手・買い手の両側課金」に変更し、すべての手数料を取引行に記録して履歴化する。
-- あわせて買取保証（売れなければ本部が買取）に、遠方の陸送費控除を記録する列を追加する。
-- すべて追記のみ（既存データ・ポリシーには影響しない）。

-- ── エスクロー取引：売り手手数料（受取額から控除）とローン手数料を追加 ──
alter table public.escrow_transactions
  add column if not exists seller_fee int not null default 0;   -- 売り手負担のエスクロー手数料（受取額から控除）
alter table public.escrow_transactions
  add column if not exists loan_fee  int not null default 0;     -- 買い手がローンを使った場合のローン手数料

-- ── 買取保証：遠方の陸送費控除と発送元・最終支払額を記録 ──
alter table public.buyback_requests
  add column if not exists from_pref     text;                   -- 発送元（売り手）の都道府県＝陸送費の算出元
alter table public.buyback_requests
  add column if not exists transport_fee integer not null default 0;  -- 遠方の場合に控除する陸送費（0＝控除なし）
alter table public.buyback_requests
  add column if not exists payout_amount integer;                -- 実支払額＝保証額 − 陸送費（未確定なら NULL）
