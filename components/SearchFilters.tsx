'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import {
  MAKERS,
  BODY_TYPES,
  PREFECTURE_REGIONS,
  YEAR_OPTIONS,
  MILEAGE_MAX_OPTIONS,
} from '@/lib/constants';

const BODY_TYPE_ICONS: Record<string, string> = {
  '軽自動車': '🚗',
  'コンパクト': '🚙',
  'セダン': '🚘',
  'SUV': '🛻',
  'ミニバン': '🚐',
  'ワゴン': '🚌',
  'クーペ': '🏎',
  'オープン': '☀️',
  'その他': '···',
};

// チェックボックスで表示する燃料・ミッション選択肢
const FUEL_CHECKBOX_OPTIONS = ['ガソリン', 'ハイブリッド', 'ディーゼル', 'EV'];
const TRANS_CHECKBOX_OPTIONS = ['AT', 'CVT', 'MT'];

export function SearchFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [keyword, setKeyword] = useState(params.get('q') ?? '');
  const [openRegions, setOpenRegions] = useState<Record<string, boolean>>({});

  // 複数地域の選択状態
  const selectedPrefs = new Set(
    (params.get('prefs') ?? params.get('pref') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  // 複数燃料の選択状態（カンマ区切り）
  const selectedFuels = new Set(
    (params.get('fuel') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  // 複数ミッションの選択状態（カンマ区切り）
  const selectedTrans = new Set(
    (params.get('transmission') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if ('maker' in changes) next.delete('model');
      next.delete('page');
      router.push(`/listings?${next.toString()}`);
    },
    [params, router]
  );

  function submitKeyword(e?: React.FormEvent) {
    e?.preventDefault();
    update({ q: keyword.trim() || null });
  }

  function togglePref(pref: string) {
    const next = new Set(selectedPrefs);
    if (next.has(pref)) next.delete(pref);
    else next.add(pref);
    const value = [...next].join(',');
    update({ prefs: value || null, pref: null });
  }

  function toggleRegion(label: string) {
    setOpenRegions((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function toggleFuel(fuel: string) {
    const next = new Set(selectedFuels);
    if (next.has(fuel)) next.delete(fuel);
    else next.add(fuel);
    update({ fuel: [...next].join(',') || null });
  }

  function toggleTrans(trans: string) {
    const next = new Set(selectedTrans);
    if (next.has(trans)) next.delete(trans);
    else next.add(trans);
    update({ transmission: [...next].join(',') || null });
  }

  function toggleBody(body: string) {
    const current = params.get('body') ?? '';
    update({ body: current === body ? null : body });
  }

  const maker = params.get('maker') ?? '';
  const models = maker && MAKERS[maker] ? MAKERS[maker] : [];
  const currentBody = params.get('body') ?? '';

  const currentYear = new Date().getFullYear();
  // 年式選択肢: currentYear+1 ～ 2000
  const yearSelectOptions = [
    currentYear + 1,
    ...YEAR_OPTIONS.filter((y) => y >= 2000),
  ];

  const yearMin = params.get('year_min') ?? '';
  const yearMax = params.get('year_max') ?? '';
  const priceMin = params.get('price_min') ?? '';
  const priceMax = params.get('price_max') ?? '';
  const kmMax = params.get('km_max') ?? '';

  const totalPrefsSelected = selectedPrefs.size;

  return (
    <div className="card space-y-5 p-4">
      {/* キーワード */}
      <form onSubmit={submitKeyword}>
        <label className="label">キーワード</label>
        <div className="flex gap-2">
          <input
            className="input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="車名・メーカーなど"
          />
          <button type="submit" className="btn-primary shrink-0 px-3" aria-label="検索">
            <Search className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="border-t border-slate-100 pt-1">
        <h2 className="mb-4 font-bold">絞り込み</h2>

        <div className="space-y-4">
          {/* メーカー・モデル */}
          <div>
            <label className="label">メーカー</label>
            <select
              className="input"
              value={maker}
              onChange={(e) => update({ maker: e.target.value || null })}
            >
              <option value="">指定なし</option>
              {Object.keys(MAKERS).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {models.length > 0 && (
            <div>
              <label className="label">モデル</label>
              <select
                className="input"
                value={params.get('model') ?? ''}
                onChange={(e) => update({ model: e.target.value || null })}
              >
                <option value="">指定なし</option>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* ボディタイプ — アイコングリッド 3×3 */}
          <div>
            <label className="label">ボディタイプ</label>
            <div className="grid grid-cols-3 gap-1.5">
              {BODY_TYPES.map((b) => {
                const icon = BODY_TYPE_ICONS[b] ?? '🚗';
                const selected = currentBody === b;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBody(b)}
                    className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2.5 text-center transition-colors ${
                      selected
                        ? 'border-navy-400 bg-navy-50 text-navy-700'
                        : 'border-slate-200 text-slate-600 hover:border-navy-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl leading-none">{icon}</span>
                    <span className="mt-0.5 text-[10px] font-bold leading-tight">{b}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 年式 min / max */}
          <div>
            <label className="label">年式</label>
            <div className="flex items-center gap-2">
              <select
                className="input flex-1"
                value={yearMin}
                onChange={(e) => update({ year_min: e.target.value || null, year: null })}
              >
                <option value="">下限なし</option>
                {yearSelectOptions.map((y) => (
                  <option key={y} value={String(y)}>{y}年</option>
                ))}
              </select>
              <span className="shrink-0 text-slate-400">〜</span>
              <select
                className="input flex-1"
                value={yearMax}
                onChange={(e) => update({ year_max: e.target.value || null, year: null })}
              >
                <option value="">上限なし</option>
                {yearSelectOptions
                  .filter((y) => !yearMin || y >= Number(yearMin))
                  .map((y) => (
                    <option key={y} value={String(y)}>{y}年</option>
                  ))}
              </select>
            </div>
          </div>

          {/* 走行距離 */}
          <div>
            <label className="label">走行距離</label>
            <select
              className="input"
              value={kmMax}
              onChange={(e) => update({ km_max: e.target.value || null, mileage: null })}
            >
              {MILEAGE_MAX_OPTIONS.map((o) => (
                <option key={o.label} value={o.value != null ? String(o.value) : ''}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* 予算 */}
          <div>
            <label className="label">予算</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  className="input pr-8"
                  placeholder="最低価格"
                  min={0}
                  step={10}
                  value={priceMin ? String(Math.round(Number(priceMin) / 10000)) : ''}
                  onChange={(e) => {
                    const v = e.target.value ? String(Number(e.target.value) * 10000) : null;
                    update({ price_min: v, price: null });
                  }}
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  万円
                </span>
              </div>
              <span className="shrink-0 text-slate-400">〜</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  className="input pr-8"
                  placeholder="最高価格"
                  min={0}
                  step={10}
                  value={priceMax ? String(Math.round(Number(priceMax) / 10000)) : ''}
                  onChange={(e) => {
                    const v = e.target.value ? String(Number(e.target.value) * 10000) : null;
                    update({ price_max: v, price: null });
                  }}
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  万円
                </span>
              </div>
            </div>
          </div>

          {/* 燃料 — チェックボックス */}
          <div>
            <label className="label">燃料</label>
            <div className="grid grid-cols-2 gap-1.5">
              {FUEL_CHECKBOX_OPTIONS.map((f) => {
                const checked = selectedFuels.has(f);
                return (
                  <label
                    key={f}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      checked
                        ? 'border-navy-400 bg-navy-50 font-bold text-navy-700'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-navy-500"
                      checked={checked}
                      onChange={() => toggleFuel(f)}
                    />
                    {f}
                  </label>
                );
              })}
            </div>
          </div>

          {/* ミッション — チェックボックス */}
          <div>
            <label className="label">ミッション</label>
            <div className="flex gap-2">
              {TRANS_CHECKBOX_OPTIONS.map((t) => {
                const checked = selectedTrans.has(t);
                return (
                  <label
                    key={t}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-bold transition-colors ${
                      checked
                        ? 'border-navy-400 bg-navy-50 text-navy-700'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-navy-500"
                      checked={checked}
                      onChange={() => toggleTrans(t)}
                    />
                    {t}
                  </label>
                );
              })}
            </div>
          </div>

          {/* 地域 — リージョン別チェックボックス */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">地域</label>
              {totalPrefsSelected > 0 && (
                <span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-bold text-navy-600">
                  {totalPrefsSelected}件選択中
                </span>
              )}
            </div>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {PREFECTURE_REGIONS.map((region) => {
                const selectedInRegion = region.prefs.filter((p) => selectedPrefs.has(p)).length;
                const isOpen = openRegions[region.label] ?? selectedInRegion > 0;
                return (
                  <div key={region.label}>
                    <button
                      type="button"
                      onClick={() => toggleRegion(region.label)}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <span>
                        {region.label}
                        {selectedInRegion > 0 && (
                          <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-navy-500 px-1 text-[9px] font-bold text-white">
                            {selectedInRegion}
                          </span>
                        )}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 px-3 pb-2 pt-1">
                        {region.prefs.map((pref) => (
                          <label
                            key={pref}
                            className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700"
                          >
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-slate-300 accent-navy-500"
                              checked={selectedPrefs.has(pref)}
                              onChange={() => togglePref(pref)}
                            />
                            {pref}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 修復歴なし */}
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 accent-navy-500"
              checked={params.get('norepair') === '1'}
              onChange={(e) => update({ norepair: e.target.checked ? '1' : null })}
            />
            修復歴なしのみ
          </label>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => submitKeyword()}
          className="btn-primary w-full"
        >
          検索する
        </button>
        <button
          type="button"
          onClick={() => {
            setKeyword('');
            router.push('/listings');
          }}
          className="btn-outline w-full"
        >
          条件をリセット
        </button>
      </div>
    </div>
  );
}
