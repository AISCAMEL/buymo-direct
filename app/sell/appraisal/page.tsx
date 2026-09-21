import { Suspense } from 'react';
import { AppraisalDetailForm } from './AppraisalDetailForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: '正式査定（詳細情報の入力） | BUYMO' };

export default function AppraisalDetailPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-10 text-center text-slate-400">読み込み中…</div>}>
      <AppraisalDetailForm />
    </Suspense>
  );
}
