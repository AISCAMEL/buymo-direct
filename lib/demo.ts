// デモ用アカウントの定義（本番の実ユーザーとは別のダミードメイン @buymo-demo.jp）。
// デモに確実にログインできるよう、固定の既知パスワードを使用（隔離されたデモ専用データのみ）。
// seedDemoData の再投入のたびにこのパスワードへリセットされるため、必ずこの値でログインできる。
export const DEMO_PASSWORD = 'BuymoDemo!2026';

export const DEMO_BUYER = { email: 'demo.buyer@buymo-demo.jp', name: '山田 太郎（デモ）' };
export const DEMO_PRO = { email: 'demo.pro@buymo-demo.jp', name: '佐藤オート（デモ担当）' };
export const DEMO_SKILL = { email: 'demo.skill@buymo-demo.jp', name: '田中 一郎（スキル登録デモ）' };
