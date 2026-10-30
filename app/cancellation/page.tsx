import { LegalLayout, LegalSection } from '@/components/LegalLayout';
import { OPERATOR } from '@/lib/operator';

export const metadata = {
  title: 'キャンセルポリシー',
  description: 'BUYMO ダイレクトのキャンセル・返金に関する取り扱いを定めたポリシーです。エスクロー入金前後・名義変更着手後の扱い、返金方法をご案内します。',
};

export default function CancellationPage() {
  return (
    <LegalLayout title="キャンセルポリシー" updated="2026-10-29">
      <p>
        本ポリシーは、{OPERATOR.companyName}（以下「当社」）が提供する {OPERATOR.serviceName}（以下「当サービス」）における取引のキャンセルおよび返金の取り扱いを定めるものです。利用者は、本ポリシーに同意のうえ取引を行うものとします。本ポリシーは利用規約の一部を構成します。
      </p>

      <LegalSection heading="第1条（当社の立場）">
        <p>個人間売買（ダイレクト販売／C2C）において、当社は売買の当事者ではなく、場の提供およびエスクロー（代金保全）等の取引補助を行う立場です。キャンセルの可否・条件は、取引の進行段階に応じて本ポリシーに従います。</p>
      </LegalSection>

      <LegalSection heading="第2条（入金前のキャンセル）">
        <p>エスクローへの入金が完了する前は、買主・売主いずれの都合であっても、原則として無料でキャンセルできます。ただし、相手方・当社に実費が発生している場合は、その負担をお願いすることがあります。</p>
      </LegalSection>

      <LegalSection heading="第3条（エスクロー入金後のキャンセル）">
        <p>買主がエスクローへ入金した後のキャンセルは、次のとおり取り扱います。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><span className="font-bold">買主都合の場合</span>：名義変更・陸送・車庫証明等の手配に着手する前であれば、すでに発生した決済手数料その他の実費を差し引いた額を返金します。手配着手後は、当該実費（代行着手金・陸送手配料・決済手数料等）をご負担いただきます。</li>
          <li><span className="font-bold">売主都合の場合</span>：買主へ全額を返金します。正当な理由のない直前キャンセルや、繰り返しの売主都合キャンセルは、アカウント利用停止等の対象となることがあります。</li>
          <li><span className="font-bold">車両・書類に重大な問題が判明した場合</span>：「クレーム・返品対応ポリシー」に従って取り扱います。</li>
        </ul>
      </LegalSection>

      <LegalSection heading="第4条（名義変更着手後・引渡し後）">
        <p>名義変更手続きに着手した後、または車両の引渡しが完了した後のキャンセルは、原則としてお受けできません。引渡し後に車両の状態等について問題がある場合は、「クレーム・返品対応ポリシー」に基づき対応します。</p>
      </LegalSection>

      <LegalSection heading="第5条（返金の方法・時期）">
        <p>返金は、エスクローで保全している代金から前条までに定める実費等を差し引いた額を、原則として買主の指定口座へ行います。返金時期は、キャンセル成立の確認後、通常5〜10営業日以内を目安とします。決済事業者の返金処理期間により前後する場合があります。</p>
      </LegalSection>

      <LegalSection heading="第6条（クーリング・オフ等）">
        <p>個人間売買（ダイレクト販売）は、当事者である個人売主による売買であり、特定商取引法上の通信販売のクーリング・オフ制度は適用されません。返品・解除の可否は本ポリシーおよびクレーム・返品対応ポリシーによります。当社または加盟店が売主となる取引については、別途定める条件に従います。</p>
      </LegalSection>

      <LegalSection heading="第7条（お問い合わせ）">
        <p>キャンセル・返金に関するご相談は、取引ページのチャット、または<a href="/contact" className="text-accent-600 underline">お問い合わせ</a>よりご連絡ください。</p>
      </LegalSection>
    </LegalLayout>
  );
}
