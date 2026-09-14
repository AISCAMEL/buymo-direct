export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="mt-1 text-xs text-slate-400">最終更新日：{updated}</p>
      <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
        ※ 本ページは雛形です。実際の提供条件・事業者情報に合わせ、公開前に必ず専門家（弁護士・行政書士等）の確認を受けてください。
      </div>
      <div className="legal mt-6 space-y-6 text-sm leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-bold text-slate-900">{heading}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
