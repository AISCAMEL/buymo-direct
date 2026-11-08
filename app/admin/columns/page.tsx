import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { isAiEnabled } from '@/lib/ai';
import { loadDbColumns } from '@/lib/columns-db';
import { getImageStyle, getImageRef, DEFAULT_IMAGE_STYLE } from '@/lib/settings';
import { AdminColumnGenerate } from '@/components/AdminColumnGenerate';
import { AdminImageStyle } from '@/components/AdminImageStyle';
import { BookOpen, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminColumnsPage() {
  await requireAdmin();
  const aiOn = isAiEnabled();
  const cols = await loadDbColumns(100);
  const zapierOn = !!process.env.ZAPIER_COLUMN_WEBHOOK_URL;
  const [imgStyle, imgRef] = await Promise.all([getImageStyle(), getImageRef()]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <BookOpen className="h-6 w-6 text-accent-600" /> コラム自動生成
        </h1>
        <p className="text-sm text-slate-500">
          AIが毎日1本、最新情報をもとにコラムを執筆・公開します（記事＝Claude／画像＝OpenRouter）。ここで手動生成と一覧確認ができます。
        </p>
      </div>

      <AdminColumnGenerate aiOn={aiOn} />

      <AdminImageStyle initialStyle={imgStyle} initialRef={imgRef ?? ''} defaultStyle={DEFAULT_IMAGE_STYLE} aiOn={aiOn} />

      {/* SNS自動投稿の設定案内（RSS方式＝無料 / Webhook方式＝有料） */}
      <div className="card p-5">
        <h2 className="mb-2 font-bold">SNS自動投稿（Instagram等）</h2>

        {/* 推奨：RSS方式（無料） */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-bold text-emerald-700">★ 推奨：RSS方式（Zapier無料プランでOK）</p>
          <p className="mt-1 text-sm text-slate-700">
            新着コラムを配信する<strong>RSSフィード</strong>を用意しました。Zapierの無料トリガー「RSS by Zapier」でこれを監視すれば、Webhook（有料）なしで自動投稿できます。
          </p>
          <p className="mt-2 text-sm">
            RSSフィードURL：
            <a href="/feed.xml" target="_blank" className="font-mono font-bold text-accent-700 hover:underline">{'/feed.xml'}</a>
            <span className="text-slate-500">（画像・タイトル・本文要約・記事URL入り）</span>
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Zapierで Zap を作成：Trigger =「<span className="font-mono">RSS by Zapier → New Item in Feed</span>」。</li>
            <li>Feed URL に上記フィードのフルURL（https://〜/feed.xml）を貼る。</li>
            <li>Action に「<span className="font-mono">Instagram for Business → Publish Photo</span>」。
              Photo = <span className="font-mono">Media URL（enclosure）</span>、Caption = <span className="font-mono">Title ＋ Description</span> をマッピング。</li>
            <li>Instagramは<strong>ビジネスアカウント＋Facebookページ連携</strong>が前提（BUYMO用を接続）。</li>
          </ol>
        </div>

        {/* 代替：Webhook方式（有料） */}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-bold text-slate-600">代替：Webhook方式（Zapier有料プラン・即時投稿）</summary>
          <p className={`mt-2 text-sm font-bold ${zapierOn ? 'text-emerald-600' : 'text-slate-500'}`}>
            {zapierOn ? '✅ Webhook連携済み（ZAPIER_COLUMN_WEBHOOK_URL 設定あり）。' : '未設定（RSS方式なら不要）。'}
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Zapierで「Webhooks by Zapier → Catch Hook」（Premium）のURLを取得。</li>
            <li>Vercel環境変数 <span className="font-mono">ZAPIER_COLUMN_WEBHOOK_URL</span> に設定 → 再デプロイ。</li>
            <li>Action側で <span className="font-mono">image_url</span> / <span className="font-mono">caption_full</span> / <span className="font-mono">brand</span> をマッピング。</li>
          </ol>
        </details>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-bold">生成済みコラム（{cols.length}件）</h2>
        {cols.length === 0 ? (
          <p className="text-sm text-slate-500">まだ生成されたコラムはありません。上の「今すぐ1本生成」またはCron（毎朝）で作成されます。</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cols.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                {c.thumb_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumb_url} alt="" className="h-12 w-20 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="h-12 w-20 shrink-0 rounded-md bg-slate-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy-800">{c.title}</p>
                  <p className="text-xs text-slate-400">
                    {c.cat}・{new Date(c.published_at).toLocaleString('ja-JP')}
                  </p>
                </div>
                <Link href={`/column/${c.slug}`} target="_blank" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-accent-600 hover:underline">
                  <ExternalLink className="h-3 w-3" /> 表示
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
