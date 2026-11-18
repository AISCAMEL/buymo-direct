import { requireAdmin } from '@/lib/admin';
import { isAiEnabled } from '@/lib/ai';
import { GENRE_ICONS, getGenreIconMap } from '@/lib/genre-icons';
import { AdminGenreIcons } from '@/components/AdminGenreIcons';
import { Shapes } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminGenreIconsPage() {
  await requireAdmin();
  const aiOn = isAiEnabled();
  const initial = await getGenreIconMap();
  const items = GENRE_ICONS.map((g) => ({ key: g.key, label: g.label }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Shapes className="h-6 w-6 text-accent-600" /> ジャンルアイコン生成
        </h1>
        <p className="text-sm text-slate-500">
          AIで統一スタイルのジャンルアイコンを一括生成し、トップの「車種・ジャンルから探す」に自動表示します。
        </p>
      </div>

      <AdminGenreIcons items={items} initial={initial} aiOn={aiOn} />
    </div>
  );
}
