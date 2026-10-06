import Link from 'next/link';
import { FileText, ArrowRight } from 'lucide-react';
import { NecessaryDocs } from '@/components/NecessaryDocs';

export const dynamic = 'force-static';
export const metadata = {
  title: '必要書類案内 | BUYMO ダイレクト',
  description: '中古車の個人間売買・ダイレクト販売で必要な書類を、売る方・買う方／普通車・軽自動車に分けてご案内します。名義変更代行もご利用いただけます。',
};

export default function NecessaryDocumentsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-teal-600">required documents</p>
        <h1 className="mt-1 text-3xl font-black">必要書類案内</h1>
        <p className="mt-2 text-sm text-slate-600">
          中古車の名義変更（移転登録）に必要な書類を、<strong>売る方・買う方</strong>／<strong>普通車・軽自動車</strong>に分けてご案内します。
          条件を選ぶと必要な書類だけを表示し、チェックリストとして準備状況を管理できます。
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800 print:hidden">
        <FileText className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          手続きが不安な方は <Link href="/transfer" className="font-bold underline">名義変更代行</Link> をご利用いただけます。必要書類のご案内・回収から手続き完了までBUYMOがサポートします。
        </p>
      </div>

      <NecessaryDocs />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
        ※ 書類の要件は制度改定や管轄（運輸支局・軽自動車検査協会・警察署）により異なる場合があります。最新・正確な要件は管轄窓口でご確認ください。「ダウンロード」付きの様式は印刷してご記入ください（委任状・譲渡証明書は実印を押印）。
      </div>

      <div className="flex flex-wrap gap-3 print:hidden">
        <Link href="/transfer" className="btn-accent inline-flex items-center gap-1">名義変更代行を見る <ArrowRight className="h-4 w-4" /></Link>
        <Link href="/contact" className="inline-flex items-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">書類について相談する</Link>
      </div>
    </div>
  );
}
