// 運営者（事業者）情報の一元管理。
// 特商法・会社概要・プライバシー・利用規約など各ページはここを参照する。
// 情報源: BUYMO 公式（合同会社アイズ）確定情報。

export const OPERATOR = {
  /** サービス／ブランド名 */
  serviceName: 'BUYMO ダイレクト',
  brandName: 'BUYMO（バイモ）買取センター',
  /** 運営会社（法人名） */
  companyName: '合同会社アイズ',
  /** 運営会社 所在地 */
  address: '〒979-0204 福島県いわき市四倉町細谷字大町1番',
  /** 買取センター 所在地 */
  centerAddress: '〒971-8138 福島県いわき市若葉台1丁目31-11',
  /** 代表者 */
  representative: '吉田 一平',
  /** 公開用メールアドレス */
  email: 'kaitori@buymo.me',
  /** 電話（番号は非公開・請求により開示の運用） */
  phone: '請求により遅滞なく開示（お問い合わせはメール・フォームにて受付）',
  /** 営業時間 */
  businessHours: '査定はオンラインで24時間・365日受付',
  /** 定休日 */
  closedDays: '年中無休（365日・24時間受付）',
  /** 事業内容 */
  business: '自動車買取・販売業／フランチャイズ事業',
  /** 古物商許可 */
  antiqueDealerLicense: '福島県公安委員会許可 第25121A010859号',
  /** 公開サイトURL */
  url: 'https://buymo.me',
  /** 任意項目（未確定なら空） */
  corporateNumber: '',
  invoiceNumber: '',
  established: '',
} as const;

/** 値がまだプレースホルダーかどうか。 */
export function isPlaceholder(value: string): boolean {
  return value.includes('［') || value.includes('例）') || value.includes('.example') || value === '';
}
