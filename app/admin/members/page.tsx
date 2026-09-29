import { Crown } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';
import { adminDecideMembership, adminSetMemberTier } from '@/app/admin/actions';

export const dynamic = 'force-dynamic';

type App = { id: string; status: string; created_at: string; user_id: string; user?: { display_name: string | null } | null };
type Member = { id: string; display_name: string | null; member_tier: string };

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const [{ data: apps }, { data: members }] = await Promise.all([
    supabase.from('membership_applications')
      .select('id, status, created_at, user_id, user:profiles!membership_applications_user_id_fkey(display_name)')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, display_name, member_tier').eq('member_tier', 'paid'),
  ]);
  const pending = ((apps ?? []) as unknown as App[]).filter((a) => a.status === 'pending');
  const paid = (members ?? []) as Member[];

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-black"><Crown className="h-6 w-6 text-gold-500" />有料会員管理</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-black">申込（審査待ち {pending.length}）</h2>
        {pending.length === 0 ? (
          <p className="card p-6 text-center text-sm text-slate-500">審査待ちの申込はありません。</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((a) => (
              <li key={a.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold">{a.user?.display_name ?? 'ユーザー'}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(a.created_at)}</p>
                </div>
                <div className="flex gap-1">
                  <form action={adminDecideMembership.bind(null, a.id, true)}>
                    <button className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50">承認（有料に）</button>
                  </form>
                  <form action={adminDecideMembership.bind(null, a.id, false)}>
                    <button className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">却下</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-black">有料会員（{paid.length}）</h2>
        {paid.length === 0 ? (
          <p className="card p-6 text-center text-sm text-slate-500">有料会員はいません。</p>
        ) : (
          <ul className="space-y-2">
            {paid.map((m) => (
              <li key={m.id} className="card flex items-center justify-between gap-3 p-4">
                <p className="font-bold">{m.display_name ?? 'ユーザー'} <span className="badge ml-1 bg-gold-100 text-gold-600">有料</span></p>
                <form action={adminSetMemberTier.bind(null, m.id, 'free')}>
                  <button className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50">無料に戻す</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
