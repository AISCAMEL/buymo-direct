import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getViewerAccess } from '@/lib/viewer';
import { createPost } from '@/app/community/actions';
import { COMMUNITY_POST_CATEGORIES } from '@/lib/community';

export const dynamic = 'force-dynamic';

export default async function NewPostPage() {
  const access = await getViewerAccess();
  if (!access.businessTrack) redirect('/community');

  return (
    <div className="mx-auto max-w-xl space-y-4 py-6">
      <Link href="/community" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> コミュニティへ
      </Link>
      <h1 className="text-2xl font-black">投稿する</h1>
      <form action={createPost} className="card space-y-4 p-6">
        <div>
          <label className="label">カテゴリー</label>
          <select name="category" className="input" defaultValue="beginner">
            {COMMUNITY_POST_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">タイトル *</label>
          <input name="title" required className="input" placeholder="例）はじめての買取、査定で気をつけることは？" />
        </div>
        <div>
          <label className="label">本文</label>
          <textarea name="body" rows={6} className="input" placeholder="困っていること・聞きたいことを具体的にどうぞ。外部連絡先は書かないでください。" />
        </div>
        <p className="text-xs text-slate-400">※ 誹謗中傷・個人情報・外部連絡先の書き込みは禁止です（自動で保護されます）。</p>
        <button type="submit" className="btn-accent w-full">投稿する</button>
      </form>
    </div>
  );
}
