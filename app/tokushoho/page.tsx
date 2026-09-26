import { LegalLayout } from '@/components/LegalLayout';
import { ESCROW_FEE, TITLE_OPTIONS, INSTALLMENT_RATE, LOAN_APR_FROM } from '@/lib/constants';
import { formatYen } from '@/lib/format';
import { OPERATOR } from '@/lib/operator';

export const metadata = { title: '特定商取引法に基づく表記 | BUYMO ダイレクト' };

const ROWS: { label: string; value: string }[] = [
  { label: '販売事業者', value: OPERATOR.corporateNumber ? `${OPERATOR.companyName}（法人番号 ${OPERATOR.corporateNumber}）` : OPERATOR.companyName },
  { label: '運営統括責任者', value: OPERATOR.representative },
  { label: '所在地', value: OPERATOR.address },
  { label: '電話番号', value: OPERATOR.phone },
  { label: 'メールアドレス', value: OPERATOR.email },
  { label: '古物商許可番号', value: OPERATOR.antiqueDealerLicense },
  ...(OPERATOR.invoiceNumber ? [{ label: 'インボイス登録番号', value: OPERATOR.invoiceNumber }] : []),
  { label: '営業時間', value: OPERATOR.businessHours },
  { label: '販売URL', value: OPERATOR.url },
  {
    label: '販売価格',
    value: '各出品ページに表示する車両価格（個人間売買のため出品者が設定）。',
  },
  {
    label: '商品代金以外の必要料金',
    value: `エスクロー手数料 ${formatYen(ESCROW_FEE)}／名義変更代行 ${formatYen(TITLE_OPTIONS.standard.fee)}（遠隔 ${formatYen(TITLE_OPTIONS.remote.fee)}）／クレジット分割手数料 ${(INSTALLMENT_RATE * 100).toFixed(1)}%／提携ローン 年率${LOAN_APR_FROM}%〜（審査により決定）。陸送費等は別途。`,
  },
  { label: '支払方法', value: '現金、クレジットカード（Square）、提携ローン。' },
  { label: '支払時期', value: 'エスクロー決済：購入手続き時に代金を保全。現金：受け渡し時。' },
  {
    label: '商品の引渡時期',
    value: '現車確認・名義変更等の手続き完了後、両当事者の合意した日時に引き渡し。',
  },
  {
    label: '返品・キャンセル',
    value: '取引開始後〜入金保全までの間はキャンセル可能。現車確認後・名義変更後のキャンセルは原則不可。瑕疵等のトラブルは係争対応の上、個別に対応します。',
  },
  {
    label: '動作・品質',
    value: '車両は中古品であり、状態は各出品ページの記載および現車確認によります。修復歴は出品者に表示義務があります。',
  },
];

export default function TokushohoPage() {
  return (
    <LegalLayout title="特定商取引法に基づく表記" updated="2026-06-16">
      <p>
        当サービスは個人間（C2C）売買を仲介するプラットフォームです。各取引の売主は出品者個人ですが、
        プラットフォーム運営および当社が提供する役務（エスクロー・名義変更代行等）について、以下のとおり表示します。
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
