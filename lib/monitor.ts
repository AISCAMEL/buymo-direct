// AI監視センターのロジック。
// 運営の各キュー（取引・審査・申込・通報など）の件数を集計し、しきい値で
// 🔴critical / 🟡attention / 🟢ok を判定。AIが有効なら日本語の要約と次アクションを付与する。
// 個人情報は扱わず「件数」のみを集計・AIに渡す。
import { createServiceClient } from '@/lib/supabase/service';
import { generateWithClaude, aiUtilityModel, isAiEnabled, toPlainText } from '@/lib/ai';

type Svc = ReturnType<typeof createServiceClient>;
export type Severity = 'critical' | 'attention' | 'ok';

export type MonitorAlert = {
  area: string;
  label: string;
  count: number | null;
  severity: Severity;
  href: string;
  hint: string;
};

export type MonitorReport = {
  status: Severity;
  counts: { critical: number; attention: number };
  alerts: MonitorAlert[];
  aiSummary: string | null;
  aiEnabled: boolean;
  generatedAt: string;
};

/** status 列が候補のいずれかに一致する件数（失敗時 null）。 */
async function countIn(svc: Svc, table: string, values: string[], col = 'status'): Promise<number | null> {
  try {
    const { count, error } = await svc.from(table).select('*', { count: 'exact', head: true }).in(col, values);
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

/** 直近N時間に作成された件数（失敗時 null）。 */
async function countRecent(svc: Svc, table: string, hours: number, dateCol = 'created_at'): Promise<number | null> {
  try {
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const { count, error } = await svc.from(table).select('*', { count: 'exact', head: true }).gte(dateCol, since);
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

// 監視対象キューの定義（しきい値つき）。
// warnAt 以上で attention、critAt 以上で critical。critAt 未指定なら critical にはしない。
type QueueDef = {
  area: string;
  label: string;
  table: string;
  statuses: string[];
  href: string;
  warnAt: number;
  critAt?: number;
  hint: string;
};

const QUEUES: QueueDef[] = [
  { area: '取引', label: '係争中の取引（disputed）', table: 'escrow_transactions', statuses: ['disputed'], href: '/admin/escrow', warnAt: 1, critAt: 1, hint: '最優先。両者の主張を確認し仲裁・返金/実行を判断。' },
  { area: '安全', label: '未対応の通報（open）', table: 'reports', statuses: ['open'], href: '/admin/reports', warnAt: 1, critAt: 5, hint: '放置は信頼とリスクに直結。内容を確認し対応。' },
  { area: '審査', label: '本人確認 審査待ち', table: 'kyc_documents', statuses: ['pending', 'submitted'], href: '/admin/kyc', warnAt: 5, critAt: 20, hint: '滞ると取引が進まない。順次承認/差し戻し。' },
  { area: '審査', label: '買取保証 審査待ち', table: 'buyback_requests', statuses: ['pending', 'submitted', 'requested'], href: '/admin/buyback', warnAt: 5, critAt: 20, hint: '査定・可否を回答。' },
  { area: '出品', label: '出品モデレーション待ち（draft）', table: 'listings', statuses: ['draft', 'pending', 'review'], href: '/admin/listings', warnAt: 10, critAt: 40, hint: '公開可否をチェックして掲載。' },
  { area: '申込', label: '買取加盟 申込', table: 'franchise_applications', statuses: ['pending', 'new', 'submitted'], href: '/admin/franchise', warnAt: 1, hint: '加盟店の新規申込。審査して承認。' },
  { area: '申込', label: '査定依頼', table: 'appraisal_requests', statuses: ['pending', 'new', 'requested', 'submitted'], href: '/admin/appraisals', warnAt: 5, critAt: 20, hint: '査定額を提示。反応速度がCVに直結。' },
  { area: '申込', label: 'ローン審査', table: 'loan_applications', statuses: ['pending', 'submitted', 'reviewing'], href: '/admin/loans', warnAt: 3, critAt: 15, hint: '可否を判断し連絡。' },
  { area: '申込', label: '陸送申込', table: 'transport_requests', statuses: ['pending', 'new', 'requested'], href: '/admin/transport', warnAt: 3, hint: '手配を進める。' },
  { area: '申込', label: '廃車買取', table: 'haisha_requests', statuses: ['pending', 'new', 'requested'], href: '/admin/haisha', warnAt: 3, hint: '金額提示・引取り手配。' },
  { area: '会員', label: '有料会員 申込', table: 'membership_applications', statuses: ['pending', 'submitted'], href: '/admin/members', warnAt: 1, hint: '承認して会員化。' },
  { area: '営業', label: '加盟店・プロ希望（新規）', table: 'dealer_leads', statuses: ['new', 'pending'], href: '/admin/leads', warnAt: 1, hint: '早めに連絡してフォロー。' },
];

function sevFor(q: QueueDef, count: number | null): Severity {
  if (count === null || count <= 0) return 'ok';
  if (q.critAt !== undefined && count >= q.critAt) return 'critical';
  if (count >= q.warnAt) return 'attention';
  return 'ok';
}

function worst(a: Severity, b: Severity): Severity {
  const rank = { ok: 0, attention: 1, critical: 2 } as const;
  return rank[a] >= rank[b] ? a : b;
}

/** 監視レポートを作る（ルールベース＋任意でAI要約）。 */
export async function runAiMonitor(): Promise<MonitorReport> {
  const svc = createServiceClient();

  const counts = await Promise.all(QUEUES.map((q) => countIn(svc, q.table, q.statuses)));
  const contactRecent = await countRecent(svc, 'contact_messages', 24 * 7);

  const alerts: MonitorAlert[] = QUEUES.map((q, i) => ({
    area: q.area,
    label: q.label,
    count: counts[i],
    severity: sevFor(q, counts[i]),
    href: q.href,
    hint: q.hint,
  }));

  // 要対応・注意を上に。件数の多い順。
  const rank = { critical: 0, attention: 1, ok: 2 } as const;
  alerts.sort((a, b) => rank[a.severity] - rank[b.severity] || (b.count ?? 0) - (a.count ?? 0));

  const status = alerts.reduce<Severity>((acc, a) => worst(acc, a.severity), 'ok');
  const criticalN = alerts.filter((a) => a.severity === 'critical').length;
  const attentionN = alerts.filter((a) => a.severity === 'attention').length;

  // AI要約（任意）。件数のみを渡す。
  let aiSummary: string | null = null;
  const aiEnabled = isAiEnabled();
  if (aiEnabled) {
    try {
      const lines = alerts
        .filter((a) => a.severity !== 'ok')
        .map((a) => `・[${a.severity === 'critical' ? '要対応' : '注意'}] ${a.label}：${a.count ?? '取得不可'}件`);
      const context =
        lines.length > 0
          ? lines.join('\n')
          : 'すべてのキューがしきい値以下（正常）。直近7日の問い合わせ ' + (contactRecent ?? '取得不可') + '件。';
      const system =
        'あなたは中古車マーケットプレイス「BUYMO」の運営監視AIです。' +
        '件数のみをもとに、運営担当者向けに「今すぐ何をすべきか」を簡潔な日本語で示します。' +
        'Markdown記号（*、#、-）は使わず、箇条書きは行頭に「・」。誇張せず、優先度順に。個人情報は扱いません。';
      const prompt =
        `以下は現在の運営キューの状況（しきい値超過分）です。\n${context}\n\n` +
        '次を出力してください：\n' +
        '1行目に全体状況の一言（例：要対応あり/おおむね正常）。' +
        'その後、優先度の高い順に最大3つ、「何を」「なぜ急ぐか」を1行ずつ。最後に一言励まし。';
      const raw = await generateWithClaude(prompt, system, aiUtilityModel(), 500);
      aiSummary = toPlainText(raw).trim() || null;
    } catch {
      aiSummary = null;
    }
  }

  return {
    status,
    counts: { critical: criticalN, attention: attentionN },
    alerts,
    aiSummary,
    aiEnabled,
    generatedAt: new Date().toISOString(),
  };
}
