'use client';

import { useState } from 'react';
import { Search, Car, JapaneseYen } from 'lucide-react';
import { MAKERS, BODY_TYPES, YEAR_OPTIONS } from '@/lib/constants';

// トップのヒーロー内「タブ切替の検索ボックス」。
// ・購入タブ … メーカー/車種(ボディ)/年式 → /listings（既存の検索パラメータ）
// ・買取査定タブ … メーカー/車種(モデル)/年式 → /listings/valuation（無料査定）
// ネイティブのGET送信なのでJSが無くても動作する（タブと連動selectのみクライアント）。
export function HeroSearchTabs() {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [maker, setMaker] = useState('');

  const makerList = Object.keys(MAKERS);
  const models = maker && MAKERS[maker] ? MAKERS[maker] : [];

  return (
    <div className="mx-auto mt-6 max-w-xl rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 lg:mx-0">
      {/* タブ */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab('buy')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-black transition ${
            tab === 'buy' ? 'bg-navy-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Car className="h-4 w-4" /> 車を探す（購入）
        </button>
        <button
          type="button"
          onClick={() => setTab('sell')}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-black transition ${
            tab === 'sell' ? 'bg-navy-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <JapaneseYen className="h-4 w-4" /> 車を売る（買取査定）
        </button>
      </div>

      {/* フォーム */}
      <form action={tab === 'buy' ? '/listings' : '/listings/valuation'} className="mt-2 p-1">
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="sr-only" htmlFor="hs-maker">メーカー</label>
          <select
            id="hs-maker"
            name="maker"
            value={maker}
            onChange={(e) => setMaker(e.target.value)}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-navy-400"
          >
            <option value="">メーカーを選択</option>
            {makerList.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {tab === 'buy' ? (
            <select
              name="body"
              aria-label="車種（ボディタイプ）"
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-navy-400"
            >
              <option value="">車種を選択</option>
              {BODY_TYPES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          ) : (
            <select
              name="model"
              aria-label="車種（モデル）"
              disabled={!models.length}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-navy-400 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">{models.length ? '車種を選択' : '先にメーカーを選択'}</option>
              {models.map((md) => (
                <option key={md} value={md}>{md}</option>
              ))}
            </select>
          )}

          <select
            name="year_min"
            aria-label="年式（これ以降）"
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-navy-400"
          >
            <option value="">年式を選択</option>
            {YEAR_OPTIONS.slice(0, 20).map((y) => (
              <option key={y} value={y}>{y}年以降</option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-accent mt-2 w-full justify-center py-3 text-base">
          <Search className="h-4 w-4" />
          {tab === 'buy' ? 'この条件で探す' : '無料査定を申し込む'}
        </button>
      </form>
    </div>
  );
}
