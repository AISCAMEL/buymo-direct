import { Eye, MessageCircle, Heart, Flame, Handshake, TrendingUp } from 'lucide-react';
import type { ListingActivity } from '@/lib/activity';
import { isHotListing } from '@/lib/activity';

/**
 * 「気になる動線」バナー。閲覧・本日のお問い合わせ・商談中などの“動き”を見せて関心を喚起する。
 * 注目点が無ければ軽い相談ナッジのみ表示。
 */
export function ListingActivityBanner({ activity }: { activity: ListingActivity }) {
  const hot = isHotListing(activity);
  const chips: { icon: typeof Eye; text: string; tone: string }[] = [];

  if (activity.reserved) {
    chips.push({ icon: Handshake, text: '商談中', tone: 'bg-amber-100 text-amber-800' });
  }
  if (activity.inquiriesToday > 0) {
    chips.push({ icon: MessageCircle, text: `本日 ${activity.inquiriesToday} 件のお問い合わせ`, tone: 'bg-rose-100 text-rose-700' });
  } else if (activity.inquiriesTotal > 0) {
    chips.push({ icon: MessageCircle, text: `${activity.inquiriesTotal} 件のお問い合わせ`, tone: 'bg-rose-50 text-rose-600' });
  }
  if (activity.views > 0) {
    chips.push({ icon: Eye, text: `${activity.views.toLocaleString()} 回閲覧`, tone: 'bg-navy-50 text-navy-700' });
  }
  if (activity.favorites > 0) {
    chips.push({ icon: Heart, text: `${activity.favorites} 人がお気に入り`, tone: 'bg-pink-50 text-pink-600' });
  }

  const headline = activity.reserved
    ? 'この車はいま商談が進んでいます'
    : activity.inquiriesToday > 0
      ? '本日お問い合わせが入っています'
      : hot
        ? 'いま注目されています'
        : null;

  if (chips.length === 0 && !headline) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        気になる点はチャットで気軽にご相談いただけます。
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${hot || activity.reserved ? 'border-gold-200 bg-gold-50/70' : 'border-slate-200 bg-white'}`}>
      {headline && (
        <p className="flex items-center gap-2 text-sm font-black text-navy-800">
          {activity.reserved ? <Handshake className="h-4 w-4 text-amber-600" /> : hot ? <Flame className="h-4 w-4 text-rose-500" /> : <TrendingUp className="h-4 w-4 text-teal-600" />}
          {headline}
        </p>
      )}
      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {chips.map((c, i) => (
            <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${c.tone}`}>
              <c.icon className="h-3.5 w-3.5" />{c.text}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">
        気になる方は早めに<strong>チャットで相談</strong>を。納得してから購入へ進めます。
      </p>
    </div>
  );
}
