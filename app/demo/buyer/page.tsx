'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Search, Heart, MessageSquare, ShieldCheck, Home, Calculator,
  Eye, MapPin, Gauge, Calendar, Fuel, Settings2, Palette,
  CheckCircle2, CreditCard, Truck, Tag, Star, Send, X, ChevronRight,
} from 'lucide-react';
import { DEMO_LISTINGS } from '@/lib/demo-data';
import { formatYen } from '@/lib/format';

type Tab = 'browse' | 'detail' | 'favorites' | 'messages' | 'purchase';

const BODY_IMG: Record<string, string> = {
  'セダン': '/cars/sedan.jpg',
  'ハッチバック': '/cars/compact.jpg',
  'ミニバン': '/cars/minivan.jpg',
  'SUV': '/cars/suv.jpg',
  '軽自動車': '/cars/kei.jpg',
};
function carImg(body: string) {
  return BODY_IMG[body] ?? '/cars/subaru.jpg';
}

const ESCROW_STEPS = [
  { key: 'initiated', label: '入金待ち', icon: CreditCard },
  { key: 'funds_held', label: '入金済み', icon: ShieldCheck },
  { key: 'inspection', label: '現車確認', icon: Eye },
  { key: 'title_transfer', label: '名義変更', icon: Truck },
  { key: 'completed', label: '取引完了', icon: CheckCircle2 },
];

const DEMO_CHAT = [
  { from: 'seller', name: '小林 明美', text: 'お問い合わせありがとうございます。現車はいつでもご確認いただけます。', time: '10:12' },
  { from: 'me', name: '田中 大輔', text: '週末に現車確認できますか？走行距離と修復歴を詳しく知りたいです。', time: '10:20' },
  { from: 'seller', name: '小林 明美', text: '土曜の午後はいかがでしょう。修復歴なし、整備記録も全てお渡しできます。', time: '10:24' },
];

function monthly(principal: number, annualRate: number, months: number) {
  const r = annualRate / 100 / 12;
  if (r === 0) return Math.round(principal / months);
  return Math.round((principal * r) / (1 - Math.pow(1 + r, -months)));
}

