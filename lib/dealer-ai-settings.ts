// 加盟店ヘルプAIの「本部ブラッシュアップ層」。コード変更なしで、本部が /admin/dealer-ai から
// 有効/無効・話し方・追加ナレッジ（FAQやローカルルール）を更新できる。app_settings に JSON 文字列で保存。
import { getAppSetting, setAppSetting } from '@/lib/settings';
import { DEALER_GUIDE } from '@/lib/dealer-guide';

export const SETTING_DEALER_AI = 'dealer_ai_settings';

export type DealerAiSettings = {
  enabled: boolean;
  tone: string;          // 話し方・回答方針の指示（本部が調整）
  extraKnowledge: string; // 追加ナレッジ・FAQ・ローカルルール（DEALER_GUIDE に追記される）
};

export const DEFAULT_DEALER_AI_TONE =
  'やさしく、かんたんな日本語で。専門用語は避けるか、使うときは一言で説明する。手順は「どの画面（パス）で何をするか」を具体的に。1回の回答は要点を絞り、長くなりすぎない。わからない・本部確認が必要なことは正直に伝え、/community から本部へ相談するよう案内する。';

export const DEFAULT_DEALER_AI_SETTINGS: DealerAiSettings = {
  enabled: true,
  tone: DEFAULT_DEALER_AI_TONE,
  extraKnowledge: '',
};

export async function getDealerAiSettings(): Promise<DealerAiSettings> {
  const raw = await getAppSetting(SETTING_DEALER_AI);
  if (!raw) return DEFAULT_DEALER_AI_SETTINGS;
  try {
    const p = JSON.parse(raw) as Partial<DealerAiSettings>;
    return {
      enabled: p.enabled !== false,
      tone: typeof p.tone === 'string' && p.tone.trim() ? p.tone : DEFAULT_DEALER_AI_TONE,
      extraKnowledge: typeof p.extraKnowledge === 'string' ? p.extraKnowledge : '',
    };
  } catch {
    return DEFAULT_DEALER_AI_SETTINGS;
  }
}

export async function setDealerAiSettings(s: DealerAiSettings): Promise<{ ok: boolean; error?: string }> {
  const clean: DealerAiSettings = {
    enabled: s.enabled !== false,
    tone: (s.tone ?? '').trim() || DEFAULT_DEALER_AI_TONE,
    extraKnowledge: (s.extraKnowledge ?? '').slice(0, 20000),
  };
  return setAppSetting(SETTING_DEALER_AI, JSON.stringify(clean));
}

/** 加盟店ヘルプAIのシステムプロンプトを組み立てる。 */
export function buildDealerAiSystem(
  s: DealerAiSettings,
  ctx: { dealerName?: string; role?: string; pageLabel?: string; pagePath?: string },
): string {
  return [
    'あなたは中古車マーケットプレイス「BUYMO ダイレクト」（合同会社アイズ）の【加盟店（提携事業者）専用】のヘルプAIです。',
    '相手はBUYMOの加盟店オーナーやスタッフです。目的は、加盟店ポータル（/dealer 配下）の使い方や業務の進め方について、わからないことにその場で答え、すぐ業務に取りかかれるよう手助けすることです。',
    s.tone,
    '回答はプレーンテキストで（Markdownの ** や # や - は使わない）。箇条書きが必要なときは行頭に「・」。画面を案内するときはメニュー名（例：「案件」画面）とパス（例：/dealer/cases）の両方を書く。',
    'お客様（車の売買をする個人）の個人情報には触れない。答えがナレッジにない・本部の判断が要ることは断定せず、/community から本部へ相談するよう案内する。',
    ctx.dealerName || ctx.role || ctx.pageLabel
      ? `【今の相手の状況】店舗名: ${ctx.dealerName ?? '（不明）'} / 権限: ${ctx.role ?? '（不明）'} / 開いている画面: ${ctx.pageLabel ?? '（不明）'}${ctx.pagePath ? `（${ctx.pagePath}）` : ''}。画面に関する質問なら、今開いている画面を踏まえて答える。`
      : '',
    DEALER_GUIDE,
    s.extraKnowledge.trim()
      ? `# 本部からの追加ナレッジ・最新ルール（下記が最優先。上の一般ガイドと矛盾する場合はこちらに従う）\n${s.extraKnowledge.trim()}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}
