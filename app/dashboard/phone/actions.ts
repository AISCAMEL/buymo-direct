'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export async function sendPhoneOtp(
  phone: string
): Promise<{ error: string | null; demoOtp?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '未ログインです' };

  const normalised = phone.replace(/[\s\-()]/g, '');
  if (!/^(\+81|0)\d{9,10}$/.test(normalised)) {
    return { error: '電話番号の形式が正しくありません（例: 090-1234-5678）' };
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otp_hash = hashOtp(otp);
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await supabase.from('phone_otp').upsert({
    user_id: user.id,
    phone: normalised,
    otp_hash,
    expires_at,
  });
  if (error) return { error: error.message };

  // TODO: send SMS via Twilio/Vonage/etc — send `otp` to `normalised`
  // For demo: return otp in response
  return { error: null, demoOtp: otp };
}

export async function verifyPhoneOtp(
  phone: string,
  code: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '未ログインです' };

  const normalised = phone.replace(/[\s\-()]/g, '');

  const { data: row } = await supabase
    .from('phone_otp')
    .select('otp_hash, phone, expires_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row) return { error: '認証コードが見つかりません。再送してください。' };
  if (row.phone !== normalised) return { error: '電話番号が一致しません。' };
  if (new Date(row.expires_at) < new Date()) return { error: '認証コードの有効期限が切れました。再送してください。' };
  if (row.otp_hash !== hashOtp(code.trim())) return { error: '認証コードが正しくありません。' };

  const { error } = await supabase
    .from('profiles')
    .update({ phone: normalised, phone_verified_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) return { error: error.message };

  await supabase.from('phone_otp').delete().eq('user_id', user.id);
  revalidatePath('/dashboard/phone');
  return { error: null };
}
