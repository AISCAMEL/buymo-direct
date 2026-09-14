-- チャット内画像送信
alter table public.messages
  add column if not exists attachment_url text;

-- chat-images ストレージバケット（公開）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('chat-images', 'chat-images', true, 5242880,
          array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'])
  on conflict (id) do nothing;

-- 認証ユーザーはアップロード可、パブリック読み取り可
create policy "Chat image upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-images');

create policy "Chat image read"
  on storage.objects for select
  using (bucket_id = 'chat-images');
