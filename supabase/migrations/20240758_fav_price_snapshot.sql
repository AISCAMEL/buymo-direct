-- お気に入り登録時点の価格スナップショット（値下げハイライト用）

alter table public.favorites add column if not exists price_at_save bigint;

-- 既存のお気に入りは現在の掲載価格で初期化（過去分の値下げは誤検知しないため）
update public.favorites f
set price_at_save = l.price
from public.listings l
where f.listing_id = l.id
  and f.price_at_save is null;

-- 以後の挿入では、お気に入り時点の掲載価格を自動記録
create or replace function public.set_favorite_price_at_save()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.price_at_save is null then
    select price into new.price_at_save
    from public.listings
    where id = new.listing_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_favorite_price_at_save on public.favorites;
create trigger trg_set_favorite_price_at_save
  before insert on public.favorites
  for each row
  execute function public.set_favorite_price_at_save();
