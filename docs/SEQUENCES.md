# シーケンス図 — BUYMO C2C

実装（Server Actions / Supabase / RLS）に基づく主要フローのシーケンス図。
GitHub 上では Mermaid が描画されます。

---

## 1. 会員登録・ログイン

```mermaid
sequenceDiagram
    participant U as ユーザー(ブラウザ)
    participant FE as Next.js (AuthForm/client)
    participant SB as Supabase Auth
    participant DB as Postgres(profiles)

    U->>FE: /signup で メール/PW/表示名 入力
    FE->>SB: auth.signUp({email, password, data:{display_name}})
    SB-->>DB: trigger handle_new_user → profiles 自動INSERT
    alt メール確認OFF
        SB-->>FE: session 返却
        FE->>U: redirect(redirect先 or /)
    else メール確認ON
        SB-->>U: 確認メール送信
        U->>FE: メールのリンク /auth/callback?code=...
        FE->>SB: exchangeCodeForSession(code)
        SB-->>FE: session
        FE->>U: redirect
    end
```

---

## 2. 出品（画像アップロード込み）

```mermaid
sequenceDiagram
    participant U as 売主
    participant FE as ListingForm (client)
    participant ST as Supabase Storage
    participant DB as Postgres

    U->>FE: /sell でフォーム送信(画像N枚)
    FE->>DB: insert listings (status=active) [RLS: seller_id=auth.uid]
    DB-->>FE: listing.id
    loop 画像ごと
        FE->>ST: upload listing-images/{uid}/{listingId}/{file}
        ST-->>FE: path
        FE->>ST: getPublicUrl(path)
        FE->>DB: insert listing_images {listing_id, url, sort_order}
    end
    FE->>U: redirect /listings/{id}
```

---

## 3. 問い合わせ（会話開始）

```mermaid
sequenceDiagram
    participant B as 買主
    participant FE as 詳細ページ(form action)
    participant SA as startConversation (server action)
    participant DB as Postgres

    B->>FE: 「出品者にメッセージ」送信
    FE->>SA: startConversation(listing_id)
    SA->>DB: auth.getUser()
    alt 未ログイン
        SA-->>B: redirect /login?redirect=...
    else 自分の出品
        SA-->>B: redirect /listings/{id}
    else 通常
        SA->>DB: select conversations (listing_id, buyer_id)
        alt 既存あり
            SA-->>B: redirect /messages/{existing}
        else なし
            SA->>DB: insert conversations [RLS: buyer_id=auth.uid]
            SA-->>B: redirect /messages/{new}
        end
    end
```

---

## 4. メッセージ送信（Realtime）

```mermaid
sequenceDiagram
    participant A as 送信者
    participant FE as MessageThread (client)
    participant SA as sendMessage (server action)
    participant DB as Postgres
    participant RT as Supabase Realtime
    participant B as 相手(別ブラウザ)

    A->>FE: 本文入力→送信
    FE->>SA: sendMessage(conversationId, body)
    SA->>DB: insert messages [RLS: 当事者&本人]
    DB-->>DB: trigger bump_conversation (last_message_at)
    DB-->>RT: WAL → publication supabase_realtime
    RT-->>B: postgres_changes(INSERT, filter=conversation_id)
    RT-->>A: 同上(自分の購読にも反映/重複はid排除)
    B->>B: setMessages 追記・自動スクロール
```

---

## 5. エスクロー取引（作成→完了→評価）

```mermaid
sequenceDiagram
    participant B as 買主
    participant S as 売主
    participant SA as escrow/actions
    participant DB as Postgres

    B->>SA: createEscrow(conversationId)
    SA->>DB: insert escrow_transactions(status=initiated, fee/amount)
    SA->>DB: update listings status=reserved
    SA-->>B: redirect /escrow/{id}

    B->>SA: setTitleOption(id, option)  %% initiated中のみ
    SA->>DB: update title_option/title_fee

    B->>SA: setPaymentMethod(id, 現金/ローン/クレジット)
    SA->>DB: update payment_method, installment_fee(=credit時 小計×4.2%)
    alt クレジット & Square設定済み
        B->>SA: confirmEscrowPayment(id, sourceId)
        SA->>SQ: createSquarePayment(total) %% Square Payments API
        SQ-->>SA: payment.id
        SA->>DB: update status=funds_held, square_payment_id
    else 現金/ローン or デモ
        B->>SA: confirmEscrowPayment(id)
        SA->>DB: update status=funds_held
    end
    Note over B,S: 現車確認・受け渡し
    B->>SA: advanceEscrow(id)  %% →inspection
    B->>SA: advanceEscrow(id)  %% →title_transfer (名義変更)
    B->>SA: advanceEscrow(id)  %% →completed
    SA->>DB: update status=completed
    SA->>DB: update listings status=sold

    par 双方が評価
        B->>SA: submitReview(id, sellerId, rating, comment)
        SA->>DB: insert reviews [RLS: 完了&当事者]
    and
        S->>SA: submitReview(id, buyerId, rating, comment)
        SA->>DB: insert reviews
    end
```

> 進行権限: `initiated→funds_held`=買主 / `funds_held→inspection`=両者 /
> `inspection→title_transfer`=両者 / `title_transfer→completed`=買主。
> `initiated|funds_held` ではキャンセル可（cancelEscrow → listing=active へ復帰）。

---

## 6. お気に入りトグル

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant FE as FavoriteButton (client, 楽観更新)
    participant DB as Postgres

    U->>FE: ハートをタップ
    alt 未ログイン
        FE-->>U: redirect /login?redirect=...
    else 追加
        FE->>FE: setFav(true) 楽観
        FE->>DB: insert favorites(user_id, listing_id) [RLS:本人]
        alt 失敗
            FE->>FE: setFav(false) ロールバック
        end
    else 解除
        FE->>FE: setFav(false) 楽観
        FE->>DB: delete favorites where user_id & listing_id
    end
    FE->>FE: router.refresh()
```

---

## 7. 出品詳細表示と閲覧数

```mermaid
sequenceDiagram
    participant U as 閲覧者
    participant RSC as listings/[id] (Server Component)
    participant DB as Postgres

    U->>RSC: GET /listings/{id}
    RSC->>DB: select listing + images + seller
    alt 非自己出品
        RSC->>DB: rpc increment_listing_view(id)  %% SECURITY DEFINER
    end
    RSC->>DB: select reviews(rating) where reviewee=seller  %% 平均評価
    RSC->>DB: select favorites (本人&listing)               %% ハート初期状態
    RSC-->>U: HTML（詳細/出品者評価/お気に入り状態）
```
