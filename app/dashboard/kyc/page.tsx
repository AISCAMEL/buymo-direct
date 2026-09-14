import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { KycVerificationForm } from '@/components/KycVerificationForm';
import { EkycUploadPanel } from '@/components/EkycUploadPanel';
import type { KycDocument } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_INFO: Record<string, { label: string; className: string }> = {
  unverified: { label: '未確認', className: 'bg-slate-100 text-slate-600' },
  pending:    { label: '審査中', className: 'bg-amber-100 text-amber-700' },
  verified:   { label: '確認済み', className: 'bg-emerald-100 text-emerald-700' },
  rejected:   { label: '要再提出', className: 'bg-red-100 text-red-700' },
};

export default async function KycPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard/kyc');

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('kyc_status, kyc_verified_at')
    .eq('id', user.id)
    .maybeSingle();
  const kycStatus = (profileRow as { kyc_status?: string } | null)?.kyc_status ?? 'unverified';

  const { data: doc } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  const kycDoc = doc as KycDocument | null;

  const statusInfo = STATUS_INFO[kycStatus] ?? STATUS_INFO.unverified;

  const params = await searchParams;
  const resultParam = params['result'];
  const ekycResult =
    resultParam === 'success' ? 'success' : resultParam === 'failed' ? 'failed' : null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">本人確認（eKYC）</h1>
        <span className={`badge px-3 py-1 text-sm font-bold ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* 説明 */}
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-navy-500" />
          <div className="space-y-1.5 text-sm text-slate-600">
            <p className="font-bold text-slate-800">本人確認とは</p>
            <p>
              政府発行の身分証をご提出いただき、本人確認バッジを取得できます。
              バッジはプロフィールと出品ページに表示され、取引相手に安心感を与えます。
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-500">
              <li>運転免許証、マイナンバーカード、パスポートが使用できます</li>
              <li>審査は通常1〜3営業日以内に完了します</li>
              <li>書類は本人確認目的のみに使用し、厳重に管理します</li>
            </ul>
          </div>
        </div>
      </div>

      {/* eKYC 統合パネル（TRUSTDOCK ホスト型 + 手動アップロード） */}
      {kycStatus !== 'verified' && (
        <EkycUploadPanel initialResult={ekycResult} />
      )}

      {/* 従来の手動アップロードフォーム（フォールバック） */}
      {kycStatus !== 'verified' && (
        <details className="group">
          <summary className="cursor-pointer select-none text-sm text-slate-400 hover:text-slate-600">
            従来の提出フォームを使用する
          </summary>
          <div className="mt-4">
            <KycVerificationForm
              userId={user.id}
              currentStatus={kycStatus}
              existingNote={kycDoc?.note}
            />
          </div>
        </details>
      )}

      {kycStatus === 'verified' && (
        <KycVerificationForm
          userId={user.id}
          currentStatus={kycStatus}
          existingNote={kycDoc?.note}
        />
      )}
    </div>
  );
}
