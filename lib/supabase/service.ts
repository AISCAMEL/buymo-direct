import { createClient } from '@supabase/supabase-js';

/**
 * サービスロールクライアント（RLS をバイパス）。
 * アラートチェックなど、サーバーサイドのバッチ処理専用。
 * クライアントサイドでは絶対に使用しないこと。
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY が設定されていません');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
