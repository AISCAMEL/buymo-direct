'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookmarkPlus, Check, Loader2 } from 'lucide-react';
import { saveSearch } from '@/app/searches/actions';
import { describeSearch } from '@/lib/search';

export function SaveSearchButton({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onClick() {
    const obj: Record<string, string> = {};
    params.forEach((v, k) => { obj[k] = v; });

    if (!loggedIn) {
      router.push('/login?redirect=/listings');
      return;
    }
    const name = window.prompt('保存する検索の名前', describeSearch(obj));
    if (name === null) return;

    setBusy(true);
    const res = await saveSearch(name, obj);
    setBusy(false);
    if (res.error) {
      alert(res.error);
      return;
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4 text-emerald-500" /> : <BookmarkPlus className="h-4 w-4" />}
      {done ? '保存しました' : '条件を保存'}
    </button>
  );
}
