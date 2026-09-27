import { redirect } from 'next/navigation';
import { Wrench, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatYen } from '@/lib/format';
import { skillLabel } from '@/lib/cases';
import { addPartnerSkill, removePartnerSkill } from './actions';

export const dynamic = 'force-dynamic';

type Skill = { key: string; name: string; category: string | null };
type PSkill = { id: string; skill_key: string; price_from: number | null; area: string | null; note: string | null };

export default async function DealerSkillsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dealer/skills');
  const { data: dealer } = await supabase.from('dealers').select('id').eq('owner_id', user.id).maybeSingle();
  if (!dealer) redirect('/dealer/register');

  const { data: master } = await supabase.from('skills').select('key, name, category').order('sort', { ascending: true });
  const { data: mine } = await supabase.from('partner_skills').select('id, skill_key, price_from, area, note').eq('dealer_id', (dealer as { id: string }).id);
  const skills = (master ?? []) as Skill[];
  const owned = (mine ?? []) as PSkill[];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Wrench className="h-6 w-6 text-navy-500" />
        <h1 className="text-2xl font-black">スキル・提供サービス</h1>
      </div>
      <p className="text-sm text-slate-500">対応できる仕事を登録すると、「車のプロを探す」の検索結果とプロフィールに表示され、直接依頼が届きます。</p>

      {/* 追加フォーム */}
      <form action={addPartnerSkill} className="card grid gap-3 p-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-slate-500">サービス</span>
          <select name="skill_key" required className="input h-10 text-sm">
            {skills.map((sk) => (<option key={sk.key} value={sk.key}>{sk.name}{sk.category ? `（${sk.category}）` : ''}</option>))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-500">料金（〜から・円）</span>
          <input name="price_from" type="number" min={0} className="input h-10 text-sm" placeholder="例）11000（空欄で要見積り）" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-500">対応エリア</span>
          <input name="area" className="input h-10 text-sm" placeholder="例）福島県いわき市周辺" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-bold text-slate-500">説明（任意）</span>
          <input name="note" className="input h-10 text-sm" placeholder="作業内容・所要時間・特徴など" />
        </label>
        <div className="sm:col-span-2"><button className="btn-accent px-6">追加・更新する</button></div>
      </form>

      {/* 登録済み */}
      {owned.length === 0 ? (
        <p className="card p-8 text-center text-sm text-slate-500">まだサービスが登録されていません。</p>
      ) : (
        <ul className="space-y-2">
          {owned.map((s) => (
            <li key={s.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-bold text-navy-800">{skillLabel(s.skill_key)}
                  <span className="ml-2 text-sm text-accent-600">{s.price_from != null ? `${formatYen(s.price_from)}〜` : '要見積り'}</span>
                </p>
                {(s.area || s.note) && <p className="text-xs text-slate-500">{[s.area, s.note].filter(Boolean).join(' ・ ')}</p>}
              </div>
              <form action={removePartnerSkill.bind(null, s.id)}>
                <button className="rounded-md border border-red-200 p-2 text-red-500 hover:bg-red-50" title="削除"><Trash2 className="h-4 w-4" /></button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
