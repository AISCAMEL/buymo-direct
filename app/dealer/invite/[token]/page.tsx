import Link from 'next/link';
import { AlertTriangle, Building2, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { InviteAcceptButton } from '@/components/InviteAcceptButton';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = { owner: 'オーナー', manager: 'マネージャー', staff: 'スタッフ' };

type Params = Promise<{ token: string }>;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card space-y-4 p-6">{children}</div>
    </div>
  );
}

export default async function InviteAcceptPage({ params }: { params: Params }) {
  const { token } = await params;

  // 招待の検証（RLS バイパス）
  type Inv = { dealer_id: string; email: string; role: string; expires_at: string; accepted_at: string | null };
  let inv: Inv | null = null;
  try {
    const svc = createServiceClient() as any;
    const { data } = await svc
      .from('dealer_invitations')
      .select('dealer_id, email, role, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle();
    inv = (data as Inv) ?? null;
  } catch {
    inv = null;
  }

  if (!inv) {
    return (
      <Shell>
        <p className="flex items-center gap-2 font-bold text-navy-800"><AlertTriangle className="h-5 w-5 text-amber-500" />招待が見つかりません</p>
        <p className="text-sm text-slate-500">リンクが無効か、取り消された可能性があります。加盟店に再送を依頼してください。</p>
        <Link href="/" className="text-sm font-bold text-accent-600 hover:underline">トップへ戻る</Link>
      </Shell>
    );
  }

  const expired = new Date(inv.expires_at) < new Date();
  const accepted = !!inv.accepted_at;

  // 加盟店名
  let dealerName = '加盟店';
  try {
    const svc = createServiceClient() as any;
    const { data: d } = await svc.from('dealers').select('name').eq('id', inv.dealer_id).maybeSingle();
    if (d?.name) dealerName = d.name as string;
  } catch { /* 既定値のまま */ }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <Shell>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><Building2 className="h-6 w-6" /></span>
        <div>
          <p className="text-xs font-bold text-slate-400">加盟店スタッフ招待</p>
          <p className="font-black text-navy-800">{dealerName}</p>
        </div>
      </div>

      <p className="text-sm text-slate-600">
        <strong className="text-navy-800">{dealerName}</strong> から
        <strong className="mx-0.5">{ROLE_LABEL[inv.role] ?? inv.role}</strong>
        として招待されています。
      </p>
      <p className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500"><Mail className="h-4 w-4" />{inv.email}</p>

      {accepted ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">この招待はすでに承認済みです。</p>
      ) : expired ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-700">招待の有効期限が切れています。加盟店に再送を依頼してください。</p>
      ) : !user ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">招待を承認するには、招待先メール（{inv.email}）のアカウントでログインしてください。</p>
          <Link href={`/login?redirect=/dealer/invite/${token}`} className="btn-accent w-full">ログインして承認する</Link>
          <Link href={`/signup?redirect=/dealer/invite/${token}`} className="block text-center text-sm font-bold text-accent-600 hover:underline">アカウントを新規作成</Link>
        </div>
      ) : (
        <InviteAcceptButton token={token} />
      )}
    </Shell>
  );
}
