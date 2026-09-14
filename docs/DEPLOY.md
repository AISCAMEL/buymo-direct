# デプロイ手順書 — BUYMO C2C

Next.js（`marketplace/`）を **Vercel**、データベースを **Supabase** で本番公開する手順。

---

## ドメイン構成

| サービス | URL | 内容 |
|----------|-----|------|
| BUYMO C2C（個人売買） | `https://buymo.me` | Next.js アプリ（`marketplace/`）|
| BUYMO Direct（加盟店） | `https://direct.buymo.me` | 静的サイト（`index.html` / `dealer.html`）|

---

## 0. 前提
- GitHub にリポジトリがある（このリポジトリ）
- Vercel / Supabase のアカウント
- 独自ドメイン `buymo.me`（DNS 管理権限）
- （任意）Square 本番アカウント、Resend アカウント

---

## 1. Supabase（データベース・認証・ストレージ）

1. [supabase.com](https://supabase.com) で新規プロジェクト作成（リージョンは東京推奨）。
2. **SQL Editor** で `supabase/schema.sql` を実行（テーブル・RLS・Storage・Realtime・RPC・admin）。
3. （任意）`supabase/seed.sql` を実行してデモデータ投入。
4. **Authentication → Providers → Email** を有効化。
   - すぐ使うなら *Confirm email* をオフ（任意）。本番はオン推奨＋送信ドメイン設定。
   - **URL Configuration** の *Site URL* に本番URL（例 `https://buymo.me`）、
     *Redirect URLs* に `https://buymo.me/auth/callback` を追加。
5. **Storage** にバケット `listing-images` が作成されていることを確認（schema.sql が作成）。
6. **Project Settings → API** から以下を控える：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. Vercel（フロント/サーバ）

1. Vercel で **Add New → Project** → 本リポジトリをインポート。
2. **Root Directory** を `marketplace` に設定（重要：リポジトリ直下ではない）。
3. Framework: Next.js（自動検出）。Build Command / Output はデフォルトでOK。
4. **Environment Variables** を設定（下表）。
5. **Deploy**。

### 環境変数チェックリスト

| 変数 | 必須 | 用途 |
|---|:--:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon キー |
| `NEXT_PUBLIC_SITE_URL` | ✅ | 本番URL（認証リダイレクト等） |
| `SQUARE_ACCESS_TOKEN` | 任意 | クレジット決済（未設定はデモ） |
| `SQUARE_LOCATION_ID` | 任意 | 同上 |
| `SQUARE_ENVIRONMENT` | 任意 | `production` / `sandbox` |
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | 任意 | カードフォーム（クライアント） |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | 任意 | 同上 |
| `RESEND_API_KEY` | 任意 | メール通知（未設定は送信スキップ） |
| `EMAIL_FROM` | 任意 | 送信元（検証済みドメイン） |
| `OPS_EMAIL` | 任意 | 運営の通知先（通報・申込） |

> `NEXT_PUBLIC_` 接頭辞の変数はクライアントに露出します。秘密キー（`SQUARE_ACCESS_TOKEN`・
> `RESEND_API_KEY`）には付けないこと。

---

## 3. 管理者ユーザーの作成
1. 本番サイトでアカウント登録（`/signup`）。
2. Supabase SQL Editor で対象ユーザーを管理者に昇格：
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. 再ログイン後、ヘッダーに「管理」、`/admin` にアクセス可能。

---

## 4. 外部サービス（任意・本番化）

### Square（クレジット決済）
- Square Developer Dashboard で本番アプリ＋ロケーションを用意。
- `SQUARE_ENVIRONMENT=production`、サーバ用トークンとクライアント用 Application ID/Location ID を設定。
- まず Sandbox で `4111 1111 1111 1111` 等のテストカードで決済フローを確認。

### Resend（メール通知）
- 送信ドメインを検証（DNS: SPF/DKIM）。`EMAIL_FROM` を検証済みアドレスに。
- `OPS_EMAIL` に運営の受信先を設定。

---

## 5. デプロイ後チェック（スモークテスト）
- [ ] トップ表示・新着出品の画像が出る
- [ ] 新規登録 → ログイン → ログアウト
- [ ] 出品作成（画像アップロード＝リサイズされて保存）
- [ ] 検索・絞り込み・並び替え
- [ ] 出品詳細から「出品者にメッセージ」→ スレッドで送受信（別アカウント）
- [ ] 購入手続き → 支払い方法（現金/ローン/クレジット）→ 入金 → 各ステップ → 完了
- [ ] レビュー投稿・公開プロフィール表示
- [ ] 通報 → `/admin/reports` に出る
- [ ] `/admin` KPI・モデレーション・監査ログ・お知らせ
- [ ] フッターの規約/プライバシー/特商法

---

## 6. 運用メモ
- **バックアップ**：Supabase の自動バックアップ＋重要テーブルの定期エクスポート。
- **監視**：Vercel Analytics / ログ、（任意）Sentry でエラー監視。
- **スケール**：画像はアップ前にクライアントで長辺1600pxへ縮小済み（`lib/image.ts`）。
- **法務**：`/terms` `/privacy` `/tokushoho` の `［…］` を実情報に置換し、専門家確認の上で公開。

---

## 7. よくあるトラブル
| 症状 | 対処 |
|---|---|
| ビルドは通るがデータが出ない | Vercel の Supabase 環境変数を確認。Root Directory が `marketplace` か確認 |
| ログイン後すぐログアウトされる | `NEXT_PUBLIC_SITE_URL` と Supabase の Site/Redirect URL の不一致を確認 |
| 画像が表示されない | Storage バケット `listing-images` が public か、RLS ポリシーを確認 |
| メールが届かない | `RESEND_API_KEY`・`EMAIL_FROM`（ドメイン検証）・`OPS_EMAIL` を確認 |
| クレジット決済が通らない | Square の環境（sandbox/production）とキーの対応、通貨=JPY を確認 |
