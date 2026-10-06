'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, FilePen, FolderCheck, Car, AlertTriangle, Download, Printer, RotateCcw, CheckCircle2 } from 'lucide-react';

type Doc = { name: string; note?: string; href?: string };
type Group = {
  key: string;
  title: string;
  write?: Doc[];
  prepare?: Doc[];
  invehicle?: Doc[];
  parking?: Doc[];
  notes?: string[];
};

const GROUPS: Group[] = [
  {
    key: 'std-sell',
    title: '普通車を売る方',
    write: [
      { name: '譲渡証明書', note: '実印を押印', href: '/files/joto-shomeisho.pdf' },
      { name: '委任状', note: '実印を押印', href: '/files/ininjo.pdf' },
    ],
    prepare: [
      { name: '自動車検査証（車検証）', note: '原本' },
      { name: '印鑑登録証明書', note: '発行から3ヶ月以内・1通' },
    ],
    invehicle: [
      { name: '自動車税納税証明書', note: '原本（紛失時は管轄で再発行）' },
      { name: '自賠責保険証明書', note: '原本' },
      { name: 'リサイクル券', note: '原本（お持ちの場合）' },
    ],
    notes: [
      '車検証と印鑑登録証明書の住所が異なる場合：引越し1回=住民票／2回以上=住民票＋戸籍の附票（または住民票の除票）。',
      '車検証と印鑑登録証明書の氏名が異なる場合：戸籍謄本が必要です。',
    ],
  },
  {
    key: 'std-buy',
    title: '普通車を買う方',
    write: [
      { name: '委任状', note: '実印を押印', href: '/files/ininjo.pdf' },
      { name: 'ETCセットアップ委任状', note: 'オプション希望時', href: '/files/etc-setup-ininjo.pdf' },
      { name: '車庫証明取得代行委任状', note: '取得代行ご希望時・実印を押印', href: '/files/ininjo-shako.pdf' },
    ],
    prepare: [
      { name: '印鑑登録証明書', note: '発行から3ヶ月以内・1通' },
      { name: '自動車保管場所証明書（車庫証明）', note: 'ご自身で取得する場合' },
    ],
    parking: [
      { name: '自動車保管場所証明申請書', note: 'ひな形', href: '/files/hokan-shomei-shinsei.pdf' },
      { name: '保管場所標章交付申請書', note: '記載例', href: '/files/hokan-hyosho.pdf' },
      { name: '保管場所の所在図・配置図', note: 'ひな形', href: '/files/shozaizu-haichizu.pdf' },
      { name: '保管場所使用権原疎明書面（自認書）', note: '自己所有の場合・ひな形', href: '/files/jininsho.pdf' },
      { name: '保管場所使用承諾証明書', note: '賃貸の場合・記載例', href: '/files/hokan-shodaku.pdf' },
    ],
    notes: ['車庫証明の取得代行をご希望の場合は、BUYMOにてお手続きを代行できます。'],
  },
  {
    key: 'kei-sell',
    title: '軽自動車を売る方',
    write: [{ name: '申請依頼書', note: '認印可', href: '/files/shinsei-irai.pdf' }],
    prepare: [{ name: '自動車検査証（車検証）', note: '原本' }],
    invehicle: [
      { name: '軽自動車税納税証明書', note: '原本（紛失時は管轄で再発行）' },
      { name: '自賠責保険証明書', note: '原本' },
      { name: 'リサイクル券', note: '原本（お持ちの場合）' },
    ],
    notes: [
      '車検証と申請依頼書の住所が異なる場合：住民票が必要です。',
      '車検証と申請依頼書の氏名が異なる場合：戸籍謄本が必要です。',
    ],
  },
  {
    key: 'kei-buy',
    title: '軽自動車を買う方',
    write: [
      { name: '申請依頼書', note: '認印可', href: '/files/shinsei-irai.pdf' },
      { name: 'ETCセットアップ委任状', note: 'オプション希望時', href: '/files/etc-setup-ininjo.pdf' },
    ],
    prepare: [
      { name: '住所を確認できる書類（住民票など）', note: '名義変更の手続きに使用' },
      { name: '自動車保管場所届出（車庫証明）', note: '地域により必要。ご自身で届出' },
    ],
    notes: [
      '軽自動車は地域により車庫証明（保管場所届出）の要否が異なります。必要な地域では、ナンバープレート取得日から15日以内に届け出てください。',
    ],
  },
];

