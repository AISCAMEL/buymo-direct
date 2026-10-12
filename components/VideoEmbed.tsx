import { PlayCircle, ExternalLink } from 'lucide-react';
import { toVideoEmbed } from '@/lib/video';

/** 動画URLを16:9の埋め込みプレーヤー（YouTube/Vimeo）または直再生(video)で表示。
 *  埋め込み不可のURLは「動画を見る」リンクとして表示する。 */
export function VideoEmbed({ url, title }: { url: string | null | undefined; title?: string }) {
  const info = toVideoEmbed(url);
  if (!info) return null;

  if (info.kind === 'link') {
    return (
      <a
        href={info.src}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-navy-300 px-4 py-2 text-sm font-bold text-navy-700 hover:bg-navy-50"
      >
        <PlayCircle className="h-4 w-4" /> 動画を見る <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
      </a>
    );
  }

  if (info.kind === 'file') {
    return (
      <video
        controls
        preload="metadata"
        playsInline
        className="aspect-video w-full rounded-xl bg-black"
        src={info.src}
      >
        お使いのブラウザは動画再生に対応していません。
      </video>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        src={info.src}
        title={title ?? '動画'}
        className="h-full w-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
