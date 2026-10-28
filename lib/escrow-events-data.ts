// エスクロー進捗イベントの読み込み（サーバー専用・サービスロール）。
// テーブル未作成でも落ちないよう、失敗時は空配列を返す。
import { createServiceClient } from '@/lib/supabase/service';

export type EscrowEventRow = {
  id: string;
  type: string;
  actor_role: string;
  title: string;
  body: string | null;
  meta: { etaDays?: number } | null;
  created_at: string;
  created_by: string | null;
};

export async function loadEscrowEvents(escrowId: string): Promise<EscrowEventRow[]> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from('escrow_events')
      .select('id, type, actor_role, title, body, meta, created_at, created_by')
      .eq('escrow_id', escrowId)
      .order('created_at', { ascending: true });
    if (error) return [];
    return (data ?? []) as EscrowEventRow[];
  } catch {
    return [];
  }
}

/** 複数取引分のイベントを1クエリで取得し、escrow_id ごとにまとめる（管理画面一覧用）。 */
export async function loadEscrowEventsBulk(escrowIds: string[]): Promise<Record<string, EscrowEventRow[]>> {
  const out: Record<string, EscrowEventRow[]> = {};
  if (escrowIds.length === 0) return out;
  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from('escrow_events')
      .select('id, escrow_id, type, actor_role, title, body, meta, created_at, created_by')
      .in('escrow_id', escrowIds)
      .order('created_at', { ascending: true });
    if (error) return out;
    for (const row of (data ?? []) as (EscrowEventRow & { escrow_id: string })[]) {
      (out[row.escrow_id] ??= []).push(row);
    }
    return out;
  } catch {
    return out;
  }
}
