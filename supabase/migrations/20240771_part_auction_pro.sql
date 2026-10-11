-- パーツオークション v2（ヤフオク超え）:
--  ・代理入札（自動入札 / proxy bidding）: 入力額を「上限」として最小額で自動的にリード
--  ・自動延長（スナイプ対策）: 終了10分前の入札で終了を+10分
--  ・最低落札価格（reserve）: 達しなければ落札扱いにしない
--  ・適合車種（fitment）, ウォッチ, 商品Q&A

-- ---- 列の追加 --------------------------------------------------------------
alter table public.part_auctions add column if not exists reserve_price int;
alter table public.part_auctions add column if not exists extend_count  int not null default 0;
alter table public.part_auctions add column if not exists fit_maker     text;
alter table public.part_auctions add column if not exists fit_model     text;
alter table public.part_auctions add column if not exists fit_year_from int;
alter table public.part_auctions add column if not exists fit_year_to   int;
create index if not exists part_auctions_fit_idx on public.part_auctions (fit_maker, fit_model);

-- ---- 代理入札（自動入札）の上限額。1オークション×1ユーザーに1行 ----------
create table if not exists public.part_auto_bids (
  auction_id uuid not null references public.part_auctions(id) on delete cascade,
  bidder_id  uuid not null references public.profiles(id) on delete cascade,
  max_amount int  not null,
  updated_at timestamptz not null default now(),
  primary key (auction_id, bidder_id)
);
alter table public.part_auto_bids enable row level security;
drop policy if exists "part_auto_bids_select_own" on public.part_auto_bids;
create policy "part_auto_bids_select_own" on public.part_auto_bids for select using (bidder_id = auth.uid());

-- ---- ウォッチリスト --------------------------------------------------------
create table if not exists public.part_watches (
  auction_id uuid not null references public.part_auctions(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (auction_id, user_id)
);
create index if not exists part_watches_user_idx on public.part_watches (user_id, created_at desc);
alter table public.part_watches enable row level security;
drop policy if exists "part_watches_select_own" on public.part_watches;
create policy "part_watches_select_own" on public.part_watches for select using (user_id = auth.uid());
drop policy if exists "part_watches_insert_own" on public.part_watches;
create policy "part_watches_insert_own" on public.part_watches for insert with check (user_id = auth.uid());
drop policy if exists "part_watches_delete_own" on public.part_watches;
create policy "part_watches_delete_own" on public.part_watches for delete using (user_id = auth.uid());

-- ---- 商品Q&A ---------------------------------------------------------------
create table if not exists public.part_questions (
  id          uuid primary key default gen_random_uuid(),
  auction_id  uuid not null references public.part_auctions(id) on delete cascade,
  asker_id    uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  answer      text,
  answered_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists part_questions_auction_idx on public.part_questions (auction_id, created_at desc);
alter table public.part_questions enable row level security;
drop policy if exists "part_questions_select_all" on public.part_questions;
create policy "part_questions_select_all" on public.part_questions for select using (true);
drop policy if exists "part_questions_insert_own" on public.part_questions;
create policy "part_questions_insert_own" on public.part_questions for insert with check (asker_id = auth.uid());
-- 回答は出品者のみ（該当オークションの seller_id = auth.uid()）
drop policy if exists "part_questions_update_seller" on public.part_questions;
create policy "part_questions_update_seller" on public.part_questions for update using (
  exists (select 1 from public.part_auctions a where a.id = auction_id and a.seller_id = auth.uid())
);

-- ---- 代理入札つき place_part_bid の再定義 ---------------------------------
drop function if exists public.place_part_bid(uuid, int);
drop function if exists public.place_part_bid(uuid, int, int);

create or replace function public.place_part_bid(p_auction_id uuid, p_amount int, p_max int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  a public.part_auctions%rowtype;
  v_min int;
  v_my_max int;
  v_leader uuid;
  v_leader_max int;
  v_second uuid;
  v_second_max int;
  v_price int;
  v_prev_leader uuid;
  v_reached_buy_now boolean := false;
  v_extended boolean := false;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'login'); end if;
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', '入札額を入力してください。');
  end if;

  select * into a from public.part_auctions where id = p_auction_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'この出品が見つかりません。'); end if;
  if a.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'この出品はすでに終了しています。'); end if;
  if a.ends_at <= now() then return jsonb_build_object('ok', false, 'error', '出品期間が終了しました。'); end if;
  if a.seller_id = v_uid then return jsonb_build_object('ok', false, 'error', '自分の出品には入札できません。'); end if;

  -- 上限額（代理入札）。未指定なら入札額そのもの
  v_my_max := greatest(p_amount, coalesce(p_max, p_amount));

  -- 最低入札額の検証
  if a.bid_count <= 0 then v_min := greatest(0, a.start_price);
  else v_min := a.current_price + public.part_bid_increment(a.current_price); end if;
  if v_my_max < v_min then
    return jsonb_build_object('ok', false, 'error', '最低入札額は ' || v_min || ' 円です。');
  end if;

  v_prev_leader := a.highest_bidder_id;

  -- 自分の上限を登録（既存より高い場合のみ更新）
  insert into public.part_auto_bids (auction_id, bidder_id, max_amount, updated_at)
  values (p_auction_id, v_uid, v_my_max, now())
  on conflict (auction_id, bidder_id)
  do update set max_amount = greatest(public.part_auto_bids.max_amount, excluded.max_amount), updated_at = now();

  -- 上限トップ（リーダー）と2位を決定（同額は先に到達した方が上位）
  select bidder_id, max_amount into v_leader, v_leader_max
  from public.part_auto_bids where auction_id = p_auction_id
  order by max_amount desc, updated_at asc limit 1;

  select bidder_id, max_amount into v_second, v_second_max
  from public.part_auto_bids where auction_id = p_auction_id and bidder_id <> v_leader
  order by max_amount desc, updated_at asc limit 1;

  -- 新しい現在価格を算出
  if v_second is null then
    v_price := greatest(a.start_price, a.current_price, p_amount);
    if v_leader <> v_uid then v_price := greatest(v_price, v_min); end if;
  else
    v_price := least(v_leader_max, v_second_max + public.part_bid_increment(v_second_max));
  end if;
  v_price := greatest(v_price, a.current_price, a.start_price);

  -- 即決価格に到達したら落札確定
  if a.buy_now_price is not null and v_price >= a.buy_now_price then
    v_price := a.buy_now_price;
    v_reached_buy_now := true;
  end if;

  -- 入札履歴を記録（リーダーの現在価格）
  insert into public.part_bids (auction_id, bidder_id, amount)
  values (p_auction_id, v_leader, v_price);

  -- 自動延長（スナイプ対策）: 終了10分前の入札なら +10分
  if not v_reached_buy_now and a.ends_at - now() < interval '10 minutes' then
    update public.part_auctions set ends_at = now() + interval '10 minutes', extend_count = extend_count + 1
      where id = p_auction_id;
    v_extended := true;
  end if;

  update public.part_auctions
     set current_price     = v_price,
         bid_count         = a.bid_count + 1,
         highest_bidder_id = v_leader,
         status            = case when v_reached_buy_now then 'sold' else status end,
         winner_id         = case when v_reached_buy_now then v_leader else winner_id end,
         closed_at         = case when v_reached_buy_now then now() else closed_at end,
         updated_at        = now()
   where id = p_auction_id;

  return jsonb_build_object(
    'ok', true,
    'new_price', v_price,
    'leader_id', v_leader,
    'you_lead', (v_leader = v_uid),
    'prev_leader', v_prev_leader,
    'reached_buy_now', v_reached_buy_now,
    'extended', v_extended,
    'reserve_met', (a.reserve_price is null or v_price >= a.reserve_price),
    'seller_id', a.seller_id,
    'title', a.title
  );
