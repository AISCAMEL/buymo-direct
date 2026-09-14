/**
 * POST /api/dealer/inventory
 * 外部在庫管理システム（DMS）からの在庫一括同期エンドポイント。
 *
 * 認証: リクエストヘッダー X-Dealer-API-Key にAPIキーをセット。
 *
 * リクエストボディ（JSON配列）:
 * [
 *   {
 *     "external_id": "DMS-001",          // 外部システムのID（重複排除用・任意）
 *     "title": "トヨタ プリウス 2022年",
 *     "maker": "トヨタ",
 *     "model": "プリウス",
 *     "year": 2022,
 *     "mileage_km": 15000,
 *     "price": 2500000,
 *     "prefecture": "東京都",
 *     "body_type": "セダン",              // 任意
 *     "transmission": "CVT",             // 任意
 *     "fuel": "ハイブリッド",              // 任意
 *     "color": "ホワイト",                // 任意
 *     "vin": "JTEBx...",                 // 任意
 *     "repair_history": false,           // 任意 (default: false)
 *     "description": "..."              // 任意
 *   }
 * ]
 *
 * レスポンス:
 * { "ok": true, "created": N, "skipped": M, "errors": [...] }
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyApiKey } from '@/lib/dealer';
import { PREFECTURES } from '@/lib/constants';

const MAX_ITEMS = 200;

type InventoryItem = {
  external_id?: string;
  title: string;
  maker: string;
  model: string;
  year: number;
  mileage_km: number;
  price: number;
  prefecture: string;
  body_type?: string;
  transmission?: string;
  fuel?: string;
  color?: string;
  vin?: string;
  repair_history?: boolean;
  description?: string;
};

export async function POST(req: Request) {
  const apiKey = req.headers.get('x-dealer-api-key');
  if (!apiKey) return NextResponse.json({ error: 'Missing X-Dealer-API-Key header' }, { status: 401 });

  const dealerId = await verifyApiKey(apiKey);
  if (!dealerId) return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 });

  // 加盟店が承認済みか確認
  const service = createServiceClient();
  const { data: dealer } = await service.from('dealers').select('id, status, owner_id').eq('id', dealerId).maybeSingle();
  if (!dealer || dealer.status !== 'approved') {
    return NextResponse.json({ error: 'Dealer is not approved' }, { status: 403 });
  }

  let items: InventoryItem[];
  try {
    items = await req.json();
    if (!Array.isArray(items)) throw new Error('Body must be a JSON array');
    if (items.length > MAX_ITEMS) throw new Error(`Max ${MAX_ITEMS} items per request`);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const created: string[] = [];
  const errors: { index: number; message: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // バリデーション
    if (!item.title?.trim()) { errors.push({ index: i, message: 'title required' }); continue; }
    if (!item.maker?.trim()) { errors.push({ index: i, message: 'maker required' }); continue; }
    if (!item.model?.trim()) { errors.push({ index: i, message: 'model required' }); continue; }
    if (!item.year || item.year < 1960 || item.year > new Date().getFullYear() + 1) {
      errors.push({ index: i, message: 'invalid year' }); continue;
    }
    if (!Number.isFinite(item.mileage_km) || item.mileage_km < 0) {
      errors.push({ index: i, message: 'invalid mileage_km' }); continue;
    }
    if (!item.price || item.price < 1) { errors.push({ index: i, message: 'price required' }); continue; }
    if (!PREFECTURES.includes(item.prefecture)) {
      errors.push({ index: i, message: `invalid prefecture: ${item.prefecture}` }); continue;
    }

    const insertData = {
      seller_id: dealer.owner_id,
      dealer_id: dealerId,
      status: 'active' as const,
      title: item.title.trim(),
      maker: item.maker.trim(),
      model: item.model.trim(),
      year: item.year,
      mileage_km: item.mileage_km,
      price: item.price,
      prefecture: item.prefecture,
      body_type: item.body_type?.trim() || null,
      transmission: item.transmission?.trim() || null,
      fuel: item.fuel?.trim() || null,
      color: item.color?.trim() || null,
      vin: item.vin?.trim() || null,
      repair_history: item.repair_history ?? false,
      description: item.description?.trim() || null,
    };

    const { data, error } = await service.from('listings').insert(insertData).select('id').single();
    if (error) { errors.push({ index: i, message: error.message }); }
    else if (data) { created.push(data.id); }
  }

  return NextResponse.json({
    ok: true,
    created: created.length,
    skipped: 0,
    errors,
    listing_ids: created,
  });
}
