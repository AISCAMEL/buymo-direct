# 運営者向け要件 — BUYMO C2C

C2Cマーケットを運営するために必要な機能・運用・体制の要件。
**現状**: 専用の管理画面（admin）は未実装。当面は Supabase ダッシュボード + SQL で運用する前提。
本書は「現状で可能なこと」と「実装すべき要件」を分けて記す。

---

## 1. 運営ロールと権限

| ロール | 説明 | 現状 | 要件 |
|---|---|---|---|
| 一般ユーザー | 売主/買主 | 実装済（RLS） | — |
| 運営(admin) | 監視・係争対応・凍結 | 未実装 | `profiles.role` 追加 or admin判定、service_role 経由の管理機能 |
| サポート | 問い合わせ一次対応 | 未実装 | 閲覧中心の限定権限 |

**実装提案**: `profiles.role enum('user','support','admin')` を追加し、admin専用の RLS バイパス（service_role キーを使うサーバ専用ルート `/admin/*`）を用意。一般RLSは現状維持。

---

## 2. 運営機能要件（管理画面 /admin 構想）

| # | 機能 | 優先 | 内容 |
|---|---|---|---|
| O-1 | ダッシュボード | 高 | 登録数/出品数/取引数/GMV/手数料売上のKPI、期間推移 |
| O-2 | 出品モデレーション | 高 | 不適切出品の検索・非公開化（status=closed強制）・削除 |
| O-3 | 取引監視 | 高 | escrow一覧（状態/金額/経過日数）、滞留・長期未進行の検知 |
| O-4 | 係争対応 | 高 | status=`disputed` への切替、当事者メッセージ閲覧、返金/送金の裁定記録 |
| O-5 | ユーザー管理 | 中 | 凍結/解除、本人確認状況、通報履歴 |
| O-6 | 通報処理 | 中 | 出品/ユーザー/メッセージの通報を受理・対応 |
| O-7 | レビュー管理 | 中 | 規約違反レビューの非表示 |
| O-8 | 手数料・請求 | 中 | エスクロー/名義変更費の集計、月次レポート、出金管理 |
| O-9 | 監査ログ | 中 | admin操作の記録（誰が何を変更したか） |
| O-10 | お知らせ配信 | 低 | ✅ 実装済（上部バナー＋一覧。/admin/announcements で作成・公開管理） |

---

## 3. 取引・係争オペレーション

### 3.1 エスクロー滞留の扱い
| 状態 | 滞留時の運営アクション |
|---|---|
| initiated（未入金） | リマインド → 一定期間でキャンセル提案 |
| funds_held（保全中・未進行） | 双方に確認、必要に応じ係争(disputed)へ |
| title_transfer（名義変更停滞） | 提携行政書士へエスカレーション |
| disputed | 調査 → 返金 or 売主送金を裁定し記録 |

### 3.2 現状の手動オペ（admin未実装時）
- Supabase SQL Editor で対象 escrow を確認・`status` 更新
- 例: 係争化 `update escrow_transactions set status='disputed' where id='...';`
- 例: 強制非公開 `update listings set status='closed' where id='...';`
> service_role 接続のため RLS を跨いで操作可能。操作は記録（手動台帳）を推奨。

---

## 4. コンプライアンス・法令要件

| 項目 | 要件 |
|---|---|
| 古物営業法 | C2C仲介の位置づけ整理。買取・転売を行う場合は古物商許可の要否を確認 |
| 特定商取引法/資金決済法 | エスクロー（収納代行/前払式）該当性の法務確認。実決済導入時必須 |
| 名義変更 | 提携行政書士による代行。必要書類（譲渡証明・委任状・印鑑証明・車庫証明等）の案内 |
| 個人情報保護 | 個人情報の最小収集、プライバシーポリシー、削除要求対応 |
| 反社/本人確認 | KYC（本人確認）導入、反社チェック |
| 取引の安全 | 修復歴の表示義務、現車確認の推奨、禁止出品物の規定 |

---

## 5. 不正・リスク対策

| リスク | 対策（要件） |
|---|---|
| 代金持ち逃げ/未入金 | エスクローで保全（実装の中核）。実決済連携で実効化 |
| サクラ評価 | レビューは完了取引の当事者のみ（実装済RLSで担保） |
| なりすまし | KYC、メール確認、不審ログイン検知 |
| 不適切出品 | モデレーション、通報、NGワード検知 |
| 価格操作/スパム | 出品レート制限、画像/本文の自動審査 |
| チャット詐欺(外部誘導) | 連絡先交換の警告、外部決済への誘導禁止 |

