-- 異業種スキルの追加（販売店以外：板金・整備・コーティング・電装 等）
insert into public.skills (key, name, category, sort) values
  ('wrapping','ラッピング・フィルム','美装',22),
  ('roadservice','ロードサービス','物流・手続き',55)
on conflict (key) do nothing;
