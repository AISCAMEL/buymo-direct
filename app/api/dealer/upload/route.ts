import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// 加盟店プロフィール用の画像アップロード（加盟店オーナーのみ）。
export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

function looksLikeImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;               // JPEG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true; // PNG
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true;
  if (buf.toString('ascii', 4, 8) === 'ftyp') return true;                             // HEIC/HEIF
  return false;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

  // 自社の加盟店を特定（オーナーのみ）
  const { data: dealer } = await supabase.from('dealers').select('id').eq('owner_id', user.id).maybeSingle();
  const dealerId = (dealer as { id: string } | null)?.id;
  if (!dealerId) return NextResponse.json({ error: '加盟店オーナーのみアップロードできます' }, { status: 403 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'ファイルを確認してください' }, { status: 400 }); }

  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: '画像ファイルを選択してください' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: '画像サイズは8MBまでです' }, { status: 400 });

  let ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg';
  if (!ALLOWED_EXT.has(ext)) ext = 'jpg';
  const path = `dealers/${dealerId}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

  try {
    const service = createServiceClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!looksLikeImage(buffer)) return NextResponse.json({ error: '有効な画像ファイルではありません' }, { status: 400 });
    const { error } = await service.storage.from('listing-images').upload(path, buffer, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (error) return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 });
    const { data: pub } = service.storage.from('listing-images').getPublicUrl(path);
    return NextResponse.json({ url: pub.publicUrl });
  } catch {
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 });
  }
}
