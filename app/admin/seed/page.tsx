import { Database } from 'lucide-react';
import { SeedDemoPanel } from '@/components/SeedDemoPanel';

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
