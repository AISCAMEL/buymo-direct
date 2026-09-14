# BUYMO C2C マーケットプレイス 開発仕様書

| 項目 | 内容 |
|---|---|
| プロダクト名 | BUYMO C2C（個人間中古車売買マーケットプレイス） |
| 版 | 1.0 |
| 最終更新 | 2026-06-15 |
| リポジトリ位置 | `marketplace/`（既存の静的サイト BUYMO Direct とは独立） |
| ステータス | 実装済み（実決済・通知は未実装。デモ/MVP段階） |

### 関連ドキュメント
| 文書 | 内容 |
|---|---|
| [SEQUENCES.md](./SEQUENCES.md) | シーケンス図（登録/出品/会話/メッセージ/エスクロー/お気に入り/閲覧数） |
| [API.md](./API.md) | API契約（Server Actions / PostgREST / RPC / Storage / 認証 / エラー方針） |
| [WIREFRAMES.md](./WIREFRAMES.md) | 全画面のワイヤーフレーム |
| [OPERATIONS.md](./OPERATIONS.md) | 運営者向け要件（管理機能・係争・コンプラ・KPI・ロードマップ） |
| [DEPLOY.md](./DEPLOY.md) | 本番デプロイ手順（Vercel + Supabase・環境変数・スモークテスト） |
| [mockup.html](./mockup.html) | 主要画面の静的モックアップ |

---

## 1. 概要

個人どうしが業者を介さずに中古車を直接売買できる C2C マーケットプレイス。
出品・検索・メッセージ・エスクロー決済・名義変更代行をワンストップで提供し、
個人間取引の「代金回収」「現車確認」「名義変更」「相手の信頼性」の不安を解消する。

### 1.1 想定ユーザー
- **売主**: 個人で所有車を売りたい人
- **買主**: 個人売買で割安に中古車を買いたい人
- （将来）**運営**: 取引監視・係争対応

### 1.2 提供価値
- 業者マージンを排した直接取引
- エスクローによる代金保全（持ち逃げ・未入金の防止）
- 名義変更代行（通常/遠隔）の組込み
- 取引完了者のみが書ける相互レビューによる信頼形成

---

## 2. システム構成

```
ブラウザ
  │  HTTPS
  ▼
Next.js 15 (App Router / Server Components / Server Actions)
  ├─ middleware.ts … Supabase セッション更新 + 認証ガード
  │
  ▼ @supabase/ssr / supabase-js
Supabase
  ├─ Auth        … メール+パスワード認証
  ├─ PostgreSQL  … 業務データ（RLSで保護）
  ├─ Storage     … 出品画像（listing-images バケット）
  └─ Realtime    … messages テーブルの即時購読
```

### 2.1 技術スタック
| 層 | 採用技術 |
|---|---|
| フロント/サーバ | Next.js 15.5.x（App Router, Server Actions）, React 18, TypeScript 5 |
| スタイル | Tailwind CSS 3 |
| アイコン | lucide-react |
| BaaS | Supabase（Auth / Postgres / Storage / Realtime） |
| 認証連携 | @supabase/ssr（Cookieベースのセッション） |

### 2.2 ディレクトリ構成
```
marketplace/
├── app/
│   ├── page.tsx                    # トップ（新着出品）
│   ├── listings/page.tsx           # 検索一覧
│   ├── listings/[id]/page.tsx      # 出品詳細
│   ├── listings/[id]/edit/page.tsx # 出品編集
│   ├── listings/[id]/actions.ts    # 会話開始/状態変更/削除
│   ├── sell/page.tsx               # 出品作成
│   ├── messages/                   # 一覧・スレッド・送信アクション
│   ├── escrow/[id]/page.tsx        # エスクロー取引
│   ├── escrow/actions.ts           # 取引作成/進行/評価/キャンセル
│   ├── dashboard/listings|favorites|profile/
│   ├── users/[id]/page.tsx         # 公開プロフィール
│   ├── login|signup|auth/          # 認証
│   └── layout.tsx, globals.css
├── components/                     # UI部品（下記4.4）
├── lib/
│   ├── supabase/{client,server,middleware}.ts
│   ├── types.ts                    # DB型（手書き）
│   ├── constants.ts                # メーカー/地域/料金/ステップ定義
│   ├── format.ts                   # 通貨・日付・cn()
│   └── favorites.ts                # お気に入り集合取得ヘルパ
├── supabase/schema.sql             # スキーマ + RLS + Storage + Realtime + RPC
├── supabase/seed.sql               # デモデータ（ユーザー/出品/取引/お知らせ）
├── middleware.ts
└── docs/SPEC.md                    # 本書
```

