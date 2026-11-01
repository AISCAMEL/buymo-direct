import { createServiceClient } from '@/lib/supabase/service';

// AI自動生成コラム（DB保存分）。静的コラム(lib/columns.ts)と /column 上で統合する。
export type DbColumn = {
  id: string;
  slug: string;
  title: string;
  meta: string;
  cat: string;
  html: string;
  thumb_url: string | null;
  sources: { title?: string; url?: string }[];
  model: string | null;
  published: boolean;
  created_at: string;
  published_at: string;
};

/** 公開済みのDBコラムを新しい順に取得。テーブル未作成でも [] を返す（graceful）。 */
export async function loadDbColumns(limit = 100): Promise<DbColumn[]> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from('columns')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as DbColumn[];
  } catch {
    return [];
  }
}

/** slug で1件取得（公開済みのみ）。無ければ null。 */
export async function getDbColumn(slug: string): Promise<DbColumn | null> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from('columns')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();
    if (error || !data) return null;
    return data as DbColumn;
  } catch {
    return null;
  }
}

/** 本日（JST）すでに生成済みのコラム件数。冪等な1日1本のために使う。 */
export async function countTodayColumns(): Promise<number> {
  try {
    const svc = createServiceClient();
    // JST の当日0時を UTC に換算
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 3600_000);
    const jstMidnightUtc = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()) - 9 * 3600_000);
    const { count, error } = await svc
      .from('columns')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', jstMidnightUtc.toISOString());
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
