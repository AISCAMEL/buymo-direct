import Link from 'next/link';
import { Car, SearchX } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'ページが見つかりません' };

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <SearchX className="h-20 w-20 text-slate-200" />
      <div>
        <p className="text-6xl font-black text-slate-200">404</p>
        <h1 className="mt-2 text-xl font-black text-slate-700">ページが見つかりません</h1>
        <p className="mt-1 text-sm text-slate-400">
          お探しのページは削除されたか、URL が間違っている可能性があります。
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          <Car className="h-4 w-4" /> ホームへ
        </Link>
        <Link href="/listings" className="btn-outline">車を探す</Link>
        <Link href="/sell" className="btn-outline">クルマを売る</Link>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-bold text-slate-400">
        <Link href="/about" className="hover:text-teal-600 hover:underline">初めての方へ</Link>
        <Link href="/questions" className="hover:text-teal-600 hover:underline">よくある質問</Link>
        <Link href="/column" className="hover:text-teal-600 hover:underline">コラム</Link>
        <Link href="/contact" className="hover:text-teal-600 hover:underline">お問い合わせ</Link>
      </div>
    </div>
  );
}
