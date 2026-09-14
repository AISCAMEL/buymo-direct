# BUYMO C2C — 個人間中古車売買マーケットプレイス

個人どうしで中古車を直接売買できる **C2Cマーケットプレイス** のフルスタック実装です。
（既存の静的サイト `../index.html` / `../dealer.html`（BUYMO Direct）とは独立した別サイトです。）

## 機能

| 機能 | 内容 |
|---|---|
| 認証 | Supabase Auth（メール＋パスワード）。登録時に `profiles` を自動作成 |
| 出品 | 写真アップロード（Storage）＋車両情報。メーカー→モデル連動 |
| 検索・一覧 | メーカー/モデル/予算/ボディ/地域/修復歴フィルタ |
| 詳細 | 画像ギャラリー・スペック・出品者情報・問い合わせ |
| メッセージ | 出品ごとの売主×買主スレッド。Realtimeで即時反映 |
| エスクロー | 入金保全→現車確認→名義変更→完了のステップ管理 |
| 名義変更連携 | 通常/遠隔の代行オプションと費用を取引に組み込み |
| マイページ | 出品管理・取引一覧 |

## 技術スタック

- **Next.js 15**（App Router / Server Actions）+ TypeScript
- **Tailwind CSS**
- **Supabase**（PostgreSQL / Auth / Storage / Realtime）+ Row Level Security
- **lucide-react** アイコン

## セットアップ

### 1. Supabase プロジェクト作成
[supabase.com](https://supabase.com) でプロジェクトを作成。

### 2. データベース構築
`supabase/schema.sql` を **SQL Editor** に貼り付けて実行。
テーブル・RLS・トリガ・Storageバケット（`listing-images`）・Realtimeがまとめて設定されます。

### 3. 環境変数
```bash
cp .env.local.example .env.local
```
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を
Supabase の **Project Settings > API** からコピーして設定。

> 開発中はメール確認なしで即ログインさせたい場合、
> Supabase の **Authentication > Providers > Email** で *Confirm email* をオフにします。

### 4. デモデータ投入（任意）
`supabase/seed.sql` を SQL Editor で実行すると、デモ用ユーザー・出品・取引・
レビュー・お知らせが入ります（接続直後に画面確認できます）。

デモログイン（パスワードは全員 `password123`）:

| メール | 役割 |
|---|---|
| `admin@demo.example` | 管理者（`/admin` 利用可） |
| `taro@demo.example` | 出品者 |
| `hanako@demo.example` | 出品者 |
| `kenji@demo.example` | 購入者 |

### 5. 起動
```bash
npm install
npm run dev
# http://localhost:3000
```

### 6. ビルド / 型チェック / テスト
```bash
npm run typecheck   # 型チェック
npm test            # 単体テスト（Node標準ランナー + tsx）
npm run build       # 本番ビルド
```
push / PR 時に GitHub Actions（`.github/workflows/ci.yml`）が上記を自動実行します。

## ディレクトリ構成

```
marketplace/
├── app/
│   ├── page.tsx                 # トップ（新着出品）
│   ├── listings/                # 検索一覧・詳細
│   ├── sell/                    # 出品フォーム
│   ├── messages/                # メッセージ一覧・スレッド
│   ├── escrow/                  # エスクロー取引・名義変更
│   ├── dashboard/listings/      # マイページ
│   ├── login, signup, auth/     # 認証
│   └── layout.tsx, globals.css
├── components/                  # Header, ListingCard, SellForm, MessageThread, EscrowStepper ...
├── lib/
│   ├── supabase/                # client / server / middleware
│   ├── types.ts                 # DB型
│   ├── constants.ts             # メーカー/地域/料金など
│   └── format.ts                # 通貨・日付フォーマット
├── supabase/schema.sql          # スキーマ + RLS + Storage + Realtime
└── middleware.ts                # セッション更新・認証ガード
```

## データモデル

`profiles` / `listings` / `listing_images` / `conversations` / `messages` / `escrow_transactions`
（詳細・RLSポリシーは `supabase/schema.sql` を参照）

## 料金（既定値・`lib/constants.ts` で変更可）

| 項目 | 金額 |
|---|---|
| エスクロー手数料 | ¥5,500 |
| 名義変更代行（通常） | ¥49,800 |
| 名義変更代行（遠隔・封印含む） | ¥69,800 |

## 今後の拡張（未実装）

- 実決済プロバイダ連携（Stripe等）でのエスクロー入出金
- お気に入り・通知・レビュー（取引相手評価）
- 画像の自動リサイズ・本人確認（KYC）
- 出品の編集・再出品 UI
