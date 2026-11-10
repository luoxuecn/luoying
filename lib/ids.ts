const MOVIE_HREF = /\/movie\/index(\d+)\.html/;
const PLAY_HREF = /\/play\/(\d+)-(\d+)-(\d+)\.html/;

export function movieIdFromHref(href: string | undefined | null) {
  if (!href) return null;
  const match = href.match(MOVIE_HREF);
  return match ? `idx_${match[1]}` : null;
}

export function playIdFromHref(href: string | undefined | null) {
  if (!href) return null;
  const match = href.match(PLAY_HREF);
  return match ? `ep_${match[1]}_${match[2]}_${match[3]}` : null;
}

export function moviePath(id: string) {
  const match = id.match(/^idx_(\d+)$/);
  return match ? `/movie/index${match[1]}.html` : null;
}

export function playPath(playId: string) {
  const match = playId.match(/^ep_(\d+)_(\d+)_(\d+)$/);
  return match ? `/play/${match[1]}-${match[2]}-${match[3]}.html` : null;
}
