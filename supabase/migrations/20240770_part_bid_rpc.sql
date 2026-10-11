-- 入札・即決を SECURITY DEFINER 関数に集約する。
-- これまで入札時の part_auctions 更新はサービスロール鍵（SUPABASE_SERVICE_ROLE_KEY）に
-- 依存していたため、鍵が未設定の環境では入札が一切できなかった。
-- 本関数はログインユーザー自身のセッション（auth.uid()）で呼び出され、
-- 行ロックで原子的に検証・記録・更新するため、サービスロール鍵に依存しない。

-- ヤフオク準拠の入札単位（lib/part-auction.ts と一致させること）。
create or replace function public.part_bid_increment(cur int)
returns int
language sql
immutable
as $$
  select case
    when cur < 1000   then 10
    when cur < 5000   then 100
    when cur < 10000  then 250
    when cur < 50000  then 500
    when cur < 100000 then 1000
    else 5000
  end;
$$;

-- 入札する。戻り値 jsonb: { ok, error?, reached_buy_now?, prev_highest?, seller_id?, title?, amount? }
create or replace function public.place_part_bid(p_auction_id uuid, p_amount int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  a public.part_auctions%rowtype;
  v_min int;
  v_reached_buy_now boolean := false;
  v_prev uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'login');
  end if;
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', '入札額を入力してください。');
  end if;

  select * into a from public.part_auctions where id = p_auction_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'この出品が見つかりません。');
  end if;
  if a.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'この出品はすでに終了しています。');
  end if;
  if a.ends_at <= now() then
    return jsonb_build_object('ok', false, 'error', '出品期間が終了しました。');
  end if;
  if a.seller_id = v_uid then
    return jsonb_build_object('ok', false, 'error', '自分の出品には入札できません。');
  end if;

  if a.bid_count <= 0 then
    v_min := greatest(0, a.start_price);
  else
    v_min := a.current_price + public.part_bid_increment(a.current_price);
  end if;
  if p_amount < v_min then
    return jsonb_build_object('ok', false, 'error', '最低入札額は ' || v_min || ' 円です。');
  end if;

  v_prev := a.highest_bidder_id;
  v_reached_buy_now := a.buy_now_price is not null and p_amount >= a.buy_now_price;

  insert into public.part_bids (auction_id, bidder_id, amount)
  values (p_auction_id, v_uid, p_amount);

  update public.part_auctions
     set current_price     = p_amount,
         bid_count         = a.bid_count + 1,
         highest_bidder_id = v_uid,
         status            = case when v_reached_buy_now then 'sold' else status end,
         winner_id         = case when v_reached_buy_now then v_uid else winner_id end,
         closed_at         = case when v_reached_buy_now then now() else closed_at end,
         updated_at        = now()
   where id = p_auction_id;

  return jsonb_build_object(
    'ok', true,
    'reached_buy_now', v_reached_buy_now,
    'prev_highest', v_prev,
    'seller_id', a.seller_id,
    'title', a.title,
    'amount', p_amount
  );
end;
$$;

-- 即決購入する。戻り値 jsonb: { ok, error?, seller_id?, title?, amount? }
create or replace function public.buy_now_part(p_auction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  a public.part_auctions%rowtype;
  v_price int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'login');
  end if;

  select * into a from public.part_auctions where id = p_auction_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'この出品が見つかりません。');
  end if;
  if a.buy_now_price is null then
    return jsonb_build_object('ok', false, 'error', '即決価格が設定されていません。');
  end if;
  if a.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'この出品はすでに終了しています。');
  end if;
  if a.ends_at <= now() then
    return jsonb_build_object('ok', false, 'error', '出品期間が終了しました。');
  end if;
  if a.seller_id = v_uid then
    return jsonb_build_object('ok', false, 'error', '自分の出品は購入できません。');
  end if;

  v_price := a.buy_now_price;

  insert into public.part_bids (auction_id, bidder_id, amount)
  values (p_auction_id, v_uid, v_price);

  update public.part_auctions
     set current_price     = v_price,
         bid_count         = a.bid_count + 1,
         highest_bidder_id = v_uid,
         status            = 'sold',
         winner_id         = v_uid,
         closed_at         = now(),
         updated_at        = now()
   where id = p_auction_id;

  return jsonb_build_object(
    'ok', true,
    'seller_id', a.seller_id,
    'title', a.title,
    'amount', v_price
  );
end;
$$;

grant execute on function public.part_bid_increment(int)            to authenticated, anon;
grant execute on function public.place_part_bid(uuid, int)          to authenticated;
grant execute on function public.buy_now_part(uuid)                 to authenticated;
