import Link from 'next/link';
import { FileText, FilePen, FolderCheck, Car, AlertTriangle, ArrowRight, Download } from 'lucide-react';

export const dynamic = 'force-static';
export const metadata = {
  title: '必要書類案内 | BUYMO ダイレクト',
  description: '中古車の個人間売買・ダイレクト販売で必要な書類を、売る方・買う方／普通車・軽自動車に分けてご案内します。名義変更代行もご利用いただけます。',
};

type Doc = { name: string; note?: string; href?: string };
type Group = {
  key: string;
  title: string;
  write?: Doc[];     // 記入が必要な書類
  prepare?: Doc[];   // ご用意いただく書類
  invehicle?: Doc[]; // 車両に積んでおく書類
  parking?: Doc[];   // 車庫証明に必要な書類
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
      { name: 'ETCセットアップ委任状', note: 'オプション希望時' },
      { name: '車庫証明取得代行委任状', note: 'オプション希望時' },
    ],
    prepare: [
      { name: '印鑑登録証明書', note: '発行から3ヶ月以内・1通' },
      { name: '自動車保管場所証明書（車庫証明）', note: 'ご自身で取得する場合' },
    ],
    parking: [
      { name: '自動車保管場所証明申請書' },
      { name: '保管場所標章交付申請書', note: '記載例', href: '/files/hokan-hyosho.pdf' },
      { name: '保管場所の所在図・配置図' },
      { name: '保管場所使用権原疎明書面（自認書）', note: '保管場所が自己所有の場合' },
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
      { name: 'ETCセットアップ委任状', note: 'オプション希望時' },
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

function DocList({ icon: Icon, label, items, tone }: { icon: typeof FileText; label: string; items?: Doc[]; tone: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-4">
      <p className={`mb-2 flex items-center gap-1.5 text-sm font-black ${tone}`}><Icon className="h-4 w-4" />{label}</p>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {items.map((d) => (
          <li key={d.name} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
              {d.name}
              {d.href && (
                <a
                  href={d.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700 hover:bg-teal-100"
                >
                  <Download className="h-3.5 w-3.5" />ダウンロード
                </a>
              )}
            </span>
            {d.note && <span className="text-xs text-slate-500">{d.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function NecessaryDocumentsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-teal-600">required documents</p>
        <h1 className="mt-1 text-3xl font-black">必要書類案内</h1>
        <p className="mt-2 text-sm text-slate-600">
          中古車の名義変更（移転登録）に必要な書類を、<strong>売る方・買う方</strong>／<strong>普通車・軽自動車</strong>に分けてご案内します。
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
        <FileText className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          手続きが不安な方は <Link href="/transfer" className="font-bold underline">名義変更代行</Link> をご利用いただけます。必要書類のご案内・回収から手続き完了までBUYMOがサポートします。
        </p>
      </div>

      <div className="space-y-5">
        {GROUPS.map((g) => (
          <section key={g.key} className="card p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-navy-700">
              <Car className="h-5 w-5 text-navy-500" />{g.title}
            </h2>
            <DocList icon={FilePen} label="記入が必要な書類（印刷してご記入ください）" items={g.write} tone="text-navy-700" />
            <DocList icon={FolderCheck} label="ご用意いただく書類" items={g.prepare} tone="text-teal-700" />
            <DocList icon={Car} label="車両に積んでおく書類" items={g.invehicle} tone="text-gold-700" />
            <DocList icon={FileText} label="車庫証明の取得に必要な書類" items={g.parking} tone="text-navy-700" />
            {g.notes && g.notes.length > 0 && (
              <div className="mt-4 space-y-1.5 rounded-xl bg-amber-50 p-3">
                {g.notes.map((n, i) => (
                  <p key={i} className="flex gap-1.5 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{n}
                  </p>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
        ※ 書類の要件は制度改定や管轄（運輸支局・軽自動車検査協会）により異なる場合があります。最新・正確な要件は管轄窓口でご確認ください。「ダウンロード」付きの様式は印刷してご記入ください（委任状・譲渡証明書は実印を押印）。その他の様式は順次追加します。
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/transfer" className="btn-accent inline-flex items-center gap-1">名義変更代行を見る <ArrowRight className="h-4 w-4" /></Link>
        <Link href="/contact" className="inline-flex items-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">書類について相談する</Link>
      </div>
    </div>
  );
}
