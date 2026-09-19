'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, ShieldCheck, Ban, Flag, MessageSquare } from 'lucide-react';
import { formatYen } from '@/lib/format';

// デモ: 特定会話のメッセージ詳細
const DEMO_DETAIL: Record<string, {
  conv: { listing_title: string; maker: string; model: string; price: number; buyer_name: string; seller_name: string; status: string; flagged_reason: string | null };
  messages: { id: string; sender: 'buyer' | 'seller'; body: string; at: string; flagged: boolean }[];
}> = {
  'c-002': {
    conv: { listing_title: '日産 セレナ 2023年', maker: '日産', model: 'セレナ', price: 3450000, buyer_name: '渡辺 浩二', seller_name: '佐藤 花子', status: 'flagged', flagged_reason: '外部決済誘導の疑い' },
    messages: [
      { id: 'm-1', sender: 'buyer', body: 'こんにちは！セレナに興味があります。現車確認は可能ですか？', at: '2026-07-01 08:00', flagged: false },
      { id: 'm-2', sender: 'seller', body: 'ありがとうございます。週末なら対応可能です。お気軽にどうぞ。', at: '2026-07-01 08:15', flagged: false },
      { id: 'm-3', sender: 'buyer', body: '345万円は少し高いのですが、交渉できますか？', at: '2026-07-01 08:30', flagged: false },
      { id: 'm-4', sender: 'seller', body: '330万円まで下げられます。いかがでしょうか。', at: '2026-07-01 08:45', flagged: false },
      { id: 'm-5', sender: 'buyer', body: '330万円で購入します！決済方法はどうしましょうか？', at: '2026-07-01 09:00', flagged: false },
      { id: 'm-6', sender: 'seller', body: '実は、BUYMOのエスクローを使わずに直接私の口座に振り込んでいただけますか？手数料を省けます。口座番号を教えていただけますか？', at: '2026-07-01 09:10', flagged: true },
      { id: 'm-7', sender: 'buyer', body: 'BUYMOエスクロー外で払います、口座番号を教えていただけますか？', at: '2026-07-01 09:15', flagged: true },
    ],
  },
  'c-005': {
    conv: { listing_title: 'ホンダ フィット 2021年', maker: 'ホンダ', model: 'フィット', price: 1680000, buyer_name: '高橋 美咲', seller_name: '伊藤 健司', status: 'flagged', flagged_reason: 'ユーザー通報: 詐欺の疑い' },
    messages: [
      { id: 'm-1', sender: 'buyer', body: 'フィットの件でメッセージします', at: '2026-06-28 15:00', flagged: false },
      { id: 'm-2', sender: 'seller', body: '写真は後で送ります。まず100万円を手付金として振り込んでください', at: '2026-06-28 15:30', flagged: true },
      { id: 'm-3', sender: 'buyer', body: '【通報】詐欺の疑いがあります。この会話を本部に報告しました。', at: '2026-06-28 16:05', flagged: false },
    ],
  },
};

const DEFAULT_DETAIL = {
  conv: { listing_title: 'トヨタ プリウス 2022年', maker: 'トヨタ', model: 'プリウス', price: 2480000, buyer_name: '青木 隆', seller_name: '田中 太郎', status: 'active', flagged_reason: null },
  messages: [
    { id: 'm-1', sender: 'buyer' as const, body: 'こんにちは！プリウスに興味があります。まだ売却可能ですか？', at: '2026-07-02 12:00', flagged: false },
    { id: 'm-2', sender: 'seller' as const, body: 'はい、まだ出品中です！何かご質問はありますか？', at: '2026-07-02 12:10', flagged: false },
    { id: 'm-3', sender: 'buyer' as const, body: '走行距離は15,200kmとのことですが、整備記録はありますか？', at: '2026-07-02 12:30', flagged: false },
    { id: 'm-4', sender: 'seller' as const, body: 'はい、ディーラーでの定期点検記録が全て揃っています。禁煙車で大切に乗っていました。', at: '2026-07-02 13:00', flagged: false },
    { id: 'm-5', sender: 'buyer' as const, body: '週末に現車確認できますか？土曜午後はどうでしょう', at: '2026-07-02 14:32', flagged: false },
  ],
};

