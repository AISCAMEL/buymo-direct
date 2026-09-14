# BUYMO C2C — OAuth セットアップガイド

ソーシャルログイン（Google / LINE）の設定手順です。
認証プロバイダーの資格情報は **Supabase Dashboard** で管理します（.env.local への記載は不要）。

---

## 共通: Supabase のリダイレクト URL 設定

Supabase Dashboard → **Authentication → URL Configuration** を開き、
**Redirect URLs** に以下を追加します。

```
http://localhost:3000/auth/callback        # ローカル開発
https://yourdomain.com/auth/callback      # 本番
```

---

## Google OAuth

### 1. Google Cloud Console でクライアントを作成

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. プロジェクトを選択または新規作成
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** を選択
4. アプリケーションの種類: **Web application**
5. **Authorized redirect URIs** に以下を追加:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
   `<project-ref>` は Supabase Dashboard の Project Settings → General で確認できます。
6. 作成後に表示される **Client ID** と **Client secret** をコピー

### 2. Supabase に登録

1. Supabase Dashboard → **Authentication → Providers → Google**
2. **Enable** をオンにする
3. **Client ID** と **Client Secret** を貼り付けて保存

---

## LINE Login

### 1. LINE Developers でチャネルを作成

1. [LINE Developers Console](https://developers.line.biz/) にログイン
2. **プロバイダー** を選択または新規作成
3. **新規チャネル作成 → LINE ログイン** を選択
4. チャネル情報を入力して作成
5. **チャネル設定 → LINE ログイン設定 → コールバック URL** に以下を追加:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
6. **チャネル基本設定** タブから **Channel ID** と **Channel secret** をコピー

### 2. Supabase に登録

1. Supabase Dashboard → **Authentication → Providers → LINE**
2. **Enable** をオンにする
3. **Client ID**（= Channel ID）と **Client Secret**（= Channel secret）を貼り付けて保存

### 3. スコープ

`SocialLoginButtons` コンポーネントは LINE に対して以下のスコープをリクエストします:
```
profile openid email
```
LINE Developers Console の **チャネル設定 → スコープ** で `email` スコープの利用申請が
必要な場合があります（審査不要の場合もあります）。

---

## 動作確認

1. `npm run dev` で起動
2. `/login` または `/signup` を開く
3. **LINEでログイン** / **Googleでログイン** ボタンをクリック
4. 各プロバイダーの認証画面にリダイレクトされることを確認
5. 認証後に `/auth/callback` を経由してアプリに戻ることを確認

---

## トラブルシューティング

| 症状 | 確認ポイント |
|---|---|
| `provider is not enabled` | Supabase Dashboard でプロバイダーが Enable になっているか |
| `redirect_uri_mismatch` | Supabase コールバック URL が各プロバイダーの許可リストに含まれているか |
| ログイン後に元のページに戻らない | `Redirect URLs` にアプリの `/auth/callback` が追加されているか |
| LINE でメールが取得できない | LINE Developers でメールスコープが承認されているか |

---

## TRUSTDOCK eKYC セットアップ

BUYMO の本人確認機能は [TRUSTDOCK](https://trustdock.io) と連携しています。
API キーが未設定の場合はモック動作（confidence 0.95 で常に認証成功）になります。

### 1. API キーと Customer ID の取得

1. [TRUSTDOCK ダッシュボード](https://dashboard.trustdock.io/) にログイン（またはアカウント登録）
2. **設定 → API キー** を開き **新規作成** をクリック
3. 生成された **API Key** をコピー
4. **設定 → 基本情報** に表示される **Customer ID** をコピー

### 2. 環境変数の設定

`.env.local` に以下を追加します:

```env
TRUSTDOCK_API_KEY=your_api_key_here
TRUSTDOCK_CUSTOMER_ID=your_customer_id_here

# アプリのベース URL（コールバック生成に使用）
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Webhook URL の設定

TRUSTDOCK ダッシュボード → **Webhook 設定** で以下の URL を登録してください:

```
https://yourdomain.com/api/kyc/ekyc-callback
```

ローカル開発時は [ngrok](https://ngrok.com/) 等でトンネルを作成して使用します:

```bash
ngrok http 3000
# 出力された https://<id>.ngrok.io/api/kyc/ekyc-callback を登録
```

イベントは `verification.completed`（または TRUSTDOCK が提供するすべての認証完了イベント）を選択してください。

### 4. テストモード

TRUSTDOCK ダッシュボードの **テストモード** を有効にすると、実際の書類なしで認証フローをテストできます。

テスト用ドキュメント番号などは [TRUSTDOCK 開発者ドキュメント](https://docs.trustdock.io) を参照してください。

### 5. API キー未設定時の動作（開発・ステージング）

`TRUSTDOCK_API_KEY` が未設定の場合:

- `verifyDocumentWithEkyc()` → モック結果（`verified: true`, `confidence: 0.95`）を返す
- `getEkycSessionUrl()` → `/kyc/demo?demo=1&user_id=...` を返す（デモページへリダイレクト）
- コールバックは `/api/kyc/ekyc-callback?session_id=<id>&status=approved` に手動アクセスして動作確認可能

### 6. Supabase テーブル

eKYC セッション管理に `kyc_verifications` テーブルが必要です。まだ作成されていない場合は以下の SQL を実行してください:

```sql
create table if not exists kyc_verifications (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'pending',
  trustdock_status text,
  redirect_url  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table kyc_verifications enable row level security;

create policy "users can read own verifications"
  on kyc_verifications for select
  using (auth.uid() = user_id);
```

### トラブルシューティング

| 症状 | 確認ポイント |
|---|---|
| `セッション作成失敗 (401)` | `TRUSTDOCK_API_KEY` が正しく設定されているか |
| `セッション作成失敗 (403)` | `TRUSTDOCK_CUSTOMER_ID` が一致しているか |
| コールバックが届かない | Webhook URL が TRUSTDOCK ダッシュボードに登録されているか、`NEXT_PUBLIC_APP_URL` が正しいか |
| `SUPABASE_SERVICE_ROLE_KEY が設定されていません` | `.env.local` にサービスロールキーが設定されているか |
