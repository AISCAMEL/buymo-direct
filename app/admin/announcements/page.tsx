import { Pin, PinOff, Trash2, Megaphone, AlertTriangle, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';
import {
  adminCreateAnnouncement, adminSetAnnouncementPublished, adminSetAnnouncementPinned, adminDeleteAnnouncement,
} from '@/app/admin/actions';
import type { Announcement, AnnouncementLevel } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LEVEL_LABEL: Record<AnnouncementLevel, string> = { info: 'お知らせ', warning: '注意', important: '重要' };
const LEVEL_CLS: Record<AnnouncementLevel, string> = {
  info: 'bg-navy-50 text-navy-600',
  warning: 'bg-amber-100 text-amber-700',
  important: 'bg-red-100 text-red-700',
};
const LEVEL_ICON: Record<AnnouncementLevel, React.ElementType> = { info: Info, warning: AlertTriangle, important: Megaphone };

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('announcements')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });
  const items = (data ?? []) as Announcement[];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black">お知らせの管理（{items.length}）</h1>

      {/* 新規作成 */}
      <form action={adminCreateAnnouncement} className="card space-y-3 p-5">
        <h2 className="font-bold text-slate-700">新規お知らせ</h2>
        <input name="title" required placeholder="タイトル" className="input" />
        <textarea name="body" required placeholder="本文" rows={3} className="input" />
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm">
            <span className="mr-2 text-slate-500">種別</span>
            <select name="level" className="input inline-block w-auto">
              <option value="info">お知らせ</option>
              <option value="warning">注意</option>
              <option value="important">重要</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="pinned" className="h-4 w-4 rounded border-slate-300" />
            上部にピン留め
          </label>
          <button className="btn-accent ml-auto px-6">公開する</button>
        </div>
      </form>

      {items.length === 0 ? (
        <p className="card p-8 text-center text-sm text-slate-500">お知らせはありません。</p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => {
            const Icon = LEVEL_ICON[a.level];
            return (
              <li key={a.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      {a.pinned && <Pin className="h-3.5 w-3.5 text-accent-600" />}
                      <span className={`badge flex items-center gap-1 ${LEVEL_CLS[a.level]}`}>
                        <Icon className="h-3 w-3" />{LEVEL_LABEL[a.level]}
                      </span>
                      {a.title}
                      {!a.published && <span className="badge bg-slate-100 text-slate-500">非公開</span>}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(a.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <form action={adminSetAnnouncementPinned.bind(null, a.id, !a.pinned)}>
                      <button className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" title={a.pinned ? 'ピン解除' : 'ピン留め'}>
                        {a.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </button>
                    </form>
                    <form action={adminSetAnnouncementPublished.bind(null, a.id, !a.published)}>
                      <button className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">
                        {a.published ? '非公開に' : '公開する'}
                      </button>
                    </form>
                    <form action={adminDeleteAnnouncement.bind(null, a.id)}>
                      <button className="rounded-md border border-red-200 p-2 text-red-500 hover:bg-red-50" title="削除">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
