import { LegalLayout, LegalSection } from '@/components/LegalLayout';

export const metadata = { title: 'プライバシーポリシー | BUYMO C2C' };

export default function PrivacyPage() {
  return (
    <LegalLayout title="プライバシーポリシー" updated="2026-06-16">
      <p>当社は、BUYMO C2C（以下「当サービス」）における利用者の個人情報を、以下の方針に基づき適切に取り扱います。</p>

      <LegalSection heading="1. 取得する情報">
        <p>氏名・メールアドレス・電話番号・地域等の登録情報、出品・取引・メッセージ・レビューの内容、ローン仮審査の申込情報（年収・雇用形態等）、アクセスログ等を取得します。</p>
      </LegalSection>

      <LegalSection heading="2. 利用目的">
        <p>本人確認、当サービスの提供・運営、取引の仲介、決済・名義変更・ローン審査の手続き、不正防止、お問い合わせ対応、サービス改善および重要なお知らせの送付のために利用します。</p>
      </LegalSection>

      <LegalSection heading="3. 第三者提供">
        <p>取引の遂行に必要な範囲で、提携する決済事業者（Square等）、提携ローン会社、行政書士・陸送会社等へ情報を提供する場合があります。法令に基づく場合を除き、本人の同意なく目的外の第三者提供は行いません。</p>
      </LegalSection>

      <LegalSection heading="4. 業務委託">
        <p>利用目的の達成に必要な範囲で、個人情報の取扱いを外部に委託する場合があります。その際は委託先に対し適切な監督を行います。</p>
      </LegalSection>

      <LegalSection heading="5. 安全管理">
        <p>個人情報への不正アクセス、紛失、漏えい等を防止するため、アクセス制御（行レベルセキュリティ等）・暗号化通信その他の合理的な安全管理措置を講じます。</p>
      </LegalSection>

      <LegalSection heading="6. Cookie等の利用">
        <p>ログイン状態の維持やサービス改善のためにCookie・ローカルストレージを使用します。</p>
      </LegalSection>

      <LegalSection heading="7. 開示・訂正・削除">
        <p>利用者は、自己の個人情報の開示・訂正・利用停止・削除を請求できます。お問い合わせ窓口までご連絡ください。アカウント削除時は関連データを所定の方針に従い削除します。</p>
      </LegalSection>

      <LegalSection heading="8. お問い合わせ窓口">
        <p>個人情報の取扱いに関するお問い合わせは、当サービスのお問い合わせ窓口までご連絡ください。［窓口・連絡先は公開前に確定してください］</p>
      </LegalSection>

      <LegalSection heading="9. 改定">
        <p>本ポリシーは、法令の変更やサービス内容の変更に応じて改定することがあります。</p>
      </LegalSection>
    </LegalLayout>
  );
}
