'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, AlertTriangle, Eye, Search, Filter } from 'lucide-react';

type ConvStatus = 'active' | 'flagged' | 'resolved';

type DemoConv = {
  id: string;
  listing_title: string;
  maker: string;
  model: string;
  buyer_name: string;
  seller_name: string;
  last_message: string;
  last_message_at: string;
  message_count: number;
  status: ConvStatus;
  flagged_reason: string | null;
};

const DEMO_CONVS: DemoConv[] = [
  { id: 'c-001', listing_title: 'トヨタ プリウス 2022年', maker: 'トヨタ', model: 'プリウス', buyer_name: '青木 隆', seller_name: '田中 太郎', last_message: '週末に現車確認できますか？土曜午後はどうでしょう', last_message_at: '2026-07-02 14:32', message_count: 12, status: 'active', flagged_reason: null },
  { id: 'c-002', listing_title: '日産 セレナ 2023年', maker: '日産', model: 'セレナ', buyer_name: '渡辺 浩二', seller_name: '佐藤 花子', last_message: '口座番号を教えていただけますか？BUYMOエスクロー外で払います', last_message_at: '2026-07-01 09:15', message_count: 8, status: 'flagged', flagged_reason: '外部決済誘導の疑い' },
  { id: 'c-003', listing_title: 'スバル フォレスター 2020年', maker: 'スバル', model: 'フォレスター', buyer_name: '加藤 由美', seller_name: '鈴木 一郎', last_message: '価格200万円からもう少し下げていただけませんか', last_message_at: '2026-06-30 18:45', message_count: 5, status: 'active', flagged_reason: null },
  { id: 'c-004', listing_title: 'マツダ CX-5 2022年', maker: 'マツダ', model: 'CX-5', buyer_name: '中島 良介', seller_name: '山田 健', last_message: '写真を追加送付します。気に入っていただければ幸いです', last_message_at: '2026-06-29 11:20', message_count: 19, status: 'active', flagged_reason: null },
  { id: 'c-005', listing_title: 'ホンダ フィット 2021年', maker: 'ホンダ', model: 'フィット', buyer_name: '高橋 美咲', seller_name: '伊藤 健司', last_message: '詐欺の疑いがあります', last_message_at: '2026-06-28 16:05', message_count: 3, status: 'flagged', flagged_reason: 'ユーザー通報: 詐欺の疑い' },
  { id: 'c-006', listing_title: 'レクサス RX 2021年', maker: 'レクサス', model: 'RX', buyer_name: '松本 勇', seller_name: '小林 明美', last_message: '成約しました。ありがとうございました！', last_message_at: '2026-06-25 10:00', message_count: 31, status: 'resolved', flagged_reason: null },
];

const STATUS_CONFIG: Record<ConvStatus, { label: string; cls: string }> = {
  active:   { label: '通常',   cls: 'text-slate-600 bg-slate-100' },
  flagged:  { label: '🚨 要確認', cls: 'text-red-700 bg-red-50 border border-red-200' },
  resolved: { label: '解決済', cls: 'text-emerald-700 bg-emerald-50' },
};

export default function AdminMessagesPage() {
  const [convs, setConvs] = useState<DemoConv[]>(DEMO_CONVS);
  const [filter, setFilter] = useState<ConvStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const flagged = convs.filter(c => c.status === 'flagged').length;

  const filtered = convs.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.buyer_name.includes(q) || c.seller_name.includes(q) || c.model.toLowerCase().includes(q) || c.last_message.includes(q);
    }
    return true;
  });

  function resolve(id: string) {
    setConvs(prev => prev.map(c => c.id === id ? { ...c, status: 'resolved' as ConvStatus } : c));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-navy-500" />
          <h1 className="text-2xl font-black">チャット監視</h1>
        </div>
        {flagged > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-sm font-bold text-red-700">
            <AlertTriangle className="h-4 w-4" />
            要確認 {flagged}件
          </div>
        )}
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '全会話', count: convs.length, cls: 'text-navy-700 bg-navy-50' },
          { label: '要確認', count: convs.filter(c => c.status === 'flagged').length, cls: 'text-red-700 bg-red-50' },
          { label: '解決済', count: convs.filter(c => c.status === 'resolved').length, cls: 'text-emerald-700 bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 text-center ${s.cls}`}>
            <p className="text-3xl font-black">{s.count}</p>
            <p className="text-sm font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* フィルター + 検索 */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="input pl-9 text-sm"
            placeholder="ユーザー名・車種・メッセージで検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'flagged', 'active', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                filter === f ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? 'すべて' : f === 'flagged' ? '🚨 要確認' : f === 'active' ? '通常' : '解決済'}
            </button>
          ))}
        </div>
      </div>

      {/* 会話一覧 */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {['会話・車両', '当事者', '最終メッセージ', '件数', 'ステータス', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(c => {
              const st = STATUS_CONFIG[c.status];
              return (
                <tr key={c.id} className={`hover:bg-slate-50 ${c.status === 'flagged' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="font-bold text-navy-800 truncate">{c.listing_title}</p>
                    {c.flagged_reason && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="h-3 w-3" />{c.flagged_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs"><span className="text-slate-400">買</span> {c.buyer_name}</p>
                    <p className="text-xs"><span className="text-slate-400">売</span> {c.seller_name}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="truncate text-slate-700">{c.last_message}</p>
                    <p className="text-xs text-slate-400">{c.last_message_at}</p>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-600">{c.message_count}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Link
                        href={`/admin/messages/${c.id}`}
                        className="flex items-center gap-1 rounded-lg bg-navy-700 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-navy-800"
                      >
                        <Eye className="h-3.5 w-3.5" /> 閲覧
                      </Link>
                      {c.status === 'flagged' && (
                        <button
                          onClick={() => resolve(c.id)}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          解決
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">該当する会話はありません</div>
        )}
      </div>
    </div>
  );
}
