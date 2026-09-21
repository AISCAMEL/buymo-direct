// 車名マスタ（サーバー側）。
// フォームには「curated（固定候補）＋ vehicle_models（DB）＋ 実際の出品」を統合して返す。
// refreshVehicleModels() を Cron で回すと、実出品とAI（現行ラインナップ）から自動更新される。
import { MAKERS } from '@/lib/constants';
import { generateWithClaude } from '@/lib/ai';
import { createServiceClient } from '@/lib/supabase/service';

function dedupeSorted(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const m = (raw ?? '').trim();
    if (!m || m === 'その他') continue;
    const key = m.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out.sort((a, b) => a.localeCompare(b, 'ja'));
}

/** メーカーの車名候補を返す（curated＋DB＋実出品を統合）。失敗時もcuratedは返す。 */
export async function getModelSuggestions(maker: string): Promise<string[]> {
  const curated = MAKERS[maker] ?? [];
  const collected: string[] = [...curated];

  try {
    const s = createServiceClient();
    const [dbRes, listingRes] = await Promise.all([
      s.from('vehicle_models').select('model').eq('maker', maker).eq('active', true).limit(200),
      s.from('listings').select('model').eq('maker', maker).not('model', 'is', null).limit(500),
    ]);
    for (const r of (dbRes.data ?? []) as { model: string }[]) collected.push(r.model);
    for (const r of (listingRes.data ?? []) as { model: string | null }[]) if (r.model) collected.push(r.model);
  } catch {
    /* DB未整備でも curated は返す */
  }

  return dedupeSorted(collected).slice(0, 60);
}

/** AIに現行ラインナップを尋ねて車名配列を得る（キー無し・失敗時は空配列）。 */
async function fetchAiModels(maker: string): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) return [];
  try {
    const year = new Date().getFullYear();
    const prompt = `${year}年時点で日本国内で販売中または近年販売された「${maker}」の代表的な乗用車の車種名を最大15個、JSON配列のみで返してください（説明・前置き・コードブロック記号は不要、車種名のみの日本語配列）。例: ["プリウス","アクア"]`;
    const text = await generateWithClaude(prompt);
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    const arr = JSON.parse(match[0]) as unknown[];
    return arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 0 && x.length <= 40).slice(0, 15);
  } catch {
    return [];
  }
}

/** 車名マスタを更新（curatedをseed＋実出品＋AI現行ラインナップをupsert）。Cron/管理者用。 */
export async function refreshVehicleModels(): Promise<{ makers: number; upserts: number; aiUsed: boolean }> {
  const s = createServiceClient();
  const makers = Object.keys(MAKERS).filter((m) => m !== 'その他');
  let upserts = 0;
  let aiUsed = false;

  for (const maker of makers) {
    const rows: { maker: string; model: string; source: string; active: boolean; updated_at: string }[] = [];
    const now = new Date().toISOString();

    // 1) curated（固定候補）を seed として登録
    for (const model of (MAKERS[maker] ?? []).filter((m) => m !== 'その他')) {
      rows.push({ maker, model, source: 'seed', active: true, updated_at: now });
    }

    // 2) 実際の出品から車名を取り込み
    try {
      const { data } = await s.from('listings').select('model').eq('maker', maker).not('model', 'is', null).limit(1000);
      for (const r of (data ?? []) as { model: string | null }[]) {
        if (r.model && r.model.trim() && r.model !== 'その他') {
          rows.push({ maker, model: r.model.trim(), source: 'listing', active: true, updated_at: now });
        }
      }
    } catch {
      /* skip */
    }

    // 3) AIで現行ラインナップを更新（新車反映）
    const aiModels = await fetchAiModels(maker);
    if (aiModels.length) {
      aiUsed = true;
      for (const model of aiModels) rows.push({ maker, model, source: 'ai', active: true, updated_at: now });
    }

    // upsert（重複は無視、既存を優先）
    if (rows.length) {
      try {
        const { error } = await s.from('vehicle_models').upsert(rows, { onConflict: 'maker,model', ignoreDuplicates: true });
        if (!error) upserts += rows.length;
      } catch {
        /* skip */
      }
    }
  }

  return { makers: makers.length, upserts, aiUsed };
}
