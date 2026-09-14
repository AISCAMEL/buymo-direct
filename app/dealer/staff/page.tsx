import { UserPlus, Shield, Trash2 } from 'lucide-react';
import { requireDealer } from '@/lib/dealer';
import { formatDate } from '@/lib/format';
import { inviteStaff, removeStaff, updateStaffRole } from '@/app/dealer/actions';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = { owner: 'オーナー', manager: 'マネージャー', staff: 'スタッフ' };
const ROLE_CLASS: Record<string, string> = {
  owner: 'bg-navy-100 text-navy-700',
  manager: 'bg-amber-100 text-amber-700',
  staff: 'bg-slate-100 text-slate-600',
};

export default async function DealerStaffPage() {
  const { supabase, dealer } = await requireDealer() as any;

  const { data: staffRows } = await (supabase as any)
    .from('dealer_staff')
    .select('*, profiles(id, display_name, avatar_url)')
    .eq('dealer_id', dealer.dealerId)
    .order('created_at');

  const { data: invites } = await (supabase as any)
    .from('dealer_invitations')
    .select('*')
    .eq('dealer_id', dealer.dealerId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  const canManage = ['owner', 'manager'].includes(dealer.role);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">スタッフ管理</h1>

      {/* スタッフ一覧 */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">名前</th>
              <th className="px-4 py-3 text-left">ロール</th>
              <th className="px-4 py-3 text-left">追加日</th>
              {canManage && <th className="px-4 py-3 text-center">操作</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(staffRows ?? []).map((s: any) => {
              const p = s.profiles;
              const isCurrentOwner = s.role === 'owner';
              return (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-bold">
                    {p?.display_name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {canManage && !isCurrentOwner ? (
                      <form action={updateStaffRole.bind(null, s.id, s.role === 'manager' ? 'staff' : 'manager')} className="inline">
                        <button type="submit" className={`badge cursor-pointer ${ROLE_CLASS[s.role]} hover:opacity-80`}>
                          {ROLE_LABEL[s.role]}
                        </button>
                      </form>
                    ) : (
                      <span className={`badge ${ROLE_CLASS[s.role]}`}>{ROLE_LABEL[s.role]}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(s.created_at)}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-center">
                      {!isCurrentOwner && (
                        <form action={removeStaff.bind(null, s.id)}>
                          <button type="submit" className="text-slate-300 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 招待フォーム */}
      {canManage && (
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <UserPlus className="h-4 w-4" /> スタッフを招待
          </h2>
          <form action={inviteStaff} className="flex flex-wrap gap-3">
            <input name="email" type="email" required className="input flex-1 min-w-48" placeholder="staff@example.com" />
            <select name="role" className="input w-36">
              <option value="staff">スタッフ</option>
              <option value="manager">マネージャー</option>
            </select>
            <button type="submit" className="btn-accent">招待メールを送信</button>
          </form>
          <p className="mt-2 text-xs text-slate-400">招待リンクは7日間有効です。</p>
        </div>
      )}

      {/* 招待待ち */}
      {(invites ?? []).length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 font-bold text-sm text-slate-700">招待待ち</h2>
          <ul className="space-y-2 text-sm">
            {(invites ?? []).map((inv: any) => (
              <li key={inv.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span>{inv.email}</span>
                <div className="flex items-center gap-3">
                  <span className={`badge ${ROLE_CLASS[inv.role]}`}>{ROLE_LABEL[inv.role]}</span>
                  <span className="text-xs text-slate-400">期限 {formatDate(inv.expires_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
