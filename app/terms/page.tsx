import { LegalLayout, LegalSection } from '@/components/LegalLayout';

export const metadata = { title: '利用規約 | BUYMO C2C' };

export default function TermsPage() {
  return (
    <LegalLayout title="利用規約" updated="2026-06-16">
      <p>本利用規約（以下「本規約」）は、BUYMO C2C（以下「当サービス」）の提供条件および当サービスの運営者（以下「当社」）と利用者の権利義務関係を定めるものです。</p>

      <LegalSection heading="第1条（適用）">
        <p>本規約は、利用者と当社との間の当サービスの利用に関する一切の関係に適用されます。利用者は、当サービスを利用することにより本規約に同意したものとみなされます。</p>
      </LegalSection>

      <LegalSection heading="第2条（定義）">
        <p>「出品者」とは車両を出品する利用者を、「購入者」とは車両の購入を希望する利用者をいいます。当サービスは個人間（C2C）の売買を仲介するプラットフォームであり、当社は売買当事者にはなりません。</p>
      </LegalSection>

      <LegalSection heading="第3条（アカウント登録）">
        <p>利用者は、真実かつ正確な情報で登録するものとします。登録情報の管理責任は利用者が負い、第三者による不正利用について当社は責任を負いません。</p>
      </LegalSection>

      <LegalSection heading="第4条（取引と決済）">
        <p>売買契約は出品者と購入者の間で成立します。代金の授受は当サービスが提供するエスクロー（代金保全）またはその他の決済手段を通じて行われます。決済手段にはクレジットカード（分割手数料あり）、提携ローン、現金等があり、各手数料・金利は別途定めるところによります。</p>
      </LegalSection>

      <LegalSection heading="第5条（手数料）">
        <p>当サービスの利用にあたり、エスクロー手数料、名義変更代行費、クレジット分割手数料等が発生する場合があります。最新の料金は当サービス上の表示によります。</p>
      </LegalSection>

      <LegalSection heading="第6条（禁止事項）">
        <p>利用者は、虚偽情報の掲載、権利侵害、詐欺・なりすまし、法令または公序良俗に反する行為、当サービス外への不正な取引誘導等を行ってはなりません。</p>
      </LegalSection>

      <LegalSection heading="第7条（出品物の制限）">
        <p>盗難車・権利関係に問題のある車両、その他法令で取引が制限される物品の出品を禁止します。出品内容の正確性（修復歴の表示を含む）は出品者が責任を負います。</p>
      </LegalSection>

      <LegalSection heading="第8条（免責事項）">
        <p>当社は当事者間の取引について、品質・適合性・取引の成立等を保証しません。利用者間で生じた紛争は当事者間で解決するものとし、当社は必要に応じて係争対応を支援することがあります。</p>
      </LegalSection>

      <LegalSection heading="第9条（利用停止・退会）">
        <p>当社は、利用者が本規約に違反した場合、事前通知なくアカウントの停止または削除を行うことができます。</p>
      </LegalSection>

      <LegalSection heading="第10条（規約の変更）">
        <p>当社は、必要に応じて本規約を変更できます。変更後の規約は当サービス上に掲示した時点から効力を生じます。</p>
      </LegalSection>

      <LegalSection heading="第11条（準拠法・管轄）">
        <p>本規約は日本法に準拠し、当サービスに関して紛争が生じた場合、当社所在地を管轄する裁判所を専属的合意管轄とします。</p>
      </LegalSection>

      <p className="text-xs text-slate-400">［事業者名・連絡先等は公開前に確定してください］</p>
    </LegalLayout>
  );
}
