// 動画URLの正規化（副作用なし）。YouTube / Vimeo の共有URLを埋め込み用に、
// mp4/webm などは直再生用に判定する。判定できないものは外部リンク扱い。

export type EmbedKind = 'youtube' | 'vimeo' | 'file' | 'link';
export type EmbedInfo = { kind: EmbedKind; src: string };

/** 動画URLを埋め込み可能な形に正規化。空・無効なら null。 */
export function toVideoEmbed(url: string | null | undefined): EmbedInfo | null {
  if (!url) return null;
  const u = url.trim();
  if (!u) return null;

  // YouTube: watch?v= / youtu.be / embed/ / shorts/ / live/
  const yt = u.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  if (yt) {
    const start = u.match(/[?&](?:t|start)=(\d+)/);
    const q = start ? `?start=${start[1]}` : '';
    return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt[1]}${q}` };
  }

  // Vimeo: vimeo.com/123456789 または player.vimeo.com/video/123456789
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d{6,})/);
  if (vm) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${vm[1]}` };

  // 直リンク（拡張子で判定）
  if (/\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i.test(u)) return { kind: 'file', src: u };

  // http(s) の通常リンク（埋め込み不可だが外部リンクとして扱う）
  if (/^https?:\/\//i.test(u)) return { kind: 'link', src: u };

  return null;
}

/** 埋め込み可能（iframe/videoで再生できる）かどうか。 */
export function isPlayableVideo(url: string | null | undefined): boolean {
  const info = toVideoEmbed(url);
  return !!info && info.kind !== 'link';
}
