import { LegalLayout } from '@/components/LegalLayout';
import { OPERATOR } from '@/lib/operator';

export const metadata = { title: '会社概要 | BUYMO ダイレクト' };

const ROWS: { label: string; value: string }[] = [
  { label: '会社名', value: OPERATOR.companyName },
  ...(OPERATOR.corporateNumber ? [{ label: '法人番号', value: OPERATOR.corporateNumber }] : []),
  { label: '代表者', value: OPERATOR.representative },
  { label: '所在地', value: OPERATOR.address },
  { label: '電話番号', value: OPERATOR.phone },
  { label: 'メールアドレス', value: OPERATOR.email },
  { label: '営業時間', value: OPERATOR.businessHours },
  { label: '古物商許可番号', value: OPERATOR.antiqueDealerLicense },
  ...(OPERATOR.invoiceNumber ? [{ label: 'インボイス登録番号', value: OPERATOR.invoiceNumber }] : []),
  ...(OPERATOR.established ? [{ label: '設立', value: OPERATOR.established }] : []),
  { label: '事業内容', value: OPERATOR.business },
  { label: '運営サービス', value: `${OPERATOR.serviceName}（${OPERATOR.url}）` },
];

export default function CompanyPage() {
  return (
    <LegalLayout title="会社概要" updated="2026-09-26">
      <p>
        {OPERATOR.serviceName} は、{OPERATOR.companyName} が運営する中古車のダイレクト販売プラットフォームです。
        買取保証・エスクロー決済・名義変更代行などにより、個人間でも安心して売買できる環境を提供します。
      </p>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label} className="border-b border-slate-200 align-top">
              <th className="w-40 bg-slate-50 px-3 py-3 text-left font-bold text-slate-700">{r.label}</th>
              <td className="px-3 py-3 text-slate-700">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </LegalLayout>
  );
}
