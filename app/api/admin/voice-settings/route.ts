// AI電話の運用設定の取得・保存（管理者のみ）。
import { NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/admin';
import { getVoiceSettings, setVoiceSettings, type VoiceSettings } from '@/lib/voice-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdminUser())) return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  return NextResponse.json({ ok: true, settings: await getVoiceSettings() });
}

export async function POST(req: Request) {
  if (!(await isAdminUser())) return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Partial<VoiceSettings>;
  const saved = await setVoiceSettings(body);
  if (!saved.ok) return NextResponse.json({ ok: false, error: saved.error ?? '保存に失敗しました' }, { status: 500 });
  return NextResponse.json({ ok: true, settings: await getVoiceSettings() });
}
