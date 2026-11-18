// 査定表の共通ロジック：アクター解決（本部 or 加盟店）＋ service role での CRUD。
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isAdminUser } from '@/lib/admin';
import { getDealerForUser } from '@/lib/dealer';
import type { InspectionData } from '@/lib/inspection-spec';

export type Actor = {
  userId: string;
  isAdmin: boolean;
  dealerId: string | null;
  scope: 'hq' | 'dealer';
};

export type InspectionSheet = {
  id: string;
  created_by: string | null;
  scope: 'hq' | 'dealer';
  dealer_id: string | null;
  listing_id: string | null;
  maker: string | null;
  model: string | null;
  model_year: number | null;
  mileage_km: number | null;
  plate: string | null;
  customer_name: string | null;
  vehicle: Record<string, unknown>;
  inspection: InspectionData;
  photos: { url: string; caption?: string }[];
  overall_rating: string | null;
  appraised_price: number | null;
  cost_estimate: number | null;
  internal_note: string | null;
  status: 'draft' | 'done';
  created_at: string;
  updated_at: string;
};

/** ログインユーザーが査定表を使えるか判定し、アクター情報を返す。 */
export async function resolveActor(): Promise<Actor | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (await isAdminUser()) {
    return { userId: user.id, isAdmin: true, dealerId: null, scope: 'hq' };
  }
  const dealer = await getDealerForUser(user.id);
  if (dealer) {
    return { userId: user.id, isAdmin: false, dealerId: dealer.dealerId, scope: 'dealer' };
  }
  return null;
}

/** アクターがこの査定表を閲覧/編集できるか。 */
export function canAccess(actor: Actor, sheet: Pick<InspectionSheet, 'dealer_id' | 'scope'>): boolean {
  if (actor.isAdmin) return true; // 本部は全件
  // 加盟店は自店のものだけ
  return actor.scope === 'dealer' && !!actor.dealerId && sheet.dealer_id === actor.dealerId;
}

export async function listSheets(actor: Actor, limit = 100): Promise<InspectionSheet[]> {
  const svc = createServiceClient();
  let q = svc.from('inspection_sheets').select('*').order('updated_at', { ascending: false }).limit(limit);
  if (!actor.isAdmin) q = q.eq('dealer_id', actor.dealerId);
  const { data } = await q;
  return (data ?? []) as InspectionSheet[];
}

export async function getSheet(id: string): Promise<InspectionSheet | null> {
  const svc = createServiceClient();
  const { data } = await svc.from('inspection_sheets').select('*').eq('id', id).maybeSingle();
  return (data as InspectionSheet | null) ?? null;
}

export async function createSheet(actor: Actor, init: Partial<InspectionSheet>): Promise<{ ok: boolean; id?: string; error?: string }> {
  const svc = createServiceClient();
  const row = {
    created_by: actor.userId,
    scope: actor.scope,
    dealer_id: actor.scope === 'dealer' ? actor.dealerId : null,
    listing_id: init.listing_id ?? null,
    maker: init.maker ?? null,
    model: init.model ?? null,
    model_year: init.model_year ?? null,
    mileage_km: init.mileage_km ?? null,
    plate: init.plate ?? null,
    customer_name: init.customer_name ?? null,
    vehicle: init.vehicle ?? {},
    inspection: init.inspection ?? {},
    photos: init.photos ?? [],
    status: 'draft' as const,
  };
  const { data, error } = await svc.from('inspection_sheets').insert(row).select('id').single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (data as { id: string }).id };
}

const UPDATABLE = new Set([
  'listing_id', 'maker', 'model', 'model_year', 'mileage_km', 'plate', 'customer_name',
  'vehicle', 'inspection', 'photos', 'overall_rating', 'appraised_price', 'cost_estimate',
  'internal_note', 'status',
]);

export async function updateSheet(id: string, patch: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const svc = createServiceClient();
  const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(patch)) if (UPDATABLE.has(k)) clean[k] = v;
  const { error } = await svc.from('inspection_sheets').update(clean).eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteSheet(id: string): Promise<{ ok: boolean; error?: string }> {
  const svc = createServiceClient();
  const { error } = await svc.from('inspection_sheets').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
