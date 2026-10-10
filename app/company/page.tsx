import Link from 'next/link';
import { Building2, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { OPERATOR } from '@/lib/operator';

export const metadata = {
  title: '会社概要 | BUYMO ダイレクト',
  description: `${OPERATOR.serviceName} を運営する ${OPERATOR.companyName} の会社概要。所在地・代表者・古物商許可・事業内容をご案内します。`,
};

const ROWS: { label: string; value: string }[] = [
  { label: '会社名', value: OPERATOR.companyName },
  ...(OPERATOR.corporateNumber ? [{ label: '法人番号', value: OPERATOR.corporateNumber }] : []),
  { label: '代表者', value: OPERATOR.representative },
  { label: '所在地', value: OPERATOR.address },
  { label: '買取センター', value: OPERATOR.centerAddress },
  { label: '電話番号', value: OPERATOR.phone },
  { label: 'メールアドレス', value: OPERATOR.email },
  { label: '営業時間', value: OPERATOR.businessHours },
  { label: '定休日', value: OPERATOR.closedDays },
  { label: '古物商許可番号', value: OPERATOR.antiqueDealerLicense },
  ...(OPERATOR.invoiceNumber ? [{ label: 'インボイス登録番号', value: OPERATOR.invoiceNumber }] : []),
  ...(OPERATOR.established ? [{ label: '設立', value: OPERATOR.established }] : []),
  { label: '事業内容', value: OPERATOR.business },
  { label: '運営サービス', value: `${OPERATOR.brandName}／${OPERATOR.serviceName}（${OPERATOR.url}）` },
];

const BUSINESS = [
  '中古車の買取（廃車・事故車・不動車・過走行車を含む）',
  '中古車のダイレクト販売（個人間売買）の場の提供・仲介',
  'カーパーツ・用品のオークション運営',
  'エスクロー決済・名義変更代行・陸送手配・提携ローンの取次',
  '加盟店・プロ向けプラットフォーム／フランチャイズ事業',
];

export default function CompanyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      <div className="flex items-center gap-2">
        <Building2 className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">会社概要</h1>
      </div>

      <p className="text-sm leading-relaxed text-slate-600">
        {OPERATOR.serviceName} は、{OPERATOR.companyName} が運営する中古車の買取・ダイレクト販売プラットフォームです。
        買取保証・エスクロー決済・名義変更代行などにより、個人間でも安心して売買できる環境を提供します。
      </p>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label} className="border-b border-slate-100 align-top last:border-b-0">
                <th className="w-36 bg-slate-50 px-4 py-3 text-left font-bold text-slate-700">{r.label}</th>
                <td className="px-4 py-3 text-slate-700">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-bold text-navy-800"><ShieldCheck className="h-5 w-5 text-accent-600" /> 事業内容</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
          {BUSINESS.map((b) => (
            <li key={b} className="flex gap-2"><span className="text-accent-600">•</span>{b}</li>
          ))}
        </ul>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <a href={`mailto:${OPERATOR.email}`} className="card flex items-center gap-3 p-4 transition hover:shadow-md">
          <Mail className="h-5 w-5 text-navy-500" />
          <div><p className="text-sm font-bold text-navy-800">メールで問い合わせ</p><p className="text-xs text-slate-500">{OPERATOR.email}</p></div>
        </a>
        <Link href="/contact" className="card flex items-center gap-3 p-4 transition hover:shadow-md">
          <MapPin className="h-5 w-5 text-navy-500" />
          <div><p className="text-sm font-bold text-navy-800">お問い合わせフォーム</p><p className="text-xs text-slate-500">ご相談・ご質問はこちら</p></div>
        </Link>
      </div>

      <p className="text-xs text-slate-400">
        特定商取引法に基づく表記は <Link href="/tokushoho" className="text-accent-600 underline">こちら</Link>。
        個人情報の取扱いは <Link href="/privacy" className="text-accent-600 underline">プライバシーポリシー</Link> をご覧ください。
      </p>
    </div>
  );
}
