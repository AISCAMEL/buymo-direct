// 運営者（事業者）情報の一元管理。
// 特商法・会社概要・プライバシー・利用規約など各ページはここを参照する。
// ★★★ 公開前に［  ］のプレースホルダーを BUYMO の正式情報に置き換えてください ★★★

export const OPERATOR = {
  /** 事業者名（法人名） */
  companyName: '［事業者名を記載］',
  /** 法人番号（任意） */
  corporateNumber: '',
  /** インボイス登録番号（任意） */
  invoiceNumber: '',
  /** 古物商許可番号（中古車販売は必須） */
  antiqueDealerLicense: '［古物商許可番号を記載］',
  /** サービス名 */
  serviceName: 'BUYMO ダイレクト',
  /** 代表者・運営統括責任者 */
  representative: '［代表者名を記載］',
  /** 所在地 */
  address: '［所在地を記載］',
  /** 電話番号 */
  phone: '［電話番号を記載］',
  /** 公開用メールアドレス */
  email: '［連絡先メールを記載］',
  /** 営業時間 */
  businessHours: '［営業時間を記載］',
  /** 公開サイトURL */
  url: 'https://buymo-direct.vercel.app',
  /** 設立年月（任意・会社概要用） */
  established: '',
  /** 事業内容（会社概要用） */
  business: '中古車のダイレクト販売プラットフォーム運営、買取保証、エスクロー決済・名義変更代行等の付帯サービス提供',
} as const;

/** 値がまだプレースホルダーかどうか（未確定バナー表示などに使用）。 */
export function isPlaceholder(value: string): boolean {
  return value.includes('［') || value.includes('例）') || value.includes('.example') || value === '';
}
