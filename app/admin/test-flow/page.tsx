import { TestFlowPanel } from '@/components/TestFlowPanel';

export const dynamic = 'force-dynamic';
export const metadata = { title: '購入フローテスト' };

export default function AdminTestFlowPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-black">購入フローテスト</h1>
      <p className="mb-4 text-sm text-slate-500">
        実データでテスト買主・売主・出品・会話を作成し、購入〜エスクロー〜完了までを実機で検証します。
      </p>
      <TestFlowPanel />
    </div>
  );
}
