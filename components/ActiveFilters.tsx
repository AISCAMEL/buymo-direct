'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { MILEAGE_MAX_OPTIONS } from '@/lib/constants';

type ParamUpdates = Record<string, string | null>;

interface Chip {
  label: string;
  updates: ParamUpdates;
}

function buildChips(params: URLSearchParams): Chip[] {
  const chips: Chip[] = [];

  // キーワード
  const q = params.get('q');
  if (q) {
    chips.push({ label: `"${q}"`, updates: { q: null } });
  }

  // メーカー / モデル
  const maker = params.get('maker');
  const model = params.get('model');
  if (maker) {
    chips.push({
      label: model ? `${maker} ${model}` : maker,
      updates: { maker: null, model: null },
    });
  } else if (model) {
    chips.push({ label: model, updates: { model: null } });
  }

  // ボディタイプ
  const body = params.get('body');
  if (body) {
    chips.push({ label: body, updates: { body: null } });
  }

  // 地域（複数選択対応）
  const prefsRaw = params.get('prefs') ?? params.get('pref') ?? '';
  const prefs = prefsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const pref of prefs) {
    const remaining = prefs.filter((p) => p !== pref).join(',');
    chips.push({
      label: pref,
      updates: {
        prefs: remaining || null,
        pref: null,
      },
    });
  }

  // 予算
  const priceMin = params.get('price_min');
  const priceMax = params.get('price_max');
  if (priceMin && priceMax) {
    chips.push({
      label: `${Math.round(Number(priceMin) / 10000)}万円〜${Math.round(Number(priceMax) / 10000)}万円`,
      updates: { price_min: null, price_max: null },
    });
  } else if (priceMin) {
    chips.push({
      label: `${Math.round(Number(priceMin) / 10000)}万円〜`,
      updates: { price_min: null },
    });
  } else if (priceMax) {
    chips.push({
      label: `〜${Math.round(Number(priceMax) / 10000)}万円`,
      updates: { price_max: null },
    });
  }

  // 年式
  const yearMin = params.get('year_min');
  const yearMax = params.get('year_max');
  if (yearMin && yearMax) {
    chips.push({
      label: `${yearMin}年〜${yearMax}年`,
      updates: { year_min: null, year_max: null },
    });
  } else if (yearMin) {
    chips.push({
      label: `${yearMin}年以降`,
      updates: { year_min: null },
    });
  } else if (yearMax) {
    chips.push({
      label: `〜${yearMax}年`,
      updates: { year_max: null },
    });
  }

  // 走行距離
  const kmMax = params.get('km_max');
  if (kmMax) {
    const option = MILEAGE_MAX_OPTIONS.find(
      (o) => o.value != null && String(o.value) === kmMax
    );
    chips.push({
      label: option ? option.label : `〜${(Number(kmMax) / 10000).toFixed(0)}万km`,
      updates: { km_max: null },
    });
  }

  // 燃料（複数選択対応）
  const fuelRaw = params.get('fuel') ?? '';
  const fuels = fuelRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const fuel of fuels) {
    const remaining = fuels.filter((f) => f !== fuel).join(',');
    chips.push({
      label: fuel,
      updates: { fuel: remaining || null },
    });
  }

  // ミッション（複数選択対応）
  const transRaw = params.get('transmission') ?? '';
  const transmissions = transRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const trans of transmissions) {
    const remaining = transmissions.filter((t) => t !== trans).join(',');
    chips.push({
      label: trans,
      updates: { transmission: remaining || null },
    });
  }

  // 修復歴なし
  if (params.get('norepair') === '1') {
    chips.push({ label: '修復歴なし', updates: { norepair: null } });
  }

  return chips;
}

export function ActiveFilters() {
  const params = useSearchParams();
  const router = useRouter();

  function applyUpdates(updates: ParamUpdates) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    router.push(`/listings?${next.toString()}`);
  }

  const chips = buildChips(params);
  if (chips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((chip, i) => (
        <button
          key={`${chip.label}-${i}`}
          type="button"
          onClick={() => applyUpdates(chip.updates)}
          className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-navy-50 px-3 py-1 text-xs font-bold text-navy-700 transition-colors hover:border-navy-400 hover:bg-navy-100"
        >
          {chip.label}
          <span className="text-navy-400" aria-hidden="true">
            ×
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => router.push('/listings')}
        className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700"
      >
        フィルタをクリア
      </button>
    </div>
  );
}
