'use client';

import { useState } from 'react';
import {
  Package, MessageSquare, CreditCard, Heart, Bell,
  Eye, Star, BarChart3, Zap, Plus, Home,
  CheckCircle2, Truck, ShieldCheck, Calculator,
  Settings, AlertTriangle, X, ChevronDown, ChevronUp,
  FileText, Award, Car,
} from 'lucide-react';
import { DEMO_MY_LISTINGS, DEMO_MESSAGES, DEMO_ESCROWS } from '@/lib/demo-data';
import { formatYen } from '@/lib/format';

type Tab = 'home' | 'listings' | 'escrow' | 'loan' | 'services' | 'messages' | 'favorites' | 'profile';

const STATUS_LABEL: Record<string, string> = {
  active: '公開中', reserved: '商談中', sold: '成約済み',
  initiated: '入金待ち', funds_held: '入金済み', inspection: '現車確認',
  title_transfer: '名義変更', completed: '取引完了',
};
const STATUS_COLOR: Record<string, string> = {
  active: 'text-emerald-600 bg-emerald-50', reserved: 'text-navy-600 bg-navy-50',
  sold: 'text-slate-500 bg-slate-100', initiated: 'text-amber-600 bg-amber-50',
  funds_held: 'text-navy-600 bg-navy-50', inspection: 'text-accent-600 bg-accent-50',
  title_transfer: 'text-orange-600 bg-orange-50', completed: 'text-emerald-600 bg-emerald-50',
};

const ESCROW_STEPS = ['initiated', 'funds_held', 'inspection', 'title_transfer', 'completed'];
const ESCROW_STEP_LABEL: Record<string, string> = {
  initiated: '入金待ち', funds_held: '入金済み',
  inspection: '現車確認', title_transfer: '名義変更', completed: '取引完了',
};
const STEP_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  initiated: CreditCard, funds_held: ShieldCheck,
  inspection: Eye, title_transfer: Truck, completed: CheckCircle2,
};

const CHECKLIST_ITEMS = ['エンジン始動確認', '走行距離確認', '外装チェック', '内装チェック', '書類確認', '試乗'];
const REQUIRED_DOCS = ['車検証', '譲渡証明書', '印鑑証明書', '実印', '委任状', '自動車税納税証明書'];
const PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
const MAKERS = ['トヨタ', 'ホンダ', '日産', 'マツダ', 'スバル', 'その他'];

const DEMO_FAVORITES = [
  { id: 'fav-001', title: 'トヨタ プリウス 2022年', price: 2480000, prefecture: '東京都', mileage_km: 15200 },
  { id: 'fav-002', title: 'レクサス RX 2021年', price: 5480000, prefecture: '東京都', mileage_km: 31500 },
  { id: 'fav-003', title: 'トヨタ ヴォクシー 2023年', price: 3980000, prefecture: '埼玉県', mileage_km: 5100 },
];

const WARRANTY_PLANS = [
  { id: 'basic', label: 'ベーシック 3ヶ月', price: 29800, desc: 'エンジン・ミッション保証', recommended: false },
  { id: 'std', label: 'スタンダード 6ヶ月', price: 49800, desc: '+電装系保証', recommended: true },
  { id: 'premium', label: 'プレミアム 1年', price: 89800, desc: '全部位保証', recommended: false },
];

const FINANCE_COMPANIES = [
  { name: 'GMOクレジット', rate: 3.9, time: '最短即日', feature: 'オンライン完結' },
  { name: 'ジャックス', rate: 4.2, time: '1〜3営業日', feature: '長期ローン対応' },
  { name: 'アプラス', rate: 3.5, time: '最短翌日', feature: '低金利' },
];

