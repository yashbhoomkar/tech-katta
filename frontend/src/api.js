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

export async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/categories`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend fetchCategories failed, fallback to local cache:', err);
    return null;
  }
}

export async function fetchArticles(params = {}) {
  try {
    const url = new URL(`${API_BASE_URL}/api/articles`);
    if (params.category) url.searchParams.set('category', params.category);
    if (params.search) url.searchParams.set('search', params.search);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend fetchArticles failed, fallback to local cache:', err);
    return null;
  }
}

export async function fetchArticleBySlug(slug) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/articles/${slug}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`Backend fetchArticleBySlug for ${slug} failed:`, err);
    return null;
  }
}
