# API 契約仕様 — BUYMO C2C

本アプリは独自RESTを持たず、**Next.js Server Actions** と **Supabase（PostgREST / RPC / Storage / Realtime）**
をデータ境界とする。本書は各境界の入出力・権限・エラーを「契約」として定義する。

凡例: 認証=Supabase Cookieセッション。権限はRLSで強制（クライアント値は信用しない）。

---

## 1. Server Actions

すべて `'use server'`。戻り値は「`redirect()` する」か「`{ error: string | null }` を返す」の2系統。

### 1.1 startConversation
| 項目 | 内容 |
|---|---|
| 定義 | `app/listings/[id]/actions.ts` |
| 入力 | `FormData { listing_id: string }` |
| 認可 | 要ログイン。自分の出品は不可 |
| 効果 | conversation を取得 or 作成 |
| 結果 | `redirect('/messages/{id}')`（未ログイン→`/login`、自己出品→詳細へ） |
| 失敗 | 作成失敗時 `redirect('/listings/{id}?error=conversation')` |

### 1.2 setListingStatus
| 項目 | 内容 |
|---|---|
| 入力 | `(listingId: string, status: ListingStatus)` |
| 認可 | 売主のみ（`eq seller_id` + RLS） |
| 効果 | listings.status 更新（取り下げ=closed / 再出品=active） |
| 結果 | `revalidatePath` 詳細・ダッシュボード |

### 1.3 deleteListing
| 入力 | `(listingId: string)` |
|---|---|
| 認可 | 売主のみ |
| 効果 | Storage画像削除（URL→path復元）→ listings 削除（images/conversations/escrow は cascade） |
| 結果 | `redirect('/dashboard/listings')` |

### 1.4 sendMessage
| 入力 | `(conversationId: string, body: string)` |
|---|---|
| 認可 | 会話当事者かつ本人送信（RLS） |
| 検証 | `body.trim()` 空は `{error:'本文が空です'}` |
| 効果 | messages 追加（→ trigger で last_message_at 更新、Realtime配信） |
| 戻り | `{ error: string \| null }` |

### 1.5 createEscrow
| 入力 | `(conversationId: string)` |
|---|---|
| 認可 | 会話の買主のみ |
| 効果 | escrow_transactions 作成（amount=出品価格, escrow_fee=5500, title=standard/49800, status=initiated）+ listings=reserved |
| 結果 | `redirect('/escrow/{id}')`（既存あれば既存へ） |

### 1.6 advanceEscrow
| 入力 | `(escrowId: string)` |
|---|---|
| 認可 | 取引当事者 |
| 効果 | status を ORDER 配列で1段階前進。completed 到達で listings=sold |
| 備考 | 末尾(completed)では no-op。役割制御はUI側 NEXT_ACTION で表示制御 |
| 結果 | `revalidatePath('/escrow/{id}')` |

### 1.7 setTitleOption
| 入力 | `(escrowId: string, option: 'self'|'standard'|'remote')` |
|---|---|
| 認可 | 当事者。`status='initiated'` の時のみ反映 |
| 効果 | title_option / title_fee（0 / 49800 / 69800）更新 |

### 1.7.1 setPaymentMethod
| 入力 | `(escrowId, method: 'cash'|'loan'|'credit')` |
|---|---|
| 認可 | 買主。`status='initiated'` のみ |
| 効果 | payment_method 設定 + installment_fee 再計算（credit時 小計×4.2%） |

### 1.7.2 confirmEscrowPayment
| 入力 | `(escrowId, sourceId?: string)` … sourceId=Squareカードトークン |
|---|---|
| 認可 | 買主。`status='initiated'`・payment_method 選択済み |
| 効果 | credit & Square設定時は `createSquarePayment(total)` で課金→`square_payment_id`保存。現金/ローン or 未設定は記録のみ。成功で `status=funds_held` |
| 戻り | `{ error: string \| null }` |
| 備考 | total = amount+escrow_fee+title_fee+installment_fee。idempotency_key=`pay-{escrowId}` |

### 1.8 cancelEscrow
| 入力 | `(escrowId: string)` |
|---|---|
| 認可 | 当事者。`initiated|funds_held` のみ |
| 効果 | status=cancelled + listings=active へ復帰 |

### 1.9 submitReview
| 入力 | `(escrowId, revieweeId, rating: 1..5, comment)` |
|---|---|
| 認可 | 完了取引の当事者が相手のみ（RLS check） |
| 検証 | rating 範囲外は `{error}` / 1取引1人1回（unique制約） |
| 戻り | `{ error: string \| null }` |

---

## 2. Supabase データアクセス契約（PostgREST）

クライアント/サーバから supabase-js で発行。テーブルアクセスは **RLSが最終権限**。