const SIDE = [
  { key: 'sell', label: '売る' },
  { key: 'buy', label: '買う' },
] as const;
const KIND = [
  { key: 'std', label: '普通車' },
  { key: 'kei', label: '軽自動車' },
] as const;

const STORAGE_KEY = 'buymo-docs-check-v1';
const SECTIONS: { field: keyof Group; icon: typeof FileText; label: string; tone: string }[] = [
  { field: 'write', icon: FilePen, label: '記入が必要な書類（印刷してご記入ください）', tone: 'text-navy-700' },
  { field: 'prepare', icon: FolderCheck, label: 'ご用意いただく書類', tone: 'text-teal-700' },
  { field: 'invehicle', icon: Car, label: '車両に積んでおく書類', tone: 'text-gold-700' },
  { field: 'parking', icon: FileText, label: '車庫証明の取得に必要な書類', tone: 'text-navy-700' },
];

function docsOf(g: Group): Doc[] {
  return [...(g.write ?? []), ...(g.prepare ?? []), ...(g.invehicle ?? []), ...(g.parking ?? [])];
}

export function NecessaryDocs() {
  const [side, setSide] = useState<(typeof SIDE)[number]['key']>('sell');
  const [kind, setKind] = useState<(typeof KIND)[number]['key']>('std');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  const groupKey = `${kind}-${side}`;
  const group = useMemo(() => GROUPS.find((g) => g.key === groupKey)!, [groupKey]);
  const allDocs = useMemo(() => docsOf(group), [group]);

  // localStorage load
  useEffect(() => {
    setHydrated(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  function toggle(name: string) {
    const id = `${groupKey}::${name}`;
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function resetGroup() {
    setChecked((prev) => {
      const next = { ...prev };
      for (const d of allDocs) delete next[`${groupKey}::${d.name}`];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const doneCount = hydrated ? allDocs.filter((d) => checked[`${groupKey}::${d.name}`]).length : 0;
  const total = allDocs.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* 絞り込み */}
      <div className="card p-4 print:hidden">
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-teal-600">条件で絞り込む</p>
        <div className="flex flex-wrap gap-3">
          <Segmented options={SIDE} value={side} onChange={setSide} />
          <Segmented options={KIND} value={kind} onChange={setKind} />
        </div>
      </div>

      {/* 進捗 + 操作 */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-navy-700">
              <Car className="h-5 w-5 text-navy-500" />
              {group.title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              そろえた書類：<span className="font-bold text-teal-700">{doneCount}</span> / {total} 件
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={resetGroup}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />リセット
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 rounded-lg bg-navy-600 px-3 py-2 text-xs font-bold text-white hover:bg-navy-700"
            >
              <Printer className="h-3.5 w-3.5" />チェックリストを印刷
            </button>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* セクション */}
      {SECTIONS.map(({ field, icon: Icon, label, tone }) => {
        const items = group[field] as Doc[] | undefined;
        if (!items || items.length === 0) return null;
        return (
          <section key={field} className="card p-5">
            <p className={`mb-2 flex items-center gap-1.5 text-sm font-black ${tone}`}>
              <Icon className="h-4 w-4" />
              {label}
            </p>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {items.map((d) => {
                const id = `${groupKey}::${d.name}`;
                const on = !!checked[id];
                return (
                  <li key={d.name} className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
                    <button
                      onClick={() => toggle(d.name)}
                      aria-pressed={on}
                      aria-label={`${d.name} を${on ? '未チェックに戻す' : 'チェックする'}`}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                        on ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-teal-400'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <span className={`flex items-center gap-2 text-sm font-bold ${on ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {d.name}
                      {d.href && (
                        <a
                          href={d.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700 no-underline hover:bg-teal-100 print:hidden"
                        >
                          <Download className="h-3.5 w-3.5" />ダウンロード
                        </a>
                      )}
                    </span>
                    {d.note && <span className="ml-auto text-xs text-slate-500">{d.note}</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {group.notes && group.notes.length > 0 && (
        <div className="space-y-1.5 rounded-xl bg-amber-50 p-3">
          {group.notes.map((n, i) => (
            <p key={i} className="flex gap-1.5 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {n}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-full px-5 py-1.5 text-sm font-bold transition-all ${
            value === o.key ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
