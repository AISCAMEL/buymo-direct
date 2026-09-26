// 運営者（事業者）情報の一元管理。
// 特商法・会社概要・プライバシー・利用規約など各ページはここを参照する。
// ★★★ 公開前に［  ］のプレースホルダーを正式情報に置き換えてください ★★★

export const OPERATOR = {
  /** 事業者名（法人名） */
  companyName: '合同会社アイズ',
  /** サービス名 */
  serviceName: 'BUYMO ダイレクト',
  /** 代表者・運営統括責任者 */
  representative: '［代表者名を記載］',
  /** 所在地 */
  address: '［所在地（都道府県・市区町村・番地）を記載］',
  /** 電話番号（請求があれば遅滞なく開示、の運用も可） */
  phone: '［電話番号を記載］',
  /** 公開用メールアドレス */
  email: '［連絡先メールを記載］',
  /** 公開サイトURL */
  url: 'https://buymo-direct.vercel.app',
  /** 設立年月（任意・会社概要用） */
  established: '［設立年月を記載（任意）］',
  /** 事業内容（会社概要用） */
  business: '中古車のダイレクト販売プラットフォーム運営、買取保証、エスクロー決済・名義変更代行等の付帯サービス提供',
} as const;

/** 値がまだプレースホルダーかどうか（未確定バナー表示などに使用）。 */
export function isPlaceholder(value: string): boolean {
  return value.includes('［') || value.includes('例）') || value.includes('.example');
}
