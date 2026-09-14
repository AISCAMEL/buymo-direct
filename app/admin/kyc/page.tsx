import { requireAdmin } from '@/lib/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { formatDate } from '@/lib/format';
import { adminApproveKyc, adminRejectKyc } from '@/app/admin/actions';
import { KycAutoScoreButton } from '@/components/KycAutoScoreButton';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  unverified: '未申請',
  pending: '審査待ち',
  verified: '承認済み',
  rejected: '却下',
};
const STATUS_CLASS: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  verified: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export default async function AdminKycPage() {
  await requireAdmin();

  const service = createServiceClient();
  const { data: docs } = await service
    .from('kyc_documents')
    .select('*, profiles(display_name, kyc_status)')
    .order('submitted_at', { ascending: true });

  const rows = (docs ?? []) as any[];

  // Generate signed URLs for document viewing (1 hour expiry)
  const rowsWithUrls = await Promise.all(
    rows.map(async (row) => {
      const { data: idUrl } = await service.storage
        .from('kyc-documents')
        .createSignedUrl(row.id_front_url, 3600);
      const selfieUrl = row.selfie_url
        ? (await service.storage.from('kyc-documents').createSignedUrl(row.selfie_url, 3600)).data
        : null;
      return { ...row, idSignedUrl: idUrl?.signedUrl, selfieSignedUrl: selfieUrl?.signedUrl };
    })
  );

  const pending = rowsWithUrls.filter((r) => r.status === 'pending');
  const others  = rowsWithUrls.filter((r) => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">本人確認 審査キュー</h1>

      {pending.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          審査待ちの書類はありません。
        </div>
      ) : (
        <ul className="space-y-4">
          {pending.map((row) => (
            <li key={row.id} className="card space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{row.profiles?.display_name ?? '—'}</p>
                  <p className="text-xs text-slate-400">提出日：{formatDate(row.submitted_at)}</p>
                </div>
                <span className={`badge ${STATUS_CLASS[row.status]}`}>
                  {STATUS_LABEL[row.status]}
                </span>
              </div>

              {/* 書類プレビュー */}
              <div className="grid grid-cols-2 gap-3">
                {row.idSignedUrl && (
                  <div>
                    <p className="mb-1 text-xs font-bold text-slate-500">身分証</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <a href={row.idSignedUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={row.idSignedUrl}
                        alt="身分証"
                        className="h-32 w-full rounded-lg object-cover hover:opacity-80"
                      />
                    </a>
                  </div>
                )}
                {row.selfieSignedUrl && (
                  <div>
                    <p className="mb-1 text-xs font-bold text-slate-500">自撮り</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <a href={row.selfieSignedUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={row.selfieSignedUrl}
                        alt="自撮り"
                        className="h-32 w-full rounded-lg object-cover hover:opacity-80"
                      />
                    </a>
                  </div>
                )}
              </div>

              {/* 自動審査 */}
              <KycAutoScoreButton kycId={row.id} />

              {/* 承認 / 却下 */}
              <div className="flex flex-wrap gap-3">
                <form
                  action={async () => {
                    'use server';
                    await adminApproveKyc(row.user_id);
                  }}
                >
                  <button className="btn-accent px-5">承認する</button>
                </form>

                <form
                  action={async (fd: FormData) => {
                    'use server';
                    const note = String(fd.get('note') ?? '').trim();
                    await adminRejectKyc(row.user_id, note);
                  }}
                  className="flex flex-1 items-center gap-2"
                >
                  <input
                    name="note"
                    className="input flex-1 text-sm"
                    placeholder="却下理由（任意）"
                  />
                  <button className="btn-outline text-red-600 hover:bg-red-50">却下</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-black">処理済み</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">ユーザー</th>
                  <th className="px-4 py-2 text-left">提出日</th>
                  <th className="px-4 py-2 text-left">審査日</th>
                  <th className="px-4 py-2 text-left">ステータス</th>
                  <th className="px-4 py-2 text-left">メモ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {others.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-bold">{row.profiles?.display_name ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-400">{formatDate(row.submitted_at)}</td>
                    <td className="px-4 py-2 text-slate-400">
                      {row.reviewed_at ? formatDate(row.reviewed_at) : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`badge ${STATUS_CLASS[row.status] ?? ''}`}>
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{row.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