export default function DemoSellerPage() {
  const [tab, setTab] = useState<Tab>('home');

  // Listings
  const [listings, setListings] = useState(DEMO_MY_LISTINGS);

  // Escrow
  const [myEscrow, setMyEscrow] = useState({ ...DEMO_ESCROWS[0], status: 'funds_held' as string });
  const [checklist, setChecklist] = useState(CHECKLIST_ITEMS.map(() => false));
  const [docsOpen, setDocsOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  // Loan
  const [loanPrice, setLoanPrice] = useState(2150000);
  const [loanDown, setLoanDown] = useState(200000);
  const [loanRate, setLoanRate] = useState(3.9);
  const [loanMonths, setLoanMonths] = useState(60);
  const [loanApplied, setLoanApplied] = useState(false);
  const [loanName, setLoanName] = useState('');
  const [loanDob, setLoanDob] = useState('');
  const [loanIncome, setLoanIncome] = useState('');
  const [loanEmploy, setLoanEmploy] = useState('');

  // Services
  const [assessDone, setAssessDone] = useState(false);
  const [assessMaker, setAssessMaker] = useState('トヨタ');
  const [assessModel, setAssessModel] = useState('');
  const [assessYear, setAssessYear] = useState('');
  const [assessKm, setAssessKm] = useState('');
  const [assessPref, setAssessPref] = useState('東京都');
  const [shippingFrom, setShippingFrom] = useState('愛知県');
  const [shippingTo, setShippingTo] = useState('東京都');
  const [shippingDate, setShippingDate] = useState('');
  const [shippingOrdered, setShippingOrdered] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<string | null>(null);

  // Messages
  const [messages] = useState(DEMO_MESSAGES);
  const [selectedMessage, setSelectedMessage] = useState<typeof DEMO_MESSAGES[0] | null>(null);
  const [replyText, setReplyText] = useState('');

  // Favorites
  const [favorites, setFavorites] = useState(DEMO_FAVORITES);

  // Profile
  const [displayName, setDisplayName] = useState('鈴木 一郎');
  const [bio, setBio] = useState('大阪在住。2台所有しており、1台を売却中です。');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  function notify(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  function advanceEscrow() {
    const idx = ESCROW_STEPS.indexOf(myEscrow.status);
    if (idx < ESCROW_STEPS.length - 1) {
      const next = ESCROW_STEPS[idx + 1];
      setMyEscrow(e => ({ ...e, status: next }));
      if (next === 'completed') {
        notify('取引が完了しました！評価をお願いします。');
        setListings(l => l.map(x => x.id === 'lst-004' ? { ...x, status: 'sold' } : x));
      } else {
        notify(`ステータスを「${ESCROW_STEP_LABEL[next]}」に更新しました`);
      }
    }
  }

  // Loan calc
  const principal = Math.max(0, loanPrice - loanDown);
  const r = loanRate / 100 / 12;
  const n = loanMonths;
  const monthly = r > 0 ? Math.round(principal * r / (1 - Math.pow(1 + r, -n))) : Math.round(principal / n);
  const totalPayment = monthly * n;
  const totalInterest = totalPayment - principal;

  const TABS = [
    { key: 'home', label: 'ホーム', icon: Home, badge: 3 },
    { key: 'listings', label: '出品管理', icon: Package, badge: listings.filter(l => l.status === 'active').length },
    { key: 'escrow', label: '取引', icon: ShieldCheck, badge: myEscrow.status !== 'completed' ? 1 : 0 },
    { key: 'loan', label: 'ローン', icon: Calculator, badge: 0 },
    { key: 'services', label: 'サービス', icon: Settings, badge: 0 },
    { key: 'messages', label: 'メッセージ', icon: MessageSquare, badge: messages.reduce((s, m) => s + m.unread, 0) },
    { key: 'favorites', label: 'お気に入り', icon: Heart, badge: 0 },
    { key: 'profile', label: 'プロフィール', icon: Star, badge: 0 },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-navy-700 px-5 py-3 text-sm font-bold text-white shadow-lg">{toast}</div>}

      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-navy-100 flex items-center justify-center font-black text-navy-600">鈴</div>
          <div>
            <p className="font-black text-navy-800">{displayName}</p>
            <p className="text-xs text-slate-400">評価: ★★★★★ 4.9（12件）{phoneVerified && ' / 電話認証済み ✓'}</p>
          </div>
          <button onClick={() => notify('通知設定を開きます')} className="ml-auto relative">
            <Bell className="h-5 w-5 text-slate-400" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Tabs */}
        <nav className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(({ key, label, icon: Icon, badge }) => (
            <button key={key} onClick={() => setTab(key as Tab)}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition ${tab === key ? 'bg-navy-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              <Icon className="h-4 w-4" />{label}
              {badge > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">{badge}</span>}
            </button>
          ))}
        </nav>

        {/* ── TAB: HOME ── */}
        {tab === 'home' && (
          <div className="space-y-5">
            {/* Rank card */}
            <div className="card p-5 bg-gradient-to-br from-navy-700 to-navy-900 text-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs opacity-70">会員ランク</p>
                  <p className="text-2xl font-black">シルバー会員</p>
                </div>
                <Award className="h-10 w-10 opacity-40" />
              </div>
              <div className="flex items-end gap-2 mb-2">
                <p className="text-3xl font-black">2,840<span className="text-base font-bold opacity-80">pt</span></p>
                <p className="text-xs opacity-60 mb-1">/ ゴールド 5,000pt</p>
              </div>
              <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full bg-accent-400" style={{ width: '57%' }} />
              </div>
              <p className="text-xs opacity-60 mt-1">ゴールド昇格まで 2,160pt</p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '成約件数', value: '3回', icon: CheckCircle2 },
                { label: '累計取引額', value: '¥8,310,000', icon: CreditCard },
                { label: '評価', value: '★4.9', icon: Star },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="card p-4 text-center">
                  <Icon className="h-5 w-5 mx-auto mb-1 text-navy-500" />
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="font-black text-navy-800 text-sm mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Service shortcuts */}
            <div>
              <h2 className="font-black text-navy-800 mb-3">サービスへのリンク</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {[
                  { label: 'ローン申請', icon: Calculator, t: 'loan' },
                  { label: '無料査定', icon: Car, t: 'services' },
                  { label: '陸送手配', icon: Truck, t: 'services' },
                  { label: '延長保証', icon: ShieldCheck, t: 'services' },
                  { label: '出品する', icon: Plus, t: 'listings' },
                  { label: 'メッセージ', icon: MessageSquare, t: 'messages' },
                ].map(({ label, icon: Icon, t }) => (
                  <button key={label} onClick={() => setTab(t as Tab)}
                    className="card p-3 flex flex-col items-center gap-2 hover:border-navy-300 transition text-center">
                    <div className="h-10 w-10 rounded-full bg-navy-50 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-navy-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-600">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div>
              <h2 className="font-black text-navy-800 mb-3">最近の通知</h2>
              <div className="card divide-y divide-slate-100">
                {[
                  { text: '新着メッセージ: 青木 隆さんからメッセージが届きました', time: '14:32', dot: 'bg-navy-500' },
                  { text: '査定結果が届きました — スバル フォレスター 2020年', time: '昨日', dot: 'bg-emerald-500' },
                  { text: 'エスクロー取引が更新されました — 入金確認', time: '昨日', dot: 'bg-amber-500' },
                ].map((n, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.dot}`} />
                    <p className="flex-1 text-sm text-slate-700">{n.text}</p>
                    <p className="text-xs text-slate-400 shrink-0">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: LISTINGS ── */}
        {tab === 'listings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-black">出品管理</h1>
              <button onClick={() => notify('出品フォームへ移動します')} className="btn-accent flex items-center gap-1.5 text-sm">
                <Plus className="h-4 w-4" /> 出品する
              </button>
            </div>
            <div className="space-y-3">
              {listings.map(l => (
                <div key={l.id} className="card p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="h-16 w-24 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                    <Package className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-black text-navy-800">{l.title}</h2>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[l.status]}`}>{STATUS_LABEL[l.status]}</span>
                    </div>
                    <p className="text-sm font-bold text-navy-600">{formatYen(l.price)}</p>
                    <div className="mt-1 flex gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{l.views}閲覧</span>
                      <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{l.favorites}お気に入り</span>
                      <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" />登録:{l.created_at}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0 flex-wrap">
                    {l.status === 'active' && (
                      <button onClick={() => notify('ブーストプランを選択します')} className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-100">
                        <Zap className="h-3.5 w-3.5" /> ブースト
                      </button>
                    )}
                    <button onClick={() => notify('編集フォームへ移動します')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold hover:bg-slate-50">編集</button>
                    {l.status === 'active' && (
                      <button onClick={() => { setListings(ls => ls.filter(x => x.id !== l.id)); notify('削除しました'); }}
                        className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100">削除</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: ESCROW ── */}
        {tab === 'escrow' && (
          <div className="space-y-4">
            <h1 className="text-xl font-black">取引・エスクロー</h1>
            <div className="card p-5 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-black">{myEscrow.listing_title}</h2>
                  <p className="text-sm text-slate-500">買主: {myEscrow.buyer}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-navy-700">{formatYen(myEscrow.amount)}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[myEscrow.status]}`}>{STATUS_LABEL[myEscrow.status]}</span>
                </div>
              </div>

              {/* 5-step progress */}
              <div className="relative flex items-start justify-between">
                <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-100" />
                {ESCROW_STEPS.map((step, i) => {
                  const Icon = STEP_ICON[step];
                  const currentIdx = ESCROW_STEPS.indexOf(myEscrow.status);
                  const done = i < currentIdx;
                  const active = i === currentIdx;
                  return (
                    <div key={step} className="relative z-10 flex flex-1 flex-col items-center gap-1 text-center">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full transition ${done ? 'bg-emerald-500 text-white' : active ? 'bg-navy-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                        {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <p className={`text-xs font-bold leading-tight ${active ? 'text-navy-600' : done ? 'text-emerald-600' : 'text-slate-300'}`}>{ESCROW_STEP_LABEL[step]}</p>
                    </div>
                  );
                })}
              </div>

              {myEscrow.status !== 'completed' && (
                <button onClick={advanceEscrow} className="btn-accent w-full">次のステップへ進める →</button>
              )}

              {/* Checklist */}
              <div>
                <h3 className="font-bold mb-2 flex items-center gap-2"><FileText className="h-4 w-4 text-navy-500" />現車確認チェックリスト</h3>
                <div className="grid grid-cols-2 gap-2">
                  {CHECKLIST_ITEMS.map((item, i) => (
                    <label key={item} className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition ${checklist[i] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                      <input type="checkbox" checked={checklist[i]} onChange={() => setChecklist(c => c.map((v, j) => j === i ? !v : v))} className="accent-emerald-500" />
                      <span className="text-sm font-medium">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Docs guide */}
              <div className="rounded-xl border border-slate-200">
                <button onClick={() => setDocsOpen(o => !o)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold">
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-navy-500" />名義変更書類ガイド</span>
                  {docsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {docsOpen && (
                  <div className="border-t border-slate-100 px-4 py-3 grid grid-cols-2 gap-2">
                    {REQUIRED_DOCS.map(d => (
                      <div key={d} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />{d}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dispute */}
              {myEscrow.status !== 'completed' && !disputeOpen && (
                <button onClick={() => setDisputeOpen(true)}
                  className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-bold">
                  <AlertTriangle className="h-4 w-4" />問題を報告する
                </button>
              )}
              {disputeOpen && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-red-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />問題を報告する</h3>
                    <button onClick={() => setDisputeOpen(false)}><X className="h-4 w-4 text-red-400" /></button>
                  </div>
                  <select className="input w-full" value={disputeReason} onChange={e => setDisputeReason(e.target.value)}>
                    <option value="">理由を選択してください</option>
                    <option value="no_show">現車確認に来ない</option>
                    <option value="payment">入金に問題がある</option>
                    <option value="condition">車両状態の相違</option>
                    <option value="docs">書類不備</option>
                    <option value="other">その他</option>
                  </select>
                  <textarea className="input w-full" rows={3} placeholder="詳細を入力してください" value={disputeDesc} onChange={e => setDisputeDesc(e.target.value)} />
                  <button onClick={() => { setDisputeOpen(false); notify('問題を報告しました。運営が確認します。'); }}
                    className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">報告する</button>
                </div>
              )}

              {/* Completed review form */}
              {myEscrow.status === 'completed' && (
                <div className="rounded-xl bg-emerald-50 p-4 space-y-3">
                  <div className="text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                    <p className="mt-2 font-black text-emerald-700">取引が完了しました！</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold mb-2">買主を評価する</p>
                    <div className="flex gap-1 mb-2">
                      {[1,2,3,4,5].map(s => (
                        <button key={s} onClick={() => setReviewRating(s)}
                          className={`text-2xl transition ${s <= reviewRating ? 'text-yellow-400' : 'text-slate-200'}`}>★</button>
                      ))}
                    </div>
                    <textarea className="input w-full" rows={2} placeholder="コメントを入力（任意）" value={reviewComment} onChange={e => setReviewComment(e.target.value)} />
                    <button onClick={() => notify('評価を送信しました！ありがとうございます。')} className="mt-2 btn-accent w-full text-sm">評価を送信する</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: LOAN ── */}
        {tab === 'loan' && (
          <div className="space-y-4">
            <h1 className="text-xl font-black">ローン申請</h1>

            {/* Existing loan status */}
            <div className="card p-4 flex items-center gap-3 border-l-4 border-amber-400">
              <CreditCard className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-600">審査中</p>
                <p className="font-black text-navy-800">¥1,950,000 / GMOクレジット</p>
                <p className="text-xs text-slate-400">申請日: 2026-06-28</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-600">審査中</span>
            </div>

            {/* Calculator */}
            <div className="card p-5 space-y-4">
              <h2 className="font-bold flex items-center gap-2"><Calculator className="h-4 w-4 text-navy-500" />ローンシミュレーター</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold mb-1">車両価格（円）</label>
                  <input type="number" className="input w-full" value={loanPrice} onChange={e => setLoanPrice(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">頭金（円）</label>
                  <input type="number" className="input w-full" value={loanDown} onChange={e => setLoanDown(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">金利（%）</label>
                  <input type="number" step="0.1" className="input w-full" value={loanRate} onChange={e => setLoanRate(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">返済期間</label>
                  <select className="input w-full" value={loanMonths} onChange={e => setLoanMonths(Number(e.target.value))}>
                    {[12,24,36,48,60].map(m => <option key={m} value={m}>{m}ヶ月</option>)}
                  </select>
                </div>
              </div>
              <div className="rounded-xl bg-navy-50 p-4 text-center space-y-1">
                <p className="text-xs text-slate-500">月額支払額</p>
                <p className="text-4xl font-black text-navy-700">{formatYen(monthly)}<span className="text-base font-bold">/月</span></p>
                <div className="flex justify-center gap-6 text-xs text-slate-500 mt-1">
                  <span>総支払額: <strong className="text-navy-700">{formatYen(totalPayment)}</strong></span>
                  <span>うち利息: <strong className="text-navy-700">{formatYen(totalInterest)}</strong></span>
                </div>
              </div>
            </div>

            {/* Finance company comparison */}
            <div className="card p-5 space-y-3">
              <h2 className="font-bold">ファイナンス会社比較</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="pb-2 text-left font-bold">会社</th>
                      <th className="pb-2 text-center font-bold">金利</th>
                      <th className="pb-2 text-center font-bold">審査時間</th>
                      <th className="pb-2 text-left font-bold">特徴</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {FINANCE_COMPANIES.map(fc => (
                      <tr key={fc.name}>
                        <td className="py-2.5 font-bold text-navy-800">{fc.name}</td>
                        <td className="py-2.5 text-center font-bold text-accent-600">{fc.rate}%</td>
                        <td className="py-2.5 text-center text-slate-600">{fc.time}</td>
                        <td className="py-2.5 text-slate-500">{fc.feature}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Application form */}
            {!loanApplied ? (
              <div className="card p-5 space-y-4">
                <h2 className="font-bold">ローン申請フォーム</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">氏名</label>
                    <input className="input w-full" placeholder="鈴木 一郎" value={loanName} onChange={e => setLoanName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">生年月日</label>
                    <input type="date" className="input w-full" value={loanDob} onChange={e => setLoanDob(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">年収</label>
                    <select className="input w-full" value={loanIncome} onChange={e => setLoanIncome(e.target.value)}>
                      <option value="">選択してください</option>
                      <option>300万円未満</option><option>300〜500万円</option>
                      <option>500〜700万円</option><option>700〜1000万円</option><option>1000万円以上</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">勤務形態</label>
                    <select className="input w-full" value={loanEmploy} onChange={e => setLoanEmploy(e.target.value)}>
                      <option value="">選択してください</option>
                      <option>正社員</option><option>契約社員</option><option>派遣社員</option><option>自営業</option><option>パート・アルバイト</option>
                    </select>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600">申請額</span>
                  <span className="font-black text-navy-800">{formatYen(principal)}</span>
                </div>
                <button onClick={() => setLoanApplied(true)} className="btn-accent w-full">申請する</button>
              </div>
            ) : (
              <div className="card p-5 text-center space-y-3">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                <p className="font-black text-emerald-700 text-lg">申請を受け付けました</p>
                <p className="text-sm text-slate-600">審査結果は1営業日以内にメールでお知らせします。</p>
                <button onClick={() => setLoanApplied(false)} className="btn-outline text-sm">別の申請をする</button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: SERVICES ── */}
        {tab === 'services' && (
          <div className="space-y-6">
            <h1 className="text-xl font-black">追加サービス</h1>

            {/* 査定 */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-navy-50 flex items-center justify-center"><Car className="h-5 w-5 text-navy-600" /></div>
                <div>
                  <h2 className="font-black">無料車両査定</h2>
                  <p className="text-xs text-slate-500">AIと専門家による無料相場査定</p>
                </div>
              </div>
              {!assessDone ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold mb-1">メーカー</label>
                      <select className="input w-full" value={assessMaker} onChange={e => setAssessMaker(e.target.value)}>
                        {MAKERS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">車種</label>
                      <input className="input w-full" placeholder="フォレスター" value={assessModel} onChange={e => setAssessModel(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">年式</label>
                      <input type="number" className="input w-full" placeholder="2020" value={assessYear} onChange={e => setAssessYear(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">走行距離（km）</label>
                      <input type="number" className="input w-full" placeholder="44100" value={assessKm} onChange={e => setAssessKm(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold mb-1">都道府県</label>
                      <select className="input w-full" value={assessPref} onChange={e => setAssessPref(e.target.value)}>
                        {PREFECTURES.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={() => setAssessDone(true)} className="btn-accent w-full">査定を依頼する</button>
                </>
              ) : (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">査定完了</span>
                    <p className="text-xs text-slate-500 font-bold">{assessMaker} {assessModel}</p>
                  </div>
                  <p className="text-2xl font-black text-emerald-700">¥1,820,000 〜 ¥2,050,000</p>
                  <p className="text-sm text-emerald-600 font-bold">相場より5%高め</p>
                  <button onClick={() => setAssessDone(false)} className="text-xs text-slate-500 hover:underline">再査定する</button>
                </div>
              )}
            </div>

            {/* 陸送 */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center"><Truck className="h-5 w-5 text-orange-600" /></div>
                <div>
                  <h2 className="font-black">陸送手配</h2>
                  <p className="text-xs text-slate-500">全国どこでも自宅まで配送</p>
                </div>
              </div>
              {!shippingOrdered ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold mb-1">出発地</label>
                      <select className="input w-full" value={shippingFrom} onChange={e => setShippingFrom(e.target.value)}>
                        {PREFECTURES.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">到着地</label>
                      <select className="input w-full" value={shippingTo} onChange={e => setShippingTo(e.target.value)}>
                        {PREFECTURES.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">希望日</label>
                      <input type="date" className="input w-full" value={shippingDate} onChange={e => setShippingDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-slate-600">概算見積</span>
                    <span className="font-black text-navy-800">¥45,000（{shippingFrom}→{shippingTo}）</span>
                  </div>
                  <button onClick={() => { setShippingOrdered(true); notify('陸送を手配しました。担当者から連絡が届きます。'); }} className="btn-accent w-full">手配を依頼する</button>
                </>
              ) : (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-2">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                  <p className="font-bold text-emerald-700">陸送を手配しました</p>
                  <p className="text-sm text-slate-500">{shippingFrom} → {shippingTo}</p>
                  <button onClick={() => setShippingOrdered(false)} className="text-xs text-slate-500 hover:underline">別の手配をする</button>
                </div>
              )}
            </div>

            {/* 延長保証 */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-accent-50 flex items-center justify-center"><ShieldCheck className="h-5 w-5 text-accent-600" /></div>
                <div>
                  <h2 className="font-black">延長保証</h2>
                  <p className="text-xs text-slate-500">購入後も安心の保証プラン</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {WARRANTY_PLANS.map(plan => (
                  <button key={plan.id} onClick={() => { setSelectedWarranty(plan.id); notify(`${plan.label}を申し込みました`); }}
                    className={`relative rounded-xl border-2 p-4 text-left transition ${selectedWarranty === plan.id ? 'border-navy-500 bg-navy-50' : 'border-slate-200 hover:border-navy-300'}`}>
                    {plan.recommended && <span className="absolute -top-2 right-3 rounded-full bg-accent-400 px-2 py-0.5 text-xs font-bold text-white">おすすめ</span>}
                    <p className="font-black text-navy-800 text-sm">{plan.label}</p>
                    <p className="text-lg font-black text-navy-700 mt-1">{formatYen(plan.price)}</p>
                    <p className="text-xs text-slate-500 mt-1">{plan.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 保険 */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center"><Award className="h-5 w-5 text-green-600" /></div>
                <div>
                  <h2 className="font-black">自動車保険案内</h2>
                  <p className="text-xs text-slate-500">最大20%割引の特別プラン</p>
                </div>
              </div>
              <div className="flex gap-4 flex-wrap">
                {['東京海上日動', '損保ジャパン', 'AXA損保'].map(name => (
                  <div key={name} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">{name}</div>
                ))}
              </div>
              <button onClick={() => notify('一括見積もりを依頼しました。各社から連絡が届きます。')} className="btn-accent w-full">一括見積もりを依頼</button>
            </div>
          </div>
        )}

        {/* ── TAB: MESSAGES ── */}
        {tab === 'messages' && (
          <div className="space-y-4">
            <h1 className="text-xl font-black">メッセージ</h1>
            {!selectedMessage ? (
              <div className="card divide-y divide-slate-100">
                {messages.map(m => (
                  <button key={m.id} onClick={() => setSelectedMessage(m)}
                    className="flex w-full items-start gap-3 p-4 text-left hover:bg-slate-50 transition">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">{m.other_user[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-bold">{m.other_user}</p>
                        <p className="text-xs text-slate-400">{m.updated_at}</p>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{m.listing}</p>
                      <p className={`text-sm truncate ${m.unread > 0 ? 'font-bold text-navy-800' : 'text-slate-500'}`}>{m.last_message}</p>
                    </div>
                    {m.unread > 0 && <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">{m.unread}</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="card p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedMessage(null)} className="text-slate-400 hover:text-slate-600">← 戻る</button>
                  <h2 className="font-bold">{selectedMessage.other_user}</h2>
                  <span className="text-xs text-slate-400">{selectedMessage.listing}</span>
                </div>
                <div className="h-64 overflow-y-auto space-y-3 rounded-lg bg-slate-50 p-4">
                  <div className="flex justify-end">
                    <div className="rounded-xl rounded-br-sm bg-navy-600 px-4 py-2 text-sm text-white max-w-xs">はじめまして。出品中の車を見ました。</div>
                  </div>
                  <div className="flex justify-start">
                    <div className="rounded-xl rounded-bl-sm bg-white border border-slate-200 px-4 py-2 text-sm max-w-xs">{selectedMessage.last_message}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="メッセージを入力…" className="input flex-1" value={replyText} onChange={e => setReplyText(e.target.value)} />
                  <button onClick={() => { notify('送信しました'); setReplyText(''); }} className="btn-accent shrink-0">送信</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: FAVORITES ── */}
        {tab === 'favorites' && (
          <div className="space-y-4">
            <h1 className="text-xl font-black">お気に入り</h1>
            <div className="grid gap-3 sm:grid-cols-2">
              {favorites.map(f => (
                <div key={f.id} className="card flex items-start gap-3 p-4">
                  <div className="h-16 w-20 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                    <Package className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-bold text-sm">{f.title}</h2>
                    <p className="text-navy-600 font-black">{formatYen(f.price)}</p>
                    <p className="text-xs text-slate-400">{f.prefecture} / {f.mileage_km.toLocaleString()}km</p>
                  </div>
                  <button onClick={() => { setFavorites(fv => fv.filter(x => x.id !== f.id)); notify('お気に入りを解除しました'); }}
                    className="text-red-400 hover:text-red-600">
                    <Heart className="h-5 w-5 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: PROFILE ── */}
        {tab === 'profile' && (
          <div className="space-y-4">
            <h1 className="text-xl font-black">プロフィール設定</h1>
            <div className="card p-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold">表示名</label>
                <input className="input w-full" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold">自己紹介</label>
                <textarea className="input w-full" rows={3} value={bio} onChange={e => setBio(e.target.value)} />
              </div>
              <button onClick={() => notify('プロフィールを保存しました')} className="btn-accent">保存する</button>
            </div>

            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">電話番号認証</h2>
                {phoneVerified && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">認証済み ✓</span>}
              </div>
              {!phoneVerified && !otpSent && (
                <div className="flex gap-2">
                  <input type="tel" placeholder="090-0000-0000" className="input flex-1" value={phone} onChange={e => setPhone(e.target.value)} />
                  <button onClick={() => { setOtpSent(true); notify('認証コードを送信しました（DEMO: 123456）'); }} className="btn-accent shrink-0">送信</button>
                </div>
              )}
              {!phoneVerified && otpSent && (
                <div className="space-y-2">
                  <p className="text-sm text-amber-600 rounded bg-amber-50 px-3 py-2">デモ認証コード: <strong>123456</strong></p>
                  <div className="flex gap-2">
                    <input type="text" placeholder="6桁のコード" maxLength={6} className="input flex-1 font-mono text-lg tracking-widest" value={otpCode} onChange={e => setOtpCode(e.target.value)} />
                    <button onClick={() => { if (otpCode === '123456') { setPhoneVerified(true); notify('電話番号認証が完了しました'); } else { notify('コードが違います'); } }} className="btn-accent shrink-0">確認</button>
                  </div>
                </div>
              )}
            </div>

            <div className="card p-5">
              <h2 className="mb-3 font-bold">受け取った評価</h2>
              {[
                { from: '青木 隆', rating: 5, comment: '丁寧な対応でとても良い取引でした。またお願いしたいです。', date: '2026-06-12' },
                { from: '渡辺 浩二', rating: 5, comment: '車の状態も説明通りで安心して購入できました。', date: '2026-05-25' },
              ].map((r, i) => (
                <div key={i} className="border-b border-slate-100 py-3 last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm">{r.from}</p>
                    <span className="text-yellow-500">{'★'.repeat(r.rating)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{r.comment}</p>
                  <p className="text-xs text-slate-400 mt-1">{r.date}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
