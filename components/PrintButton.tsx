'use client';

import { Printer } from 'lucide-react';

export function PrintButton({ label = '印刷 / PDF保存' }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