end;
$$;

grant execute on function public.place_part_bid(uuid, int, int) to authenticated;

-- ---- 終了処理に reserve を反映（遅延クローズ/cron から呼ぶ） ----------------
create or replace function public.close_part_auction(p_auction_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a public.part_auctions%rowtype;
  v_sold boolean;
begin
  select * into a from public.part_auctions where id = p_auction_id for update;
  if not found then return jsonb_build_object('ok', false); end if;
  if a.status <> 'active' then return jsonb_build_object('ok', true, 'noop', true); end if;
  if a.ends_at > now() then return jsonb_build_object('ok', true, 'noop', true); end if;

  -- 入札があり、かつ最低落札価格（あれば）に達していれば落札
  v_sold := a.bid_count > 0 and a.highest_bidder_id is not null
            and (a.reserve_price is null or a.current_price >= a.reserve_price);

  update public.part_auctions
     set status     = case when v_sold then 'sold' else 'ended' end,
         winner_id  = case when v_sold then a.highest_bidder_id else null end,
         closed_at  = now(),
         updated_at = now()
   where id = p_auction_id and status = 'active';

  return jsonb_build_object('ok', true, 'sold', v_sold,
                            'winner_id', case when v_sold then a.highest_bidder_id else null end,
                            'seller_id', a.seller_id, 'title', a.title,
                            'price', a.current_price,
                            'reserve_missed', (a.bid_count > 0 and a.reserve_price is not null and a.current_price < a.reserve_price));
end;
$$;

grant execute on function public.close_part_auction(uuid) to authenticated, anon;

-- ---- リアルタイム更新（現在価格・入札・終了時刻）のため publication に追加 ----
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.part_auctions'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.part_bids';     exception when others then null; end;
end $$;