---

## 3. データモデル

### 3.1 ER 概要
```
auth.users 1──1 profiles 1──* listings 1──* listing_images
                  │              │
                  │              ├──* conversations ──* messages
                  │              └──* escrow_transactions ──* reviews
                  └──* favorites *── listings
```

### 3.2 テーブル定義（主要カラム）

#### profiles（公開プロフィール）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | auth.users.id 参照 |
| display_name | text | 表示名 |
| avatar_url, prefecture, bio | text | 任意 |
| created_at, updated_at | timestamptz | |

> 新規ユーザー登録時にトリガ `handle_new_user` が profiles を自動作成。

#### listings（出品）
| カラム | 型 | 備考 |
|---|---|---|
| id | uuid PK | |
| seller_id | uuid | profiles 参照 |
| title, maker, model | text | |
| year, mileage_km, price | int | price は税込円 |
| body_type, transmission, fuel, color | text | 任意 |
| prefecture | text | |
| repair_history | bool | 修復歴あり=true |
| description | text | |
| status | enum `listing_status` | draft/active/reserved/sold/closed |
| view_count | int | 閲覧数 |

#### listing_images
listing_id, url（Storage公開URL）, sort_order（0=表紙）

#### conversations（出品単位の 売主×買主 スレッド）
listing_id, buyer_id, seller_id, last_message_at, buyer_last_read_at, seller_last_read_at  / `unique(listing_id, buyer_id)`

#### messages
conversation_id, sender_id, body, created_at（Realtime対象）

#### escrow_transactions
| カラム | 型 | 備考 |
|---|---|---|
| listing_id, conversation_id, buyer_id, seller_id | uuid | |
| amount | int | 車両代金 |
| escrow_fee | int | 既定 ¥5,500 |
| title_option | enum | self/standard/remote |
| title_fee | int | 0 / 49,800 / 69,800 |
| payment_method | enum `payment_method` | cash/loan/credit（null=未選択） |
| installment_fee | int | クレジット分割手数料（4.2%） |
| square_payment_id | text | Square 決済ID（クレジット時） |
| status | enum `escrow_status` | 下記5.4 |

#### favorites
user_id, listing_id, created_at / PK(user_id, listing_id)

#### reviews
escrow_id, reviewer_id, reviewee_id, rating(1-5), comment / `unique(escrow_id, reviewer_id)`

### 3.3 ENUM
- `listing_status`: draft, active, reserved, sold, closed
- `escrow_status`: initiated, funds_held, inspection, title_transfer, completed, cancelled, disputed
- `title_transfer_option`: self, standard, remote
- `payment_method`: cash, loan, credit

### 3.4 トリガ / RPC
| 名称 | 種別 | 役割 |
|---|---|---|
| handle_new_user | AFTER INSERT on auth.users | profiles 自動作成 |
| touch_updated_at | BEFORE UPDATE | updated_at 更新 |
| bump_conversation | AFTER INSERT on messages | last_message_at 更新 |
| increment_listing_view(uuid) | RPC (SECURITY DEFINER) | 閲覧数加算（RLS跨ぎ） |
| mark_conversation_read(uuid) | RPC (SECURITY DEFINER) | 呼出本人側の最終既読時刻を更新 |

---

## 4. 機能仕様

### 4.1 ルート一覧
| パス | 種別 | 認証 | 概要 |
|---|---|---|---|
| `/` | 公開 | 任意 | 新着出品・サービス説明 |
| `/listings` | 公開 | 任意 | 検索（キーワード/絞り込み/並び替え） |
| `/listings/[id]` | 公開 | 任意 | 出品詳細・問い合わせ・お気に入り |
| `/listings/[id]/edit` | 保護 | 売主本人 | 出品編集 |
| `/sell` | 保護 | 要 | 出品作成 |
| `/messages` | 保護 | 要 | スレッド一覧 |
| `/messages/[id]` | 保護 | 当事者 | スレッド（Realtime）・取引開始 |
| `/escrow/[id]` | 保護 | 当事者 | エスクロー進行・評価 |
| `/dashboard/listings` | 保護 | 要 | 出品・取引管理 |
| `/dashboard/searches` | 保護 | 要 | 保存した検索 |
| `/dashboard/favorites` | 保護 | 要 | お気に入り一覧 |
| `/dashboard/profile` | 保護 | 要 | プロフィール編集 |
| `/users/[id]` | 公開 | 任意 | 公開プロフィール（評価/出品/レビュー） |
| `/loan/apply` | 保護 | 要 | ローン仮審査申込 |
| `/admin` 配下 | 保護 | 管理者 | 運営コンソール（KPI/出品/取引/ローン） |
| `/announcements` | 公開 | 任意 | お知らせ一覧 |
| `/terms`, `/privacy`, `/tokushoho` | 公開 | — | 利用規約・プライバシー・特商法表記 |
| `/login`, `/signup` | 公開 | — | 認証 |
| `/auth/callback` | — | — | メール確認コード交換 |
| `/auth/signout` | POST | — | ログアウト |

