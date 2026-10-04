export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://tech-api.katta.cc';

export async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) return { ok: false, status: res.status };
    return await res.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function fetchArticles() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/articles`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend fetch failed, fallback to local data:', err);
    return null;
  }
}

export async function fetchArticleBySlug(slug) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/articles/${slug}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`Backend fetch for ${slug} failed:`, err);
    return null;
  }
}
