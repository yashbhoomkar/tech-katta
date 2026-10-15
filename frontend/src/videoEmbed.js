const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
]);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;

export function getVideoEmbedUrl(source) {
  if (typeof source !== 'string' || !source.trim()) return null;

  let url;
  try {
    url = new URL(source);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' || url.username || url.password) return null;

  const host = url.hostname.toLowerCase();
  if (YOUTUBE_HOSTS.has(host)) {
    let id = null;
    if (host === 'youtu.be') {
      id = url.pathname.split('/').filter(Boolean)[0] || null;
    } else {
      const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);
      id = url.pathname === '/watch' ? url.searchParams.get('v') : match?.[1] || null;
    }

    return id && YOUTUBE_ID.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : null;
  }

  if (VIMEO_HOSTS.has(host)) {
    const match = url.pathname.match(/^\/video\/(\d+)\/?$/);
    const id = host === 'player.vimeo.com'
      ? match?.[1]
      : url.pathname.split('/').filter(Boolean).pop();
    return id && VIMEO_ID.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }

  return null;
}
