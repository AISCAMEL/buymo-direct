// 無料登録（スキル/プロ）の加盟店リードへの「買取ビジネスのオファー」ローンチ設定。
// 登録からの経過日数に応じて段階的にオファーを送る。副作用なしのプレーン定義。

/** 各オファーを送るまでの「登録からの経過日数」。1か月・3か月・6か月・12か月。 */
export const OFFER_INTERVALS_DAYS = [30, 90, 180, 365];

/** ローンチ対象とする希望区分（無料・スキル提供トラックのみ。買取加盟希望は対象外）。 */
export const CAMPAIGN_TARGET_WISHES = ['pro', 'undecided'];

export interface LeadOfferStep {
  key: string;
  subject: string;
  heading: string;
  body: string[];
  ctaLabel: string;
  ctaPath: string;
}

/** 段階的なオファー文面（だんだん具体的に買取加盟へ誘導）。 */
export const OFFER_STEPS: LeadOfferStep[] = [
  {
    key: 'intro',
    subject: '【BUYMO】買取で収益を伸ばしませんか？（加盟のご案内）',
    heading: 'スキル提供から、買取ビジネスへ',
    body: [
      'BUYMO ダイレクトにご登録いただきありがとうございます。無料のスキル提供はいかがでしょうか。',
      '実は、加盟店さまが最も収益を伸ばしているのが「買取」です。相場データ・仕入れ・在庫販売までBUYMOが後方支援します。',
      'まずはどんな仕組みか、お気軽にご覧ください。',
    ],
    ctaLabel: '買取加盟の案内を見る',
    ctaPath: '/franchise',
  },
  {
    key: 'learn',
    subject: '【BUYMO】はじめての買取、ゼロから学べます',
    heading: '買取のノウハウ、無料で学べます',
    body: [
      '「買取は難しそう」という方へ。BUYMOには初心者向けの実践講座と、運営が見守る買取コミュニティがあります。',
      '相場の読み方・査定・仕入れの基本から、安心して始められます。',
    ],
    ctaLabel: '買取を学ぶ',
    ctaPath: '/learn',
  },
  {
    key: 'numbers',
    subject: '【BUYMO】低コストで始める買取加盟（費用のご案内）',
    heading: '最小コストで買取を始める',
    body: [
      '店舗も在庫リスクも不要。加盟金と月会費だけで、相場・仕入れ・在庫販売まで対応できます。',
      '他社フランチャイズと比べても、参入コストを抑えた設計です。費用の詳細はこちらからご確認ください。',
    ],
    ctaLabel: '費用・条件を見る',
    ctaPath: '/franchise',
  },
  {
    key: 'lastcall',
    subject: '【BUYMO】買取加盟のご案内（まずはご相談を）',
    heading: 'ご不明点はお気軽に',
    body: [
      'ご登録から時間が経ちましたが、買取ビジネスにご興味はございませんか。',
      '条件のご相談だけでも歓迎です。あなたの地域・得意分野に合わせてご案内します。',
    ],
    ctaLabel: '相談・加盟の案内',
    ctaPath: '/franchise',
  },
];

const DAY = 86_400_000;

/**
 * いま送るべきオファーの段階インデックスを返す（なければ null）。
 * offersSent 件送信済みのとき、次（offersSent 番目）の経過日数を満たしていれば送信対象。
 */
export function dueOfferIndex(
  createdAtIso: string,
  offersSent: number,
  now: number = Date.now()
): number | null {
  if (offersSent >= OFFER_INTERVALS_DAYS.length) return null;
  const created = new Date(createdAtIso).getTime();
  if (!Number.isFinite(created)) return null;
  const dueAt = created + OFFER_INTERVALS_DAYS[offersSent] * DAY;
  return now >= dueAt ? offersSent : null;
}

/** 全オファーを送り終えたか。 */
export function isCampaignComplete(offersSent: number): boolean {
  return offersSent >= OFFER_INTERVALS_DAYS.length;
}