---

## 6. 監視・運用（SRE）

| 項目 | 要件 |
|---|---|
| 稼働監視 | アプリ/Supabaseの死活・エラー率・レイテンシ |
| バックアップ | Supabase 自動バックアップ + 重要テーブルの定期エクスポート |
| ログ | アプリログ、認証イベント、admin監査ログ |
| アラート | 取引失敗率・決済エラー・係争急増の通知 |
| 指標(KPI) | DAU/MAU, 出品数, 成約率, GMV, 手数料売上, 平均成約日数, 評価分布 |

### 6.1 主要KPIの算出（参考SQL）
```sql
-- 成約GMV（完了取引の車両代金合計）
select coalesce(sum(amount),0) gmv, count(*) deals
from escrow_transactions where status='completed';

-- 手数料売上（完了取引）
select coalesce(sum(escrow_fee + title_fee),0) fee_revenue
from escrow_transactions where status='completed';

-- 出品ステータス内訳
select status, count(*) from listings group by status;

-- 平均評価
select round(avg(rating)::numeric,2) avg_rating, count(*) from reviews;
```

---

## 7. 問い合わせ・サポート体制
- 問い合わせ窓口（メール/フォーム）、FAQ、取引ガイド
- 係争受付フロー、対応SLA（例: 一次回答1営業日）
- 提携先連携: 行政書士（名義変更）、陸送、整備/鑑定

---

## 8. 実装ロードマップ（運営機能）
| フェーズ | 内容 | 状況 |
|---|---|---|
| P0 | Supabase ダッシュボード/SQL で手動運用 | ✅ |
| P1 | `profiles.role` + `/admin` ダッシュボード（KPI/取引/出品/ローン） | ✅ 実装済 |
| P2 | モデレーション・係争・ローン審査・通報受理・監査ログ | ✅ 実装済 |
| P3 | 実決済の返金/出金、自動検知（滞留/不正）、レポート自動化 | 未 |

### 8.1 実装済み /admin（ロールベース）
- アクセス制御: `profiles.role enum('user','admin')` + `is_admin()`（SECURITY DEFINER）。
  各テーブルに `*_admin_all` RLSポリシーを追加し、管理者のみ横断閲覧・更新可。
  ページは `requireAdmin()`、アクションは `isAdminUser()` で二重ガード。
- `/admin` … KPI（ユーザー/出品/GMV/手数料売上/進行中・係争/平均評価）
- `/admin/listings` … 出品モデレーション（非公開/公開復帰/削除）
- `/admin/escrow` … 取引監視（係争化/係争解除/キャンセル）
- `/admin/loans` … ローン仮審査のステータス変更（審査中/承認/否決）
- `/admin/reports` … 通報の受理（未対応/確認中/対応済み/却下）。出品・ユーザーの通報を一覧
- `/admin/audit` … 監査ログ（全管理操作を自動記録。閲覧のみ・改ざん不可）
- `/admin/announcements` … お知らせ作成・公開/非公開・削除（バナー表示の指定可）
- 管理者付与: `update public.profiles set role='admin' where id='<uuid>';`

### 8.4 お知らせ配信
- `announcements` テーブル（level: info/warning/important、pinned、published）。
- 公開済みは誰でも閲覧（RLS）、作成・更新・削除は管理者のみ。操作は監査ログに記録。
- 表示: `pinned` の最新1件をサイト上部バナー（`AnnouncementBanner`、localStorageで個別に閉じ可能）、
  全件は `/announcements` 一覧。

### 8.3 監査ログ
- `audit_logs` テーブルに全管理アクション（出品/取引/ローン/通報の変更・削除）を自動記録。
- 記録項目: actor_id（操作した管理者）/ action / target_type / target_id / created_at。
- RLS: 管理者のみ select、insert は `actor_id = auth.uid()` の管理者に限定。UPDATE/DELETE 不可（改ざん防止）。

### 8.2 通報フロー
- 利用者は出品詳細「この出品を通報」/ プロフィール「このユーザーを通報」から通報（`reports` テーブル）。
- 理由プリセット＋詳細。RLS: 本人insert/select、管理者は全件閲覧・ステータス更新。
- 管理者は `/admin/reports` で受理し、必要に応じ `/admin/listings` で非公開化・削除。