保護パス（`/sell`, `/dashboard`, `/messages`, `/escrow`）は `middleware.ts` で未ログイン時に `/login?redirect=` へ誘導。

### 4.2 サーバーアクション
| アクション | ファイル | 権限 | 処理 |
|---|---|---|---|
| startConversation | listings/[id]/actions | ログイン・非自己出品 | 会話作成/取得→スレッドへ |
| setListingStatus | listings/[id]/actions | 売主 | active↔closed |
| deleteListing | listings/[id]/actions | 売主 | 出品+Storage画像削除（cascade） |
| sendMessage | messages/[id]/actions | 当事者 | メッセージ追加 |
| createEscrow | escrow/actions | 買主 | 取引作成・出品を reserved に |
| advanceEscrow | escrow/actions | 当事者 | 状態を1段階進行 |
| setTitleOption | escrow/actions | 当事者(initiated時) | 名義変更オプション変更 |
| cancelEscrow | escrow/actions | 当事者 | 取引キャンセル・出品を active に戻す |
| submitReview | escrow/actions | 完了取引当事者 | 相手を評価 |

### 4.3 主要ユースケースフロー
**出品→成約**
1. 売主が `/sell` で出品（画像Storageアップロード→listings/listing_images）
2. 買主が詳細から「出品者にメッセージ」→ conversation 作成
3. メッセージで条件合意
4. 買主が「購入手続きへ」→ escrow 作成（listing=reserved）
5. エスクロー進行（5.4）→ completed（listing=sold）
6. 双方が相手をレビュー

### 4.4 主要コンポーネント
Header / ListingCard / ListingGrid / SearchFilters / SortSelect /
ListingForm（作成・編集兼用）/ OwnerListingControls / FavoriteButton /
MessageThread（Realtime）/ EscrowStepper / ReviewForm / RatingStars /
ProfileForm / AuthForm

---

## 5. 詳細仕様

### 5.1 認証
- Supabase Auth（メール+パスワード）。`signUp` 時 `display_name` を user metadata に保存。
- メール確認が有効な場合は `/auth/callback` でコード交換。
- セッションは Cookie 管理、`middleware.ts` が毎リクエストで更新。

### 5.2 検索仕様（/listings）
- クエリパラメータ: `q`（キーワード）, `maker`, `model`, `body`, `pref`, `price`(0-7), `norepair`(0/1), `sort`
- キーワードは `title / maker / model` の ILIKE 部分一致
- 並び替え: new / price_asc / price_desc / mileage_asc / year_desc
- 対象は `status='active'` のみ

### 5.3 料金（既定値・`lib/constants.ts`）
| 項目 | 金額 |
|---|---|
| エスクロー手数料 | ¥5,500 |
| 名義変更代行（通常） | ¥49,800 |
| 名義変更代行（遠隔・封印含む） | ¥69,800 |
| クレジット分割手数料 | 小計 × 4.2%（クレジット選択時のみ） |
| 買主合計 | 車両代金 + エスクロー手数料 + 名義変更費 + 分割手数料 |

### 5.3.1 支払い方法（Square）
| 方法 | オンライン決済 | 追加手数料 / 金利 |
|---|---|---|
| 現金 | なし（受け渡し時） | — |
| ローン（提携クレジット） | なし（審査別途） | 年率 6.8%〜（審査で決定・エスクロー合計には非加算） |
| クレジットカード | Square Web Payments SDK で決済 | 分割手数料 4.2%（合計に加算） |

