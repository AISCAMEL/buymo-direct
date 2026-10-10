import { LegalLayout, LegalSection } from '@/components/LegalLayout';
import { OPERATOR } from '@/lib/operator';

export const metadata = { title: 'プライバシーポリシー | BUYMO ダイレクト' };

export default function PrivacyPage() {
  return (
    <LegalLayout title="プライバシーポリシー" updated="2026-10-10">
      <p>
        {OPERATOR.companyName}（以下「当社」）は、{OPERATOR.serviceName}（以下「当サービス」）における個人情報を、個人情報の保護に関する法律（以下「個人情報保護法」）その他の関係法令・ガイドラインを遵守し、以下の方針（以下「本ポリシー」）に基づき適切に取り扱います。
      </p>

      <LegalSection heading="1. 事業者の名称・所在地・代表者">
        <p>
          個人情報取扱事業者：{OPERATOR.companyName}<br />
          所在地：{OPERATOR.address}<br />
          代表者：{OPERATOR.representative}<br />
          古物商許可：{OPERATOR.antiqueDealerLicense}
        </p>
      </LegalSection>

      <LegalSection heading="2. 取得する個人情報">
        <p>当社は、適正かつ公正な手段により、以下の情報を取得します。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>登録情報：氏名、メールアドレス、電話番号、住所・都道府県、生年月日、パスワード（暗号化して保管）</li>
          <li>本人確認情報：運転免許証等の本人確認書類の画像・記載事項（犯罪収益移転防止法・古物営業法に基づく確認を含む）</li>
          <li>取引情報：出品・購入・買取・オークション入札・落札、見学／試乗の予約、メッセージ、レビュー、名義変更・陸送に関する情報</li>
          <li>車両・物品情報：車台番号、登録情報、走行距離、状態、画像等</li>
          <li>決済・金融情報：決済手段の種別、ローン仮審査の申込情報（年収・雇用形態等）。クレジットカード番号等は提携決済事業者が取得・管理し、当社は保持しません。</li>
          <li>利用情報：IPアドレス、Cookie・ローカルストレージの識別子、閲覧・操作履歴、端末・ブラウザ情報、アクセスログ</li>
        </ul>
        <p>要配慮個人情報は、法令で認められる場合またはご本人の同意がある場合を除き取得しません。</p>
      </LegalSection>

      <LegalSection heading="3. 利用目的">
        <p>取得した個人情報は、次の目的の範囲内で利用します。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>本人確認、会員登録・認証、当サービスの提供・運営</li>
          <li>C2C取引の仲介、当社による車両の買取（査定・引取り・代金支払・還付金案内）、パーツオークションの運営</li>
          <li>エスクロー決済・名義変更代行・陸送手配・ローン仮審査等の手続き</li>
          <li>料金・手数料の請求・精算、加盟店・プロへの成約手数料の算定</li>
          <li>見学・試乗の日程調整およびリマインド等の連絡</li>
          <li>不正・なりすまし・外部誘導等の検知・防止、安全確保、紛争対応</li>
          <li>お問い合わせ・サポート対応、重要なお知らせの送付</li>
          <li>サービスの改善・開発、統計データの作成（個人を識別できない形に加工）</li>
          <li>ご同意いただいた範囲での、当社・提携先のサービスに関するご案内</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. 第三者提供">
        <p>当社は、次の場合を除き、あらかじめご本人の同意を得ずに個人情報を第三者に提供しません。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>法令に基づく場合、人の生命・身体・財産の保護に必要で同意取得が困難な場合</li>
          <li>取引の相手方（出品者・購入者・落札者等）に対し、取引遂行に必要な範囲で連絡先・取引情報を提供する場合</li>
          <li>決済事業者（Square 等）、提携ローン会社、行政書士、陸送会社、古物市場等へ、取引・手続きの遂行に必要な範囲で提供する場合</li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. 業務委託・共同利用">
        <p>利用目的の達成に必要な範囲で、個人情報の取扱いを外部（クラウド・システム保守・カスタマーサポート等）に委託することがあります。委託先に対しては適切な監督を行います。</p>
      </LegalSection>

      <LegalSection heading="6. 外国にある第三者への提供">
        <p>
          当サービスは、クラウドインフラ・決済等において国外に設備を持つ事業者（例：Supabase、Square 等）を利用する場合があり、個人情報が当該国に移転されることがあります。移転先の国の制度や当該事業者の講じる措置については、個人情報保護法に基づき、ご請求に応じて情報提供します。
        </p>
      </LegalSection>

      <LegalSection heading="7. 安全管理措置">
        <p>当社は、個人情報への不正アクセス・紛失・漏えい・改ざん等を防止するため、次の措置を講じます。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>組織的措置：取扱責任者の設置、取扱規程の整備、取扱状況の点検</li>
          <li>技術的措置：アクセス制御（行レベルセキュリティ等）、通信の暗号化（TLS）、認証・権限管理</li>
          <li>人的措置：従業者への教育、秘密保持の徹底</li>
        </ul>
      </LegalSection>

      <LegalSection heading="8. Cookie 等の利用">
        <p>当サービスは、ログイン状態の維持、利便性向上、利用状況の分析のため Cookie・ローカルストレージ等を使用します。ブラウザ設定により Cookie を無効化できますが、一部機能がご利用いただけない場合があります。</p>
      </LegalSection>

      <LegalSection heading="9. 保有個人データの開示・訂正・利用停止等">
        <p>ご本人は、個人情報保護法に基づき、保有個人データの利用目的の通知、開示、訂正・追加・削除、利用停止・消去、第三者提供停止を請求できます。当社は、ご本人であることを確認のうえ、法令に従い遅滞なく対応します。手続・手数料は下記窓口にてご案内します。</p>
      </LegalSection>

      <LegalSection heading="10. 保存期間">
        <p>個人情報は、利用目的の達成に必要な期間、または法令（古物営業法上の帳簿、税務・会計関係法令等）で定められた期間保有し、期間経過後は適切に消去または匿名化します。</p>
      </LegalSection>

      <LegalSection heading="11. 未成年者">
        <p>未成年者が当サービスを利用する場合は、親権者等の法定代理人の同意を得たうえでご利用ください。</p>
      </LegalSection>

      <LegalSection heading="12. お問い合わせ・苦情相談窓口">
        <p>
          個人情報の取扱いに関するご請求・お問い合わせ・苦情は、下記窓口までご連絡ください。<br />
          {OPERATOR.companyName}（{OPERATOR.serviceName} 運営）／所在地：{OPERATOR.address}／メール：{OPERATOR.email}／電話：{OPERATOR.phone}
        </p>
        <p>なお、個人情報の取扱いに関しては、個人情報保護委員会（https://www.ppc.go.jp/）へ相談することもできます。</p>
      </LegalSection>

      <LegalSection heading="13. 改定">
        <p>本ポリシーは、法令の改正やサービス内容の変更に応じて改定することがあります。重要な変更は当サービス上で周知します。</p>
      </LegalSection>

      <p className="text-xs text-slate-400">制定・最終改定：2026年10月10日</p>
    </LegalLayout>
  );
}
