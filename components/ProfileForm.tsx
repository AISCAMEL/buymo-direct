'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PREFECTURES } from '@/lib/constants';
import type { Profile } from '@/lib/types';

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: String(fd.get('display_name')).trim() || '名無しユーザー',
        prefecture: String(fd.get('prefecture')) || null,
        bio: String(fd.get('bio')) || null,
      })
      .eq('id', profile.id);
    if (error) setError(error.message);
    else {
      setDone(true);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <div>
        <label className="label">表示名</label>
        <input name="display_name" required className="input" defaultValue={profile.display_name} />
      </div>
      <div>
        <label className="label">地域</label>
        <select name="prefecture" className="input" defaultValue={profile.prefecture ?? ''}>
          <option value="">未設定</option>
          {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className="label">自己紹介</label>
        <textarea name="bio" rows={4} className="input" defaultValue={profile.bio ?? ''} placeholder="取引方針や得意な車種など" />
      </div>
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      {done && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">保存しました。</p>}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} プロフィールを保存
      </button>
    </form>
  );
}