export default function DemoBuyerPage() {
  const active = DEMO_LISTINGS.filter((l) => l.status !== 'sold');
  const [tab, setTab] = useState<Tab>('browse');
  const [selectedId, setSelectedId] = useState('lst-006');
  const [favs, setFavs] = useState<string[]>(['lst-001', 'lst-006', 'lst-007']);
  const [offer, setOffer] = useState('');
  const [chat, setChat] = useState(DEMO_CHAT);
  const [reply, setReply] = useState('');
  const [stepIdx, setStepIdx] = useState(2); // 現車確認
  const [toast, setToast] = useState<string | null>(null);

  const selected = DEMO_LISTINGS.find((l) => l.id === selectedId) ?? DEMO_LISTINGS[0];
  function notify(m: string) { setToast(m); setTimeout(() => setToast(null), 2600); }
  function toggleFav(id: string) {
    setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }
  function openDetail(id: string) { setSelectedId(id); setTab('detail'); }

  const TABS: { key: Tab; label: string; icon: typeof Home; badge?: number }[] = [
    { key: 'browse', label: '車を探す', icon: Search },
    { key: 'detail', label: '車の詳細', icon: Tag },
    { key: 'favorites', label: 'お気に入り', icon: Heart, badge: favs.length },
    { key: 'messages', label: 'メッセージ', icon: MessageSquare, badge: 2 },
    { key: 'purchase', label: '購入・取引', icon: ShieldCheck, badge: 1 },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* プロフィール帯 */}
      <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-100 text-lg font-black text-gold-600">田</span>
        <div>
          <p className="text-lg font-black text-navy-800">田中 大輔 <span className="ml-1 rounded-full bg-navy-50 px-2 py-0.5 align-middle text-xs font-bold text-navy-600">買主会員</span></p>
          <p className="text-xs text-slate-500">気になる車を探して、安全に購入できます</p>
        </div>
      </div>

      {/* タブ */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tab === key ? 'bg-navy-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
            {badge ? (
              <span className={`ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${tab === key ? 'bg-white text-navy-600' : 'bg-red-500 text-white'}`}>{badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── 車を探す ── */}
      {tab === 'browse' && (
        <section>
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
            <Search className="h-4 w-4 text-slate-400" />
            <input placeholder="車名・メーカーで探す（例：SUV ハイブリッド）" className="w-full text-sm outline-none" />
            <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-bold text-navy-600">{active.length}台</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((l) => (
              <div key={l.id} className="card overflow-hidden transition hover:shadow-md">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <Image src={carImg(l.body_type)} alt={l.title} fill className="object-cover" sizes="300px" />
                  <button
                    onClick={() => { toggleFav(l.id); notify(favs.includes(l.id) ? 'お気に入りから外しました' : 'お気に入りに追加しました'); }}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm"
                    aria-label="お気に入り"
                  >
                    <Heart className={`h-4 w-4 ${favs.includes(l.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                  </button>
                  <span className="absolute left-2 top-2 rounded-full bg-gold-500 px-2 py-0.5 text-[11px] font-black text-[#2E2408]">買取保証つき</span>
                  {l.status === 'reserved' && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-navy-700/90 px-2 py-0.5 text-[11px] font-bold text-white">商談中</span>
                  )}
                </div>
                <button onClick={() => openDetail(l.id)} className="block w-full p-3 text-left">
                  <p className="line-clamp-1 text-sm font-bold text-navy-800">{l.title}</p>
                  <p className="mt-1 text-lg font-black text-navy-600">{formatYen(l.price)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    <span>{l.year}年</span><span>{l.mileage_km.toLocaleString()}km</span><span>{l.prefecture}</span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 車の詳細 ── */}
      {tab === 'detail' && (
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[18px] bg-slate-100">
              <Image src={carImg(selected.body_type)} alt={selected.title} fill className="object-cover" sizes="700px" />
              <span className="absolute left-3 top-3 rounded-full bg-gold-500 px-3 py-1 text-xs font-black text-[#2E2408]">買取保証つき</span>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="relative h-16 w-24 overflow-hidden rounded-lg bg-slate-100">
                  <Image src={carImg(selected.body_type)} alt="" fill className="object-cover opacity-90" sizes="96px" />
                </div>
              ))}
            </div>
            <div>
              <h1 className="text-xl font-black text-navy-800">{selected.title}</h1>
              <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />342回閲覧</span>
                <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{18 + (favs.includes(selected.id) ? 1 : 0)}お気に入り</span>
              </div>
            </div>
            <div className="card grid grid-cols-2 gap-px overflow-hidden bg-slate-100 sm:grid-cols-3">
              {[
                { icon: Calendar, label: '年式', value: `${selected.year}年` },
                { icon: Gauge, label: '走行距離', value: `${selected.mileage_km.toLocaleString()}km` },
                { icon: MapPin, label: '地域', value: selected.prefecture },
                { icon: Settings2, label: 'ミッション', value: selected.transmission },
                { icon: Fuel, label: '燃料', value: selected.fuel },
                { icon: Palette, label: 'カラー', value: selected.color },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2 bg-white px-3 py-3">
                  <Icon className="h-4 w-4 shrink-0 text-navy-400" />
                  <div><p className="text-[11px] text-slate-400">{label}</p><p className="text-sm font-bold text-navy-800">{value}</p></div>
                </div>
              ))}
            </div>
            <div className="card p-4">
              <p className="mb-1 text-sm font-black text-navy-800">この車について</p>
              <p className="text-sm leading-relaxed text-slate-600">ワンオーナー・禁煙車。整備記録簿完備、修復歴なし。ディーラー点検済みで内外装ともに良好なコンディションです。買取保証つきなので、購入後の乗り換えも安心です。</p>
            </div>
          </div>

          {/* 購入サイドバー */}
          <aside className="space-y-3">
            <div className="card sticky top-4 p-4">
              <p className="text-xs text-slate-500">支払総額（税込・諸費用込）</p>
              <p className="text-3xl font-black text-navy-600">{formatYen(selected.price)}</p>
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-gold-50 px-3 py-2 text-xs font-bold text-gold-600">
                <ShieldCheck className="h-4 w-4" /> 買取保証つき／エスクロー決済で安全
              </div>

              <div className="mt-4 space-y-2">
                <button onClick={() => { setTab('purchase'); notify('購入手続きを開始しました'); }} className="btn-gold w-full">購入手続きへ進む</button>
                <button onClick={() => setTab('messages')} className="btn-outline w-full"><MessageSquare className="h-4 w-4" />出品者に質問する</button>
                <button onClick={() => toggleFav(selected.id)} className="btn-accent w-full">
                  <Heart className={`h-4 w-4 ${favs.includes(selected.id) ? 'fill-white' : ''}`} /> {favs.includes(selected.id) ? 'お気に入り済み' : 'お気に入りに追加'}
                </button>
              </div>

              {/* オファー */}
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="mb-1.5 text-xs font-bold text-slate-600">価格を交渉（オファー）</p>
                <div className="flex gap-2">
                  <input value={offer} onChange={(e) => setOffer(e.target.value)} inputMode="numeric" placeholder="希望価格（円）" className="input flex-1" />
                  <button onClick={() => { if (offer) { notify('オファーを送信しました'); setOffer(''); } }} className="btn-primary shrink-0">送信</button>
                </div>
              </div>

              {/* ローン */}
              <div className="mt-4 rounded-xl bg-navy-50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-navy-700"><Calculator className="h-3.5 w-3.5" />ローン月々シミュレーション</p>
                <p className="mt-1 text-sm text-navy-800">頭金20万・60回・年率3.9%の場合</p>
                <p className="text-2xl font-black text-navy-600">月々 {formatYen(monthly(selected.price - 200000, 3.9, 60))}</p>
              </div>
            </div>

            {/* 出品者 */}
            <div className="card p-4">
              <p className="mb-2 text-xs font-bold text-slate-500">出品者</p>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 font-black text-navy-600">小</span>
                <div>
                  <p className="text-sm font-bold text-navy-800">小林 明美</p>
                  <p className="flex items-center gap-1 text-xs text-amber-500"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />4.8（23件）・本人確認済み</p>
                </div>
              </div>
            </div>
          </aside>
        </section>
      )}

      {/* ── お気に入り ── */}
      {tab === 'favorites' && (
        <section>
          <h2 className="mb-3 text-lg font-black text-navy-800">お気に入り（{favs.length}）</h2>
          {favs.length === 0 ? (
            <div className="card p-10 text-center text-sm text-slate-500">お気に入りはまだありません。</div>
          ) : (
            <div className="space-y-2">
              {DEMO_LISTINGS.filter((l) => favs.includes(l.id)).map((l) => (
                <div key={l.id} className="card flex items-center gap-3 p-3">
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <Image src={carImg(l.body_type)} alt={l.title} fill className="object-cover" sizes="96px" />
                  </div>
                  <button onClick={() => openDetail(l.id)} className="flex-1 text-left">
                    <p className="text-sm font-bold text-navy-800">{l.title}</p>
                    <p className="text-base font-black text-navy-600">{formatYen(l.price)}</p>
                    <p className="text-xs text-slate-500">{l.year}年・{l.mileage_km.toLocaleString()}km・{l.prefecture}</p>
                  </button>
                  <button onClick={() => openDetail(l.id)} className="btn-outline shrink-0 !px-3 !py-1.5 text-xs">詳細<ChevronRight className="h-3.5 w-3.5" /></button>
                  <button onClick={() => toggleFav(l.id)} aria-label="削除" className="shrink-0 rounded-full p-2 hover:bg-slate-100"><Heart className="h-5 w-5 fill-red-500 text-red-500" /></button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── メッセージ ── */}
      {tab === 'messages' && (
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-black text-navy-800">小林 明美 さん</p>
              <p className="text-xs text-slate-500">スバル フォレスター 2020年 について</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600">本人確認済み</span>
          </div>
          <div className="space-y-3 bg-slate-50 px-4 py-5">
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${m.from === 'me' ? 'bg-navy-500 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>
                  <p>{m.text}</p>
                  <p className={`mt-1 text-[10px] ${m.from === 'me' ? 'text-white/70' : 'text-slate-400'}`}>{m.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-3">
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="メッセージを入力…" className="input flex-1" />
            <button
              onClick={() => { if (reply.trim()) { setChat((c) => [...c, { from: 'me', name: '田中 大輔', text: reply, time: '今' }]); setReply(''); } }}
              className="btn-accent shrink-0"><Send className="h-4 w-4" />送信</button>
          </div>
        </section>
      )}

      {/* ── 購入・取引（買い手のエスクロー） ── */}
      {tab === 'purchase' && (
        <section className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">購入手続き中</p>
              <p className="text-lg font-black text-navy-800">スバル フォレスター 2020年</p>
              <p className="text-sm text-slate-500">出品者：小林 明美</p>
            </div>
            <p className="text-2xl font-black text-navy-600">{formatYen(2150000)}</p>
          </div>

          {/* ステップ */}
          <div className="mt-5 flex items-center justify-between">
            {ESCROW_STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i <= stepIdx;
              return (
                <div key={s.key} className="flex flex-1 flex-col items-center text-center">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${done ? 'bg-navy-500 text-white' : 'bg-slate-100 text-slate-300'}`}><Icon className="h-4 w-4" /></div>
                  <p className={`mt-1 text-[11px] font-bold ${done ? 'text-navy-700' : 'text-slate-400'}`}>{s.label}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl bg-navy-50 p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold text-navy-700"><ShieldCheck className="h-4 w-4" />エスクロー保護中</p>
            <p className="mt-1 text-sm text-navy-800">代金はBUYMOが一時お預かりしています。現車を確認し、問題がなければ「受け取り確認」で出品者へ入金されます。トラブル時は返金対応。</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {stepIdx < ESCROW_STEPS.length - 1 ? (
              <button onClick={() => { setStepIdx((i) => i + 1); notify('次のステップへ進みました'); }} className="btn-gold">
                {stepIdx === 2 ? '現車確認OK・受け取り確認へ' : '次のステップへ進める'}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-600"><CheckCircle2 className="h-4 w-4" />取引が完了しました</span>
            )}
            <button onClick={() => setTab('messages')} className="btn-outline"><MessageSquare className="h-4 w-4" />出品者に連絡</button>
          </div>

          {/* チェックリスト */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 text-sm font-black text-navy-800">現車確認チェックリスト</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {['エンジン始動', '走行距離の一致', '外装キズ・ヘコミ', '内装・臭い', '書類（車検証等）', '試乗フィーリング'].map((c) => (
                <label key={c} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" className="h-4 w-4 accent-[#0F766E]" /> {c}
                </label>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* トースト */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-navy-800 px-5 py-2.5 text-sm font-bold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