export default function AdminMessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const convId = use(params).id;
  const data = DEMO_DETAIL[convId] ?? DEFAULT_DETAIL;
  const { conv, messages } = data;

  const [action, setAction] = useState<'warn' | 'suspend' | null>(null);
  const [target, setTarget] = useState<'buyer' | 'seller'>('seller');
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function doAction() {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 1000));
    const label = action === 'warn' ? '警告を送信しました' : 'アカウントを停止しました';
    setActionDone(`${target === 'buyer' ? conv.buyer_name : conv.seller_name} に${label}`);
    setAction(null);
    setProcessing(false);
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <Link href="/admin/messages" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> チャット監視一覧
      </Link>

      {/* 会話情報 */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h1 className="text-lg font-black text-navy-800">{conv.listing_title}</h1>
            <p className="text-sm text-slate-500">{formatYen(conv.price)}</p>
          </div>
          {conv.status === 'flagged' && (
            <div className="flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-sm font-bold text-red-700 flex-shrink-0">
              <AlertTriangle className="h-4 w-4" />
              {conv.flagged_reason}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-400 mb-0.5">買主</p>
            <p className="font-bold text-navy-800">{conv.buyer_name}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-400 mb-0.5">売主</p>
            <p className="font-bold text-navy-800">{conv.seller_name}</p>
          </div>
        </div>
      </div>

      {/* アクション完了通知 */}
      {actionDone && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-emerald-700">
          <ShieldCheck className="h-5 w-5 flex-shrink-0" />
          <p className="font-bold">{actionDone}</p>
        </div>
      )}

      {/* 管理アクション */}
      <div className="card p-4">
        <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Flag className="h-4 w-4 text-slate-400" />管理アクション
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setTarget('seller'); setAction('warn'); }}
            className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> 売主に警告
          </button>
          <button
            onClick={() => { setTarget('buyer'); setAction('warn'); }}
            className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> 買主に警告
          </button>
          <button
            onClick={() => { setTarget('seller'); setAction('suspend'); }}
            className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
          >
            <Ban className="h-3.5 w-3.5" /> 売主を停止
          </button>
          <button
            onClick={() => { setTarget('buyer'); setAction('suspend'); }}
            className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
          >
            <Ban className="h-3.5 w-3.5" /> 買主を停止
          </button>
        </div>
      </div>

      {/* メッセージ一覧（読み取り専用） */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-slate-400" />
          <span className="font-bold text-slate-700">メッセージ ({messages.length}件) — 読み取り専用</span>
          <span className="ml-auto text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">本部閲覧モード</span>
        </div>
        <div className="divide-y divide-slate-50">
          {messages.map(m => (
            <div
              key={m.id}
              className={`p-4 ${m.flagged ? 'bg-red-50/50 border-l-4 border-l-red-400' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    m.sender === 'buyer'
                      ? 'bg-navy-100 text-navy-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {m.sender === 'buyer' ? `買主: ${conv.buyer_name}` : `売主: ${conv.seller_name}`}
                </span>
                <span className="text-xs text-slate-400">{m.at}</span>
                {m.flagged && (
                  <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                    <AlertTriangle className="h-3 w-3" /> 要確認
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-800 leading-relaxed">{m.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 確認ダイアログ */}
      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !processing && setAction(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-2">
              {action === 'warn'
                ? <AlertTriangle className="h-6 w-6 text-amber-500" />
                : <Ban className="h-6 w-6 text-red-500" />}
              <h3 className="text-lg font-black text-navy-800">
                {target === 'buyer' ? conv.buyer_name : conv.seller_name} を
                {action === 'warn' ? '警告' : '停止'}
              </h3>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              {action === 'warn'
                ? 'ユーザーに警告メールを送信し、違反履歴に記録します。'
                : 'アカウントを一時停止し、ログインできなくなります。解除は管理者のみ可能です。'}
            </p>
            <div className="space-y-2">
              <button onClick={doAction} disabled={processing}
                className={`w-full rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 ${
                  action === 'warn' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'
                }`}>
                {processing ? '処理中...' : action === 'warn' ? '警告を送信' : 'アカウントを停止'}
              </button>
              <button onClick={() => setAction(null)} disabled={processing}
                className="w-full py-2 text-sm text-slate-400 hover:text-slate-600">キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
