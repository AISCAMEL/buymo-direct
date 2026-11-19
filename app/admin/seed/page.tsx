import { Database, KeyRound } from 'lucide-react';
import { SeedDemoPanel } from '@/components/SeedDemoPanel';
import { DEMO_PASSWORD, DEMO_PRO, DEMO_BUYER } from '@/lib/demo';

export const dynamic = 'force-dynamic';

export default function AdminSeedPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">デモデータ投入</h1>
      </div>

      <div className="card space-y-2 p-5 text-sm text-slate-600">
        <p className="font-bold text-slate-800">サイトの動きを確認するためのテストデータを投入します。</p>
        <p>投入すると、以下がまとめて作成されます（実際の画面で動作を確認できます）:</p>
        <ul className="ml-4 list-disc space-y-1 text-slate-500">
          <li>デモの「買い手」と「車のプロ」アカウント</li>
          <li>承認済みの加盟店（プロフィール・提供スキル4種）</li>
          <li>出品車両 2台</li>
          <li>案件 5件（新規・受注・対応中・確認待ち・完了）</li>
          <li>完了案件のマッチング手数料の請求 1件</li>
        </ul>
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
          ※ 本番の実ユーザーには影響しません。デモ用アカウント（@buymo-demo.jp）に紐づくデータのみを作成・削除します。
          「再実行で最新化」を押すと、いったんデモデータを消してから作り直します。
        </p>
      </div>

      <SeedDemoPanel />

      <div className="card p-5">
        <p className="flex items-center gap-1.5 font-bold text-navy-800">
          <KeyRound className="h-4 w-4 text-accent-600" /> デモ用のログイン情報（投入後に使えます）
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-accent-200 bg-accent-50/50 p-3 text-sm">
            <p className="font-bold text-navy-800">加盟店（佐藤オートサービス）</p>
            <p className="mt-1 text-slate-600">ID：<code className="rounded bg-white px-1.5 py-0.5 font-mono">{DEMO_PRO.email}</code></p>
            <p className="text-slate-600">PW：<code className="rounded bg-white px-1.5 py-0.5 font-mono">{DEMO_PASSWORD}</code></p>
            <p className="mt-1 text-xs text-slate-400">ログイン後 /dealer/dashboard が開きます</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-bold text-navy-800">買い手（お客様）</p>
            <p className="mt-1 text-slate-600">ID：<code className="rounded bg-white px-1.5 py-0.5 font-mono">{DEMO_BUYER.email}</code></p>
            <p className="text-slate-600">PW：<code className="rounded bg-white px-1.5 py-0.5 font-mono">{DEMO_PASSWORD}</code></p>
            <p className="mt-1 text-xs text-slate-400">ログイン後 /dashboard（マイページ）</p>
          </div>
        </div>
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
          このパスワードはデモ専用アカウント（@buymo-demo.jp・隔離データのみ）用です。再投入のたびにこのパスワードへ戻ります。
        </p>
      </div>

      <div className="card p-5 text-sm text-slate-600">
        <p className="font-bold text-slate-800">確認のしかた</p>
        <ol className="ml-4 mt-1 list-decimal space-y-1 text-slate-500">
          <li>本部ダッシュボード（/admin）や「手数料請求」に数字が入ります</li>
          <li>「車のプロを探す」（/dealers）に佐藤オートサービスが表示されます</li>
          <li>デモ用アカウントでログインすると、買い手・加盟店それぞれの画面が体験できます</li>
        </ol>
      </div>
    </div>
  );
}
