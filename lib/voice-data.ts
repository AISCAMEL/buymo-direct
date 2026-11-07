import { createServiceClient } from '@/lib/supabase/service';
import type { ChatTurn } from '@/lib/ai';

/** 通話中の会話履歴を取得（古い順）。テーブル未作成でも [] を返す（graceful）。 */
export async function loadVoiceTurns(callSid: string, limit = 20): Promise<ChatTurn[]> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from('voice_turns')
      .select('role, text')
      .eq('call_sid', callSid)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error || !data) return [];
    return (data as { role: string; text: string }[]).map((r) => ({
      role: r.role === 'assistant' ? 'assistant' : 'user',
      content: r.text,
    }));
  } catch {
    return [];
  }
}

/** 発話を1件保存（ベストエフォート）。 */
export async function saveVoiceTurn(callSid: string, role: 'user' | 'assistant', text: string): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from('voice_turns').insert({ call_sid: callSid, role, text: text.slice(0, 2000) });
  } catch {
    /* 保存失敗は無視（会話は続行） */
  }
}

/** 通話を記録（初回のみ・ベストエフォート）。 */
export async function recordVoiceCall(callSid: string, info: { direction?: string; from?: string; to?: string }): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from('voice_calls').upsert(
      { call_sid: callSid, direction: info.direction ?? 'inbound', from_number: info.from ?? null, to_number: info.to ?? null },
      { onConflict: 'call_sid', ignoreDuplicates: true },
    );
  } catch {
    /* 無視 */
  }
}
