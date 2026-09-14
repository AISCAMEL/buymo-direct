import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDealerForUser } from '@/lib/dealer';
import { applyDealer } from '@/app/dealer/actions';
import { PREFECTURES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function DealerRegisterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dealer/register');
  const ctx = await getDealerForUser(user.id);
  if (ctx) redirect('/dealer/dashboard');

  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">
      <h1 className="text-2xl font-black">加盟店 申込フォーム</h1>

      <form action={applyDealer} className="card space-y-5 p-6">
        <div>
          <label className="label">店舗名 *</label>
          <input name="name" required className="input" placeholder="〇〇モータース" />
        </div>
        <div>
          <label className="label">法人名</label>
          <input name="company_name" className="input" placeholder="株式会社〇〇" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">都道府県 *</label>
            <select name="prefecture" required className="input">
              <option value="">選択</option>
              {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">電話番号</label>
            <input name="phone" type="tel" className="input" placeholder="03-0000-0000" />
          </div>
        </div>
        <div>
          <label className="label">住所</label>
          <input name="address" className="input" placeholder="〇〇市〇〇町1-2-3" />
        </div>
        <div>
          <label className="label">公式サイト URL</label>
          <input name="website_url" type="url" className="input" placeholder="https://example.com" />
        </div>
        <div>
          <label className="label">店舗紹介文</label>
          <textarea name="description" rows={4} className="input" placeholder="取扱車種・営業時間・アクセスなど" />
        </div>

        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
          申込後、本部が審査を行います（1〜3営業日）。承認されると加盟店ダッシュボードが使用可能になります。
        </div>

        <button type="submit" className="btn-accent w-full py-3">申し込む</button>
      </form>
    </div>
  );
}
