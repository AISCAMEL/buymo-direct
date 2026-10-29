'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Loader2, FlaskConical, Copy, Check, Trash2, ExternalLink } from 'lucide-react';
import { seedTestPurchase, cleanupTestListing, type SeededResult } from '@/app/admin/test-actions';

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-sm">
      <span className="shrink-0 text-xs font-bold text-slate-500">{label}</span>
      <code className="min-w-0 flex-1 truncate text-right text-navy-800">{value}</code>
      <button
        type="button"
        onClick={() => { navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }, () => {}); }}
        className="shrink-0 text-slate-400 hover:text-navy-600"
        aria-label="コピー"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function TestFlowPanel() {
  const [buyerEmail, setBuyerEmail] = useState('buymocars+buyer@gmail.com');
  const [sellerEmail, setSellerEmail] = useState('buymocars+seller@gmail.com');
  const [price, setPrice] = useState(300000);
  const [result, setResult] = useState<SeededResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cleaning, startCleanup] = useTransition();
  const [cleaned, setCleaned] = useState(false);

  function create() {
    setError(null); setResult(null); setCleaned(false);
    startTransition(async () => {
      const res = await seedTestPurchase({ buyerEmail, sellerEmail, price });
      if (res.error) { setError(res.error); return; }
      setResult(res);
    });
  }

  function cleanup() {
    if (!result?.listingId) return;
    startCleanup(async () => {
      const res = await cleanupTestListing(result.listingId!);
      if (res.error) { setError(res.error); return; }
      setCleaned(true); setResult(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="flex items-center gap-1.5 font-bold text-navy-800">
          <FlaskConical className="h-4 w-4 text-navy-500" /> テストシナリオを作成
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          実データで「テスト買主・売主アカウント＋テスト出品＋会話」を作成します。作成後、別ブラウザで買主としてログインし、購入フローを最後まで通せます。
        </p>
        <div className="mt-1 rounded-lg bg-accent-50 px-3 py-2 text-[11px] text-accent-700">
          💡 Gmailの「+エイリアス」を使うと、買主・売主宛のメールが<b>すべて同じ受信箱</b>に届きます（例：<code>buymocars+buyer@gmail.com</code> と <code>buymocars+seller@gmail.com</code> はどちらも <code>buymocars@gmail.com</code> に届く）。これで取引メールをまとめて確認できます。
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold text-slate-500">買主メール</span>
            <input className="input mt-1" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} autoComplete="off" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500">売主メール</span>
            <input className="input mt-1" value={sellerEmail} onChange={(e) => setSellerEmail(e.target.value)} autoComplete="off" />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500">テスト車両の価格（円）</span>
            <input type="number" className="input mt-1" value={price} min={10000} onChange={(e) => setPrice(Number(e.target.value))} />
            <span className="mt-0.5 block text-[11px] text-slate-400">カード決済は上限あり。カードも試すなら30万円以下を推奨。</span>
          </label>
        </div>

        <button type="button" onClick={create} disabled={pending} className="btn-accent mt-3 inline-flex items-center gap-1.5 disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />} テストシナリオを作成
        </button>
        {error && <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
        {cleaned && <p className="mt-2 rounded bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">テストデータを削除しました。</p>}
      </div>

      {result && (
        <div className="card space-y-4 p-5">
          <h2 className="font-bold text-navy-800">✅ テストシナリオを作成しました</h2>

          <div>
            <p className="mb-1 text-xs font-bold text-slate-500">テストアカウント（ログイン情報）</p>
            <div className="space-y-1.5 rounded-xl bg-slate-50 p-2.5">
              <p className="text-[11px] font-black text-navy-700">🛒 買主</p>
              <CopyField label="メール" value={result.buyer!.email} />
              <CopyField label="パスワード" value={result.buyer!.password} />
              <p className="mt-2 text-[11px] font-black text-navy-700">🚗 売主</p>
              <CopyField label="メール" value={result.seller!.email} />
              <CopyField label="パスワード" value={result.seller!.password} />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">※ パスワードはこの画面でのみ表示されます。作成するたびに再発行されます。</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/listings/${result.listingId}`} target="_blank" className="btn-outline inline-flex items-center gap-1 py-2 text-sm">
              <ExternalLink className="h-3.5 w-3.5" /> テスト出品を見る
            </Link>
            <Link href={`/messages/${result.conversationId}`} target="_blank" className="btn-outline inline-flex items-center gap-1 py-2 text-sm">
              <ExternalLink className="h-3.5 w-3.5" /> 会話（買主⇄売主）
            </Link>
          </div>

          <div className="rounded-xl border border-navy-200 bg-navy-50/50 p-3 text-sm">
            <p className="mb-1.5 font-black text-navy-800">テスト手順</p>
            <ol className="list-decimal space-y-1 pl-5 text-slate-700">
              <li><b>別のブラウザ（またはシークレットウィンドウ）</b>で <Link href="/login" target="_blank" className="text-accent-600 underline">ログイン</Link> → 上の<b>買主</b>のメール／パスワードでログイン</li>
              <li>上の「会話（買主⇄売主）」を開き、<b>「購入手続きへ」</b>を押す → エスクロー取引が開始</li>
              <li>名義変更オプションと支払い方法を選ぶ：<br/>・<b>銀行振込</b>→「振込みました」（実課金なし）<br/>・<b>カード</b>→Squareで決済（本番キーなら実課金・サンドボックスならテストカード）</li>
              <li>この管理アカウント（本部）で <Link href="/admin/escrow" className="text-accent-600 underline">取引監視</Link> → 銀行振込なら<b>「入金を確認して保全する」</b></li>
              <li>現車確認 → 名義変更 → <b>買主が「取引を完了して送金」</b>で完了（出品は成約済みに）</li>
              <li>各段階で<b>進捗タイムライン</b>から報告 → 相手にメール＋通知が届くか確認</li>
              <li>受信箱（Gmail）で取引メールが届くか、通知ベルで通知が出るか確認</li>
            </ol>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <button type="button" onClick={cleanup} disabled={cleaning} className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">
              {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} このテストデータを削除する
            </button>
            <p className="mt-1 text-[11px] text-slate-400">テスト出品・会話・取引・進捗イベントを削除します（アカウントは残ります）。</p>
          </div>
        </div>
      )}
    </div>
  );
}