### 2.1 listings
| 操作 | 例 | 権限(RLS) |
|---|---|---|
| 一覧/検索 | `select('*,listing_images(*),profiles(...)').eq('status','active')` + `or(ilike)` + range + `order` | active/reserved/sold は全員 |
| 詳細 | `select('*,listing_images(*),profiles(...)').eq('id',id)` | 同上、draft/closedは売主 |
| 作成 | `insert({seller_id, ...})` | seller_id=auth.uid |
| 更新/削除 | `update/delete().eq('id')` | 売主のみ |

検索パラメータ契約: `q, maker, model, body, pref, price(0-7), norepair(0/1), sort(new|price_asc|price_desc|mileage_asc|year_desc)`。

### 2.2 listing_images
`insert/delete`（売主のみ）。`url` は Storage 公開URL、`sort_order` 昇順=表示順（0=表紙）。

### 2.3 conversations / messages
- conversations: `select`（当事者）, `insert`（buyer=本人）
- messages: `select`（当事者）, `insert`（当事者&sender=本人）
- Realtime購読: `channel('messages:{cid}').on('postgres_changes',{event:'INSERT',table:'messages',filter:'conversation_id=eq.{cid}'})`

### 2.4 escrow_transactions
`select/insert/update`（当事者のみ）。金額・状態は §1.5–1.8 のアクション経由を推奨。

### 2.5 favorites
`select/insert/delete`（本人のみ）。PK=(user_id, listing_id) により重複防止。

### 2.6 reviews
- `select`: 全員（公開）
- `insert`: 完了取引の当事者が相手のみ。`unique(escrow_id, reviewer_id)`

---

## 3. RPC

### increment_listing_view
| 項目 | 内容 |
|---|---|
| シグネチャ | `increment_listing_view(p_listing_id uuid) returns void` |
| 実行 | `supabase.rpc('increment_listing_view', { p_listing_id })` |
| 特性 | SECURITY DEFINER（RLSを跨いで view_count を加算）。anon/authenticated に grant |
| 呼出 | 出品詳細表示時（自己出品を除く） |

### mark_conversation_read
| 項目 | 内容 |
|---|---|
| シグネチャ | `mark_conversation_read(p_conversation_id uuid) returns void` |
| 実行 | `supabase.rpc('mark_conversation_read', { p_conversation_id })` |
| 特性 | SECURITY DEFINER。呼出本人が当事者の側の `*_last_read_at` を now() に更新。authenticated に grant |
| 呼出 | スレッド表示時 / メッセージ送信時 |
| 未読判定 | `last_message_at > 自分の last_read_at`（`lib/unread.ts`） |

---

## 3.1 外部API — Square Payments（`lib/square.ts`）
| 項目 | 内容 |
|---|---|
| 関数 | `createSquarePayment({ sourceId, amountYen, idempotencyKey, note })` |
| 実体 | `POST {base}/v2/payments`（Square-Version, Bearer SQUARE_ACCESS_TOKEN） |
| base | sandbox=`connect.squareupsandbox.com` / production=`connect.squareup.com` |
| 通貨 | JPY（最小単位=1円。amountYen をそのまま送信） |
| 設定判定 | `isSquareConfigured()` = SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID |
| 環境変数 | SQUARE_ACCESS_TOKEN / SQUARE_LOCATION_ID / SQUARE_ENVIRONMENT / NEXT_PUBLIC_SQUARE_APPLICATION_ID / NEXT_PUBLIC_SQUARE_LOCATION_ID |
| クライアント | Web Payments SDK（`square.js`）でカードを tokenize → sourceId をサーバへ |

## 4. Storage

| 項目 | 内容 |
|---|---|
| バケット | `listing-images`（public read） |
| パス規約 | `{auth.uid}/{listingId}/{timestamp}-{i}.{ext}` |
| アップロード | authenticated かつ先頭フォルダ=自分のuid |
| 公開URL | `getPublicUrl(path).data.publicUrl` を listing_images.url に保存 |
| 削除 | URL から `/listing-images/` 以降を path として復元し `remove([...])` |

---

## 5. 認証エンドポイント

| パス | メソッド | 契約 |
|---|---|---|
| `/auth/callback?code=&redirect=` | GET | code→session 交換、成功で redirect、失敗で `/login?error=auth` |
| `/auth/signout` | POST | `auth.signOut()` 後 303 で `/` |

---

## 6. エラー方針
- **アクション(redirect系)**: 失敗は安全なURL（クエリに `?error=...`）へリダイレクト。
- **アクション(戻り値系)**: `{ error: string }` をUIが表示（フォーム近傍）。
- **RLS拒否**: supabase-js は `error` を返す。UIは汎用メッセージ表示・楽観更新はロールバック。
- **未認証**: middleware が保護パスを `/login?redirect=` へ。
