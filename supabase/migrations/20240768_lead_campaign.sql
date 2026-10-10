-- 無料登録（スキル/プロ）の加盟店リードに対する「買取ビジネスのオファー」ローンチ管理。
-- 登録1か月後〜1年にかけて段階的にオファーを送り、買取加盟したら自動停止する。

alter table public.dealer_leads
  add column if not exists campaign_status text not null default 'active'; -- active|stopped|converted|done
alter table public.dealer_leads
  add column if not exists offers_sent    int  not null default 0;          -- 送信済みオファー数
alter table public.dealer_leads
  add column if not exists last_offer_at  timestamptz;                       -- 直近オファー送信日時
