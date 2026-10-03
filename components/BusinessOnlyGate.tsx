import Link from 'next/link';
import { Briefcase, ArrowRight } from 'lucide-react';

/**
 * 個人（一般会員）向けの案内。買取系（相場・仕入れ・講座・コミュニティ・有料会員）は
 * 業者＝プロ・加盟店トラックの機能なので、個人には提供せず「業者になる入口」を案内する。
 */
export function BusinessOnlyGate({ feature, source }: { feature: string; source: string }) {
  return (
    <div className="mx-auto max-w-xl space-y-5 py-12 text-center">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-50">
        <Briefcase className="h-7 w-7 text-gold-600" />
      </span>
      <div>
        <h1 className="text-2xl font-black">「{feature}」は業者・プロ向けの機能です</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          BUYMO の一般会員（個人）は、<strong>車の売買・マッチング・チャット</strong>をご利用いただけます。<br />
          買取の相場・仕入れ情報・講座・コミュニティは、買取を事業として行う
          <strong>プロ・加盟店の方向け</strong>です。
        </p>
      </div>
      <div className="card p-5 text-left text-sm text-slate-600">
        <p className="font-bold text-slate-800">買取を始めたい方へ</p>
        <p className="mt-1">
          まずは<strong>加盟店・プロ登録（無料）</strong>から。登録後に相場・仕入れ・講座・コミュニティがご利用いただけます。
        </p>
      </div>
      <Link href={`/join?source=${source}`} className="btn-accent inline-flex items-center gap-1">
        加盟店・プロ登録（無料）へ <ArrowRight className="h-4 w-4" />
      </Link>
      <p>
        <Link href="/listings" className="text-sm font-bold text-navy-500 underline">車を探す・売買にもどる</Link>
      </p>
    </div>
  );
}
