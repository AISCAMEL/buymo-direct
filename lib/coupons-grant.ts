import { createServiceClient } from '@/lib/supabase/service';

type Svc = ReturnType<typeof createServiceClient>;

// 紛らわしい文字（0/O/1/I 等）を除いたコード用アルファベット
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

/** UUID等から16進のみを取り出し、識別タグ（大文字）を作る。 */
function hexTag(id: string, len: number): string {
  const hex = id.replace(/[^0-9a-f]/gi, '').toUpperCase();
  return hex.slice(0, len).padEnd(len, '0');
}

export type CouponGrantKind = 'welcome' | 'review';

export interface CouponGrantResult {
  code: string | null; // 発行された（または既存の）コード
  created: boolean;     // 今回新規発行したか
  value: number;        // 割引額（円）
  error?: string;
}

const GRANTS: Record<CouponGrantKind, { prefix: string; value: number; days: number }> = {
  welcome: { prefix: 'WELCOME', value: 2000, days: 90 },
  review: { prefix: 'REVIEW', value: 5000, days: 180 },
};

/**
 * ユーザー個人宛の「1回限り」クーポンを冪等に発行する。
 * コード体系: <PREFIX>-<keyタグ>-<ランダム4文字>
 *  - keyタグは keyParts（UUID群）から生成し、同一keyの重複発行を防ぐ。
 *  - welcome: keyParts=[userId]           → 会員1人につき1枚
 *  - review : keyParts=[escrowId, userId] → 取引×投稿者ごとに1枚
 * 既存があれば再発行せず既存コードを返す（created=false）。
 * 失敗してもスローせず error を返す（呼び出し側の本処理を妨げない設計）。
 */
export async function grantPersonalCoupon(
  svc: Svc,
  kind: CouponGrantKind,
  keyParts: string[],
): Promise<CouponGrantResult> {
  const g = GRANTS[kind];
  const per = Math.max(4, Math.floor(10 / Math.max(1, keyParts.length)));
  const tag = keyParts.map((p) => hexTag(p, per)).join('');
  const prefix = `${g.prefix}-${tag}`;

  const findExisting = async (): Promise<string | null> => {
    const { data } = await svc
      .from('coupons')
      .select('code')
      .ilike('code', `${prefix}-%`)
      .limit(1);
    const row = (data as { code: string }[] | null)?.[0];
    return row?.code ?? null;
  };

  try {
    const existing = await findExisting();
    if (existing) return { code: existing, created: false, value: g.value };

    const code = `${prefix}-${randomCode(4)}`;
    const expires_at = new Date(Date.now() + g.days * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await svc.from('coupons').insert({
      code,
      type: 'fixed',
      value: g.value,
      min_amount: 0,
      max_uses: 1,
      expires_at,
      active: true,
    });
    if (error) {
      // 同時実行でユニーク制約に触れた等 → 既存を拾い直す
      const again = await findExisting();
      if (again) return { code: again, created: false, value: g.value };
      return { code: null, created: false, value: g.value, error: error.message };
    }
    return { code, created: true, value: g.value };
  } catch (e) {
    return { code: null, created: false, value: g.value, error: e instanceof Error ? e.message : 'grant failed' };
  }
}