- 入金ステップ（initiated→funds_held）で買主が方法を選択。
- クレジットは Square Payments API（`lib/square.ts`）で課金、`square_payment_id` を保存。
- 環境変数未設定時はデモモード（無課金）で状態のみ進行。
- クレジット分割手数料 = `round((amount + escrow_fee + title_fee) × 0.042)`。
- ローン年率 6.8%〜（`LOAN_APR_FROM`）は開示表示のみ。分割金利は提携ローン会社との契約で、
  エスクロー合計（現金価格）には加算しない。
- ローン選択時は返済シミュレーション（`LoanSimulator` / `lib/loan.ts`）を表示。
  元利均等で支払回数12〜72回の月々・総支払・金利を試算。**頭金・ボーナス併用**に対応
  （ボーナスは半年複利の元利均等で年2回加算）。
- 出品詳細・一覧カードに「ローン月々 ¥◯〜（60回・年率6.8%・頭金0）」の目安を表示。
- ローン仮審査申込（`/loan/apply`）：試算＋お客様情報を入力して `loan_applications` に登録
  （提携ローン会社へのリード）。マイページ `/dashboard/loans` で申込状況を確認。

### 5.4 エスクロー状態遷移
```
initiated ──(買主入金)──▶ funds_held ──(現車確認)──▶ inspection
   ──(名義変更開始)──▶ title_transfer ──(完了/送金)──▶ completed
initiated / funds_held ──(キャンセル)──▶ cancelled（出品をactiveに戻す）
（disputed は係争中・手動対応用の予約状態）
```
- completed で listing=sold、双方レビュー可能
- 進行操作の実行権限は NEXT_ACTION 定義に基づき buyer / seller / both を制御

### 5.5 通知・閲覧数
- 閲覧数: 詳細表示時に RPC で加算（自己出品は除外）
- 未読バッジ: conversations の `{buyer,seller}_last_read_at` と `last_message_at` を
  比較して未読判定。ヘッダーのメッセージに未読件数、一覧に未読ドットを表示。
  スレッド表示時・送信時に `mark_conversation_read` で既読化（実装済）。
- プッシュ/メール通知: 未実装（将来対応）

---

## 6. セキュリティ（RLS）

全業務テーブルで Row Level Security 有効。主な方針:
| テーブル | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| profiles | 全員 | 本人のみ |
| listings | active/reserved/sold は全員、draft/closed は売主 | 売主のみ |
| listing_images | 出品が見える人 | 売主のみ |
| conversations / messages | 当事者のみ | 当事者のみ（messagesは本人送信） |
| escrow_transactions | 当事者のみ | 当事者のみ |
| favorites | 本人のみ | 本人のみ |
| reviews | 全員 | 完了取引の当事者が相手のみ評価可 |

Storage `listing-images`: 公開読取、書込/削除は `{uid}/` 配下に限定。

---

## 7. 環境・セットアップ

### 7.1 環境変数
| 変数 | 用途 |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase プロジェクトURL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | anon キー |
| NEXT_PUBLIC_SITE_URL | 認証リダイレクト用公開URL |

### 7.2 手順
1. Supabase プロジェクト作成
2. `supabase/schema.sql` を SQL Editor で実行（冪等）
3. `.env.local` 設定
4. `npm install && npm run dev`
5. 検証: `npm run typecheck` / `npm run build`

---

## 8. 非機能・品質
- レスポンシブ（Tailwind ブレークポイント）
- 型安全: `tsc --noEmit` パス
- ビルド: `next build` 全ルートパス（17ルート）
- 動的レンダリング: データ取得ページは `force-dynamic`

---

## 9. 今後の拡張（未実装・優先度順）
| 優先 | 項目 | 概要 |
|---|---|---|
| 高 | 売主への送金/返金 | Square Payouts/Refunds 連携（クレジット入金は実装済） |
| 高 | プッシュ/メール通知 | 新着メッセージ/取引進行の外部通知（未読バッジは実装済） |
| 中 | 本人確認（KYC） | 個人売買の安全性向上 |
| ~~中~~ | ~~画像処理~~ | ✅ 実装済（アップ前に長辺1600px縮小＋EXIF除去 `lib/image.ts`） |
| ~~中~~ | ~~シードデータ~~ | ✅ 実装済（`supabase/seed.sql`） |
| 中 | 法務ページの文面確定 | 規約/プライバシー/特商法は雛形を実装済（要専門家確認） |
| 低 | 静的サイト導線統合 | BUYMO Direct ↔ C2C 相互リンク |
| 低 | 多言語対応 | i18n |
