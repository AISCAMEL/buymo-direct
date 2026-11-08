// 画像生成スタイルの設定（取得/保存）。管理者のみ。
import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/admin';
import {
  getImageStyle,
  getImageRef,
  setAppSetting,
  DEFAULT_IMAGE_STYLE,
  SETTING_IMAGE_STYLE,
  SETTING_IMAGE_REF,
} from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdminUser())) return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  const [style, ref] = await Promise.all([getImageStyle(), getImageRef()]);
  return NextResponse.json({ style, ref: ref ?? '', defaultStyle: DEFAULT_IMAGE_STYLE });
}

export async function POST(req: Request) {
  if (!(await isAdminUser())) return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { style?: string; ref?: string };

  const results: { ok: boolean; error?: string }[] = [];
  if (typeof body.style === 'string') {
    results.push(await setAppSetting(SETTING_IMAGE_STYLE, body.style.trim()));
  }
  if (typeof body.ref === 'string') {
    results.push(await setAppSetting(SETTING_IMAGE_REF, body.ref.trim()));
  }
  const failed = results.find((r) => !r.ok);
  if (failed) return NextResponse.json({ ok: false, error: failed.error }, { status: 200 });

  const [style, ref] = await Promise.all([getImageStyle(), getImageRef()]);
  return NextResponse.json({ ok: true, style, ref: ref ?? '' });
}
