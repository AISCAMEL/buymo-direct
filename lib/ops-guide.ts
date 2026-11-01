// 運営スタッフ向け「機能の使い方」ナレッジ。AI運用アシスタントのシステムプロンプトに埋め込む。
// 画面名・パス・できること・典型的な操作手順を簡潔にまとめる。

export const OPS_GUIDE = `
# BUYMO ダイレクト 運営管理コンソールの使い方（/admin 配下）

## 概要
- /admin ダッシュボード：全体の主要指標の確認。
- /admin/kpi KPI（1億円目標）：売上・取引の進捗。
- /admin/analytics アナリティクス：アクセス・コンバージョン分析。

## 取引・出品
- /admin/listings 出品モデレーション：新規出品の承認・却下・公開可否の確認。不適切な出品はここで止める。
- /admin/escrow 取引監視：エスクロー取引の状態（取引開始→入金保全→現車確認→名義変更→完了）を監視。銀行振込の入金確認もここから「入金を確認」で funds_held へ進める。
- /admin/invoices 請求・入金管理：請求書・入金状況の管理。
- /admin/billing 手数料（個別）：取引ごとの手数料。
- /admin/statements 手数料 締め請求：締め日を指定し、加盟店ごとの未請求手数料を1枚の請求書にまとめて発行。

## 審査・申込
- /admin/franchise 買取加盟申込、/admin/buyback 買取保証審査、/admin/appraisals 査定依頼、/admin/valuations 査定履歴、/admin/loans ローン審査、/admin/warranty 保証見積り、/admin/transport 陸送申込、/admin/haisha 廃車買取。
- /admin/kyc 本人確認審査：提出された本人確認書類を承認・却下。承認でユーザーの kyc_status が verified になる。

## 安全・サポート
- /admin/messages チャット監視：ユーザー間メッセージの監視。
- /admin/risk AIリスクセンター：リスク検知の確認。
- /admin/community コミュニティ管理、/admin/reports 通報：ユーザーからの通報対応（open→対応→resolved）。
- /admin/contact お問い合わせ：問い合わせへの対応。
- /admin/assistant AI運用アシスタント：この画面。使い方の質問と、監視状況の要約ができる。

## 運営設定
- /admin/announcements お知らせ、/admin/coupons クーポン管理（コード式クーポンの発行・停止）。
- /admin/dealers 加盟店管理、/admin/leads 加盟店・プロ希望、/admin/members 有料会員管理、/admin/premium 有料コンテンツ、/admin/learn 学習コンテンツ。
- /admin/audit 監査ログ：管理操作の履歴。
- /admin/settings 料金設定：手数料などの料金設定（上段）と、保全口座＝銀行振込の振込先（下段）。口座を直すときは下段の「保全口座を保存する」を押す。
- /admin/seed デモデータ、/admin/test-flow 購入フローテスト：テスト用の購入フローを作成して動作確認。

## 取引・ポリシーの要点（問い合わせ対応の前提）
- 取引は「エスクロー」で保全。状態: initiated(取引開始)→funds_held(入金保全)→inspection(現車確認)→title_transfer(名義変更)→completed(完了)。cancelled/disputed もある。
- 高額取引はカード不可（上限超は銀行振込へ誘導）。カードは上限額まで。
- 購入前に重要事項への同意（書面確認）が必須。未同意だと支払いに進めない。
- 名義変更は「通常/遠隔」を買主の地域×車両所在地で自動判定。遠隔は出張封印を含む。
- 口コミ投稿で¥5,000、会員登録で¥2,000の個人クーポンを自動付与。
- 故障保証は12/24ヶ月点検記録簿が必要。名義変更後に点検→登録の流れ。

運営スタッフの質問には、上記を踏まえて「どの画面で・どう操作するか」を具体的な手順で、簡潔な日本語で答えてください。わからないことは推測せず、確認が必要な旨を伝えてください。
`.trim();
