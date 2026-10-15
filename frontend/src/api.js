export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'https://tech-api.katta.cc';

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
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/articles`);
  } catch (err) {
    console.warn('Backend articles fetch failed; using local fallback data', { error: err.message });
    return null;
  }

  if (!res.ok) return { status: 'error', httpStatus: res.status };
  try {
    const articles = await res.json();
    return Array.isArray(articles) ? articles : { status: 'error', httpStatus: res.status };
  } catch (err) {
    console.warn('Backend articles response was invalid', { error: err.message });
    return { status: 'error', httpStatus: res.status };
  }
}

export async function fetchArticleBySlug(slug) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/articles/${encodeURIComponent(slug)}`);
  } catch (err) {
    console.warn('Backend fetch failed', { slug, error: err.message });
    return { status: 'unavailable' };
  }

  if (res.status === 404) return { status: 'not-found' };
  if (!res.ok) return { status: 'error', httpStatus: res.status };

  try {
    return { status: 'ok', article: await res.json() };
  } catch (err) {
    console.warn('Backend response was invalid', { slug, error: err.message });
    return { status: 'error', httpStatus: res.status };
  }
}

export async function fetchCategories() {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/categories`);
  } catch (err) {
    console.warn('Backend categories fetch failed; using local fallback data', { error: err.message });
    return null;
  }

  if (!res.ok) return { status: 'error', httpStatus: res.status };
  try {
    const categories = await res.json();
    return Array.isArray(categories) ? categories : { status: 'error', httpStatus: res.status };
  } catch (err) {
    console.warn('Backend categories response was invalid', { error: err.message });
    return { status: 'error', httpStatus: res.status };
  }
}
