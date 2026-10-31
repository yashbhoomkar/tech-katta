// Content served by the API. Everything the site shows lives here; the frontend only renders it.
import { site } from './site.js';
import { example } from './example.js';
import { article as apiTypes } from './articles/api-types.js';

// Add a new article: create articles/<slug>.js and list it here (order = order on the site).
const articles = [apiTypes];

const SUMMARY_FIELDS = ['section', 'slug', 'no', 'tag', 'date', 'title', 'dek', 'audio'];
const pick = (object, keys) => Object.fromEntries(keys.filter((key) => object[key] !== undefined).map((key) => [key, object[key]]));

export function getSite() {
  return { ...site, example };
}

export function listArticles(section) {
  return articles.filter((a) => !section || a.section === section).map((a) => pick(a, SUMMARY_FIELDS));
}

export function getArticle(slug) {
  const article = articles.find((a) => a.slug === slug);
  return article ? { ...article, example } : null;
}

export const allArticles = articles;
