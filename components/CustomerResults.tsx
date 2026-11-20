import { getCustomerResults } from '@/lib/customer-results';

/** トップの「ご利用実績」ギャラリー。生成画像が3枚以上あるときだけ表示。 */
export async function CustomerResults() {
  const items = await getCustomerResults();
  if (items.length < 3) return null;

  return (
    <section className="bg-white px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-accent-600">Customer Results</p>
        <h2 className="mb-2 text-center text-2xl font-black sm:text-3xl">ご利用実績</h2>
        <p className="mb-8 text-center text-sm text-slate-500">全国のお客様に、買取・ダイレクト販売でご利用いただいています。</p>

        {/* 横スライド（全サイズ共通）。カードを少しずつ見せてスワイプ/横スクロールを促す */}
        <div data-reveal className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-3 [scrollbar-width:thin]">
          {items.map((it) => (
            <figure
              key={it.key}
              className="group relative w-[74%] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 shadow-sm sm:w-[260px] lg:w-[280px]"
            >
              <div className="relative aspect-square overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.url}
                  alt={it.label}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-900/70 to-transparent p-3">
                  <figcaption className="text-sm font-bold text-white">{it.label}</figcaption>
                </div>
              </div>
            </figure>
          ))}
        </div>
        <p className="mt-2 text-center text-xs font-bold text-slate-400">← 横にスライドしてもっと見る →</p>
      </div>
    </section>
  );
}
