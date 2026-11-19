// ヒアリングシート（出張・来店査定の聞き取り）の項目定義＋保存/取得。
import { createServiceClient } from '@/lib/supabase/service';

export const SELL_TIMING = ['今すぐ', '1ヶ月以内', '3ヶ月以内', '半年以内', '未定・検討中'] as const;
export const MOTIVES = ['乗り換え', '不要になった', '資金が必要', '車検が近い', '引っ越し', '故障・不調', 'その他'] as const;

export type CompetitorQuote = { name: string; price: string };

export type HearingData = {
  competitors?: CompetitorQuote[]; // 他社の査定額
  hopePrice?: string;              // 希望金額
  sellTiming?: string;             // 売却時期
  motives?: string[];              // 売却動機（複数可）
  situation?: string;              // 現在の状況（他社商談中・比較中など）
  conditionNote?: string;          // 車両状態の聞き取りメモ
  requests?: string;               // ご要望・備考
};

export type HearingSheet = {
  id: string;
  dealer_id: string | null;
  store_label: string | null;
  source: 'web' | 'paper';
  customer_name: string | null;
  tel: string | null;
  maker: string | null;
  model: string | null;
  model_year: number | null;
  mileage_km: number | null;
  plate: string | null;
  hearing: HearingData;
  note: string | null;
  status: 'new' | 'handled';
  created_at: string;
};

export type HearingInput = {
  dealerId?: string | null;
  storeLabel?: string | null;
  source?: 'web' | 'paper';
  customerName?: string | null;
  tel?: string | null;
  maker?: string | null;
  model?: string | null;
  modelYear?: number | null;
  mileageKm?: number | null;
  plate?: string | null;
  hearing?: HearingData;
  note?: string | null;
};

export async function saveHearing(input: HearingInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const svc = createServiceClient();
    const row = {
      dealer_id: input.dealerId ?? null,
      store_label: input.storeLabel ?? null,
      source: input.source ?? 'web',
      customer_name: input.customerName ?? null,
      tel: input.tel ?? null,
      maker: input.maker ?? null,
      model: input.model ?? null,
      model_year: input.modelYear ?? null,
      mileage_km: input.mileageKm ?? null,
      plate: input.plate ?? null,
      hearing: input.hearing ?? {},
      note: input.note ?? null,
    };
    const { data, error } = await svc.from('hearing_sheets').insert(row).select('id').single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: (data as { id: string }).id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

export async function getHearing(id: string): Promise<HearingSheet | null> {
  const svc = createServiceClient();
  const { data } = await svc.from('hearing_sheets').select('*').eq('id', id).maybeSingle();
  return (data as HearingSheet | null) ?? null;
}

export async function listHearing(dealerId: string | null, limit = 100): Promise<HearingSheet[]> {
  const svc = createServiceClient();
  let q = svc.from('hearing_sheets').select('*').order('created_at', { ascending: false }).limit(limit);
  if (dealerId) q = q.eq('dealer_id', dealerId);
  const { data } = await q;
  return (data ?? []) as HearingSheet[];
}
