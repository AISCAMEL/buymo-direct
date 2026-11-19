// 加盟店オンボーディング（スタートアップ研修）。
// 事前収録の動画を「好きな時に見れる」アカデミー形式で提供し、登録後のフォローを自動化する。
// 動画URLは管理画面から設定（app_settings）。未設定でもテキストガイドで機能する。
import { getAppSetting } from '@/lib/settings';

export type OnboardingStep = {
  key: string;        // 進捗保存・動画設定のキー
  title: string;
  summary: string;
  points: string[];   // この章で身につくこと
  href?: string;      // 関連する実際の操作画面
  hrefLabel?: string;
};

// キックオフ動画（最初に見る、歓迎＋全体像）
export const KICKOFF_KEY = 'kickoff';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: 'kickoff',
    title: '① ようこそ｜キックオフ',
    summary: 'BUYMO加盟店としての全体像と、まず最初にやることをご案内します。',
    points: ['BUYMOの仕組みと加盟店の役割', '最短で売上につなげる流れ', 'サポート窓口と困ったときの連絡先'],
    href: '/dealer/dashboard',
    hrefLabel: 'ダッシュボードを開く',
  },
  {
    key: 'profile',
    title: '② 店舗情報・振込先の設定',
    summary: 'お客様に表示される店舗情報と、報酬の振込先を整えます。',
    points: ['店舗名・営業時間・エリアの設定', '振込先口座の登録', 'スタッフの招待と権限'],
    href: '/dealer/settings',
    hrefLabel: '店舗設定へ',
  },
  {
    key: 'appraisal',
    title: '③ 査定の進め方（展開図・AI）',
    summary: '査定表（展開図）で傷・凹みを記録し、AIで評価額の目安を出す流れを学びます。',
    points: ['展開図での損傷の記録方法', 'AI評価と概算価格の見方', 'ヒアリング（他社額・希望）で最適提案'],
    href: '/dealer/inspections',
    hrefLabel: '査定表を開く',
  },
  {
    key: 'cases',
    title: '④ 案件対応（受注→完了）',
    summary: '届いた案件を受けて、対応・見積・完了まで進める基本操作です。',
    points: ['案件の受注と対応ステータス', '見積書・請求書の作成', '完了（成約金額の入力）'],
    href: '/dealer/cases',
    hrefLabel: '案件を開く',
  },
  {
    key: 'growth',
    title: '⑤ 集客・店舗QR・LINE',
    summary: '店舗QRやヒアリングで来店・出張査定を増やし、リピートにつなげます。',
    points: ['店舗QRの配布（店頭・チラシ）', 'ヒアリングからのAI最適提案', 'お客様フォローのコツ'],
    href: '/dealer/qr',
    hrefLabel: '店舗QRを開く',
  },
  {
    key: 'billing',
    title: '⑥ 手数料・請求・入金',
    summary: '手数料の考え方と、締め請求・入金確認の流れを確認します。',
    points: ['手数料の仕組み', '締め請求の見方', '入金の確認方法'],
    href: '/dealer/billing',
    hrefLabel: '手数料・請求へ',
  },
];

export function videoSettingKey(stepKey: string): string {
  return 'onboarding_video_' + stepKey;
}

/** 各章の動画URL（管理画面で設定、未設定は null）をまとめて取得。 */
export async function getOnboardingVideos(): Promise<Record<string, string | null>> {
  const entries = await Promise.all(
    ONBOARDING_STEPS.map(async (s) => [s.key, await getAppSetting(videoSettingKey(s.key))] as const),
  );
  return Object.fromEntries(entries);
}
