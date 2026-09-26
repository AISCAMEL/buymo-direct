// 運営者（事業者）情報の一元管理。
// 特商法・会社概要・プライバシー・利用規約など各ページはここを参照する。
// 情報源: 合同会社アイズ 確定情報（同運営の既存事業ドキュメントより引用）。

export const OPERATOR = {
  /** 事業者名（法人名） */
  companyName: '合同会社アイズ',
  /** 法人番号 */
  corporateNumber: '9380003004349',
  /** インボイス登録番号 */
  invoiceNumber: 'T9380003004349',
  /** 古物商許可番号 */
  antiqueDealerLicense: '第25121A010859号',
  /** サービス名 */
  serviceName: 'BUYMO ダイレクト',
  /** 代表者・運営統括責任者 */
  representative: '代表社員 吉田 一平',
  /** 所在地 */
  address: '〒979-0204 福島県いわき市四倉町細谷字大町1番',
  /** 電話番号 */
  phone: '050-1722-3365',
  /** 公開用メールアドレス */
  email: 'info@aisjaltd.com',
  /** 営業時間 */
  businessHours: '平日 8:00〜17:00（オンラインは24時間受付）',
  /** 公開サイトURL */
  url: 'https://buymo-direct.vercel.app',
  /** 設立年月（任意・会社概要用） */
  established: '',
  /** 事業内容（会社概要用） */
  business: '中古車のダイレクト販売プラットフォーム運営、買取保証、エスクロー決済・名義変更代行等の付帯サービス提供',
} as const;

/** 値がまだプレースホルダーかどうか（未確定バナー表示などに使用）。 */
export function isPlaceholder(value: string): boolean {
  return value.includes('［') || value.includes('例）') || value.includes('.example');
}
