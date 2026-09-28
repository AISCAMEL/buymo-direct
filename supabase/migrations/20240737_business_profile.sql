-- ============================================================
-- 事業者区分・許認可・インボイス・振込先（加盟店＝法人/個人事業主）
-- 個人売買(C2C)と事業者販売(B2C)を明確に区別し、帳票へ反映するための土台。
-- 税務判断はシステムで行わず、登録情報に基づいて表示・帳票化する。
-- ============================================================

alter table public.dealers add column if not exists business_type      text not null default 'corporation'; -- corporation(法人) | sole_proprietor(個人事業主)
alter table public.dealers add column if not exists corporate_number   text;   -- 法人番号(13桁)
alter table public.dealers add column if not exists trade_name         text;   -- 屋号（個人事業主）
alter table public.dealers add column if not exists representative      text;   -- 代表者
alter table public.dealers add column if not exists antique_license_no  text;   -- 古物商許可番号
alter table public.dealers add column if not exists tax_status          text not null default 'taxable'; -- taxable(課税) | exempt(免税)
alter table public.dealers add column if not exists invoice_registered  boolean not null default false;  -- インボイス登録有無
alter table public.dealers add column if not exists invoice_number      text;   -- 適格請求書発行事業者 登録番号(T+13桁)
alter table public.dealers add column if not exists bank_info           text;   -- 振込先（自由記述）
