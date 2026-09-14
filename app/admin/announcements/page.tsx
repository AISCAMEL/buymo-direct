'use client';

import { useState } from 'react';
import { Pin, PinOff, Trash2, Megaphone, AlertTriangle, Info } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import type { Announcement, AnnouncementLevel } from '@/lib/types';

const LEVEL_LABEL: Record<AnnouncementLevel, string> = { info: 'お知らせ', warning: '注意', important: '重要' };
const LEVEL_CLS: Record<AnnouncementLevel, string> = {
  info: 'bg-navy-50 text-navy-600',
  warning: 'bg-amber-100 text-amber-700',
  important: 'bg-red-100 text-red-700',
};
const LEVEL_ICON: Record<AnnouncementLevel, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  important: Megaphone,
};

const DEMO_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'ゴールデンウィーク期間中のサポート対応について',
    body: '4月27日〜5月6日はサポート対応が遅延する場合がございます。お急ぎのお客様はチャットよりご連絡ください。',
    level: 'warning',
    pinned: true,
    published: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ann-2',
    title: '【重要】本人確認（eKYC）の必須化について',
    body: '2026年6月1日より、出品・購入ともに本人確認の完了が必須となります。早めのお手続きをお願いいたします。',
    level: 'important',
    pinned: true,
    published: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ann-3',
    title: '車両ローン申込機能をリリースしました',
    body: 'BUYMO提携ローンのお申し込みがアプリ内から可能になりました。最短即日審査・最長120回払いに対応しています。',
    level: 'info',
    pinned: false,
    published: true,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ann-4',
    title: 'システムメンテナンスのお知らせ（5/15 2:00〜4:00）',
    body: '5月15日深夜2時〜4時にかけてシステムメンテナンスを実施します。この時間帯はご利用いただけません。',
    level: 'warning',
    pinned: false,
    published: true,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ann-5',
    title: '【下書き】新機能：AIバリュエーションについて',
    body: 'AIが市場データをもとに適正価格を自動算出する機能を近日公開予定です。',
    level: 'info',
    pinned: false,
    published: false,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>(DEMO_ANNOUNCEMENTS);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [level, setLevel] = useState<AnnouncementLevel>('info');
  const [pinned, setPinned] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const published = items.filter(a => a.published);
  const unpublished = items.filter(a => !a.published);
  const pinnedCount = items.filter(a => a.pinned && a.published).length;

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const newItem: Announcement = {
      id: `ann-${Date.now()}`,
      title: title.trim(),
      body: body.trim(),
      level,
      pinned,
      published: true,
      created_at: new Date().toISOString(),
    };
    setItems(prev => [newItem, ...prev]);
    setTitle('');
    setBody('');
    setLevel('info');
    setPinned(false);
  }

  function togglePublished(id: string) {
    setItems(prev => prev.map(a => a.id === id ? { ...a, published: !a.published } : a));
  }

  function togglePinned(id: string) {
    setItems(prev => prev.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a));
  }

  function handleDelete(id: string) {
    setItems(prev => prev.filter(a => a.id !== id));
    setDeleteId(null);
  }

  return (
    <div className="space-y-6">
      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        {[
          { label: '公開中', value: published.length, cls: 'text-emerald-600' },
          { label: '非公開（下書き）', value: unpublished.length, cls: 'text-slate-500' },
          { label: 'バナー固定中', value: pinnedCount, cls: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 作成フォーム */}
      <form onSubmit={handleCreate} className="card space-y-3 p-5">
        <h2 className="font-black">お知らせを作成</h2>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="input"
          placeholder="タイトル"
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          required
          rows={3}
          className="input"
          placeholder="本文"
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm">
            <span className="mr-2 font-bold text-slate-700">種別</span>
            <select
              value={level}
              onChange={e => setLevel(e.target.value as AnnouncementLevel)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="info">お知らせ</option>
              <option value="warning">注意</option>
              <option value="important">重要</option>
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={pinned}
              onChange={e => setPinned(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            上部バナーに表示
          </label>
          <button type="submit" className="btn-accent ml-auto">公開する</button>
        </div>
      </form>

      {/* 一覧 */}
      <div>
        <h2 className="mb-3 text-lg font-black">お知らせ一覧（{items.length}）</h2>
        {items.length === 0 ? (
          <p className="card p-8 text-center text-sm text-slate-500">お知らせはありません。</p>
        ) : (
          <ul className="space-y-2">
            {items.map(a => {
              const Icon = LEVEL_ICON[a.level];
              return (
                <li key={a.id} className={`card p-4 ${!a.published ? 'opacity-60' : ''}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className={`mt-0.5 rounded-full p-1.5 ${LEVEL_CLS[a.level]}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold">
                          <span className={`badge mr-2 ${LEVEL_CLS[a.level]}`}>{LEVEL_LABEL[a.level]}</span>
                          {a.title}
                          {a.pinned && <span className="badge ml-2 bg-amber-100 text-amber-700">バナー固定</span>}
                          {!a.published && <span className="badge ml-2 bg-slate-200 text-slate-500">非公開</span>}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.body}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDateTime(a.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => togglePinned(a.id)}
                        title={a.pinned ? 'バナー固定を解除' : 'バナーに固定'}
                        className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50"
                      >
                        {a.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => togglePublished(a.id)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        {a.published ? '非公開にする' : '公開する'}
                      </button>
                      <button
                        onClick={() => setDeleteId(a.id)}
                        className="rounded-md border border-red-300 p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 削除確認モーダル */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-sm space-y-4 p-6">
            <h3 className="font-black text-red-700">お知らせを削除しますか？</h3>
            <p className="text-sm text-slate-600">この操作は元に戻せません。</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="btn-outline">キャンセル</button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
