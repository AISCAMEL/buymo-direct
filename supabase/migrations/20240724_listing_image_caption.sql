-- 出品写真の角度ラベル（フロント/リア/室内など）を保存
alter table public.listing_images add column if not exists caption text;
