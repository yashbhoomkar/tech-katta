const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isOptionalString = (value) => value === undefined || value === null || typeof value === 'string';
const isOptionalStringArray = (value) => value === undefined || value === null || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
const isTextItem = (value) => typeof value === 'string' || typeof value === 'number';
const isOptionalArray = (value, predicate) => value === undefined || value === null || (Array.isArray(value) && value.every(predicate));
const isOptionalRows = (value) => isOptionalArray(value, (row) => Array.isArray(row) && row.every((cell) => cell === null || typeof cell === 'string' || typeof cell === 'number'));

const isValidCodeData = (value) =>
  isRecord(value) &&
  typeof value.code === 'string' &&
  isOptionalString(value.language) &&
  isOptionalString(value.label) &&
  (value.type === undefined || value.type === 'code');

const isValidCalloutData = (value) =>
  isRecord(value) &&
  isOptionalString(value.title) &&
  isOptionalString(value.text) &&
  (value.type === undefined || value.type === 'callout');

const isValidSubsection = (value) =>
  isRecord(value) &&
  isOptionalString(value.title) &&
  isOptionalStringArray(value.paragraphs) &&
  isOptionalArray(value.bullets, isTextItem) &&
  isOptionalString(value.diagram);

const isValidBlock = (block) => {
  if (!isRecord(block) || typeof block.type !== 'string') return false;

  switch (block.type) {
    case 'text':
      return isOptionalStringArray(block.paragraphs) && isOptionalString(block.text);
    case 'list':
      return isOptionalArray(block.items, isTextItem);
    case 'heading':
      return typeof block.text === 'string';
    case 'diagram':
      return typeof block.name === 'string';
    case 'code':
      return typeof block.code === 'string' && isOptionalString(block.language) && isOptionalString(block.label);
    case 'callout':
      return isOptionalString(block.title) && isOptionalString(block.text);
    case 'image':
      return isOptionalString(block.src) && isOptionalString(block.alt) && isOptionalString(block.caption);
    case 'video':
      return isOptionalString(block.url) && isOptionalString(block.src) && isOptionalString(block.title) && isOptionalString(block.caption);
    case 'quote':
      return isOptionalString(block.text) && isOptionalString(block.author);
    case 'table':
      return isOptionalStringArray(block.headers) && isOptionalRows(block.rows);
    case 'divider':
      return true;
    default:
      return false;
  }
};

const isValidSection = (section) => {
  if (!isRecord(section) || !isOptionalString(section.id) || !isOptionalString(section.title)) return false;

  if (section.blocks !== undefined && section.blocks !== null) {
    return Array.isArray(section.blocks) && section.blocks.every(isValidBlock);
  }

  if (!isOptionalStringArray(section.paragraphs)) return false;
  if (!isOptionalArray(section.bullets, isTextItem)) return false;
  if (!isOptionalString(section.diagram)) return false;
  if (!isOptionalArray(section.subsections, isValidSubsection)) return false;
  if (section.code !== undefined && section.code !== null && !isValidCodeData(section.code)) return false;
  if (section.callout !== undefined && section.callout !== null && !isValidCalloutData(section.callout)) return false;
  return true;
};

/**
 * Validates the nested shape consumed by article normalization and block rendering.
 * Empty objects and empty arrays are valid; malformed iterables are not.
 * @param {unknown} content
 * @returns {boolean}
 */
export function isValidArticleContent(content) {
  if (!isRecord(content)) return false;
  if (content.sections !== undefined && (!Array.isArray(content.sections) || !content.sections.every(isValidSection))) return false;
  if (!isOptionalStringArray(content.introduction)) return false;
  if (!isOptionalStringArray(content.knowledgeCheck)) return false;
  if (!isOptionalString(content.summary)) return false;
  return true;
}

/**
 * Resolves article content according to API state without masking successful but invalid responses.
 * Bundled content is used only when the network is unavailable.
 * @param {{status?: string, article?: {content?: unknown} | null} | null | undefined} result
 * @param {unknown} fallbackContent
 * @returns {{content: unknown, error: boolean}}
 */
export function resolveArticleContent(result, fallbackContent) {
  if (result?.status === 'unavailable') {
    return { content: fallbackContent, error: false };
  }

  if (result?.status !== 'ok') {
    return { content: null, error: false };
  }

  const article = result.article;
  const content = article?.content;
  const validContent =
    article !== null &&
    typeof article === 'object' &&
    !Array.isArray(article) &&
    Object.prototype.hasOwnProperty.call(article, 'content') &&
    isValidArticleContent(content);

  if (!validContent) return { content: null, error: true };

  // An empty content object or an empty sections array is valid and must not
  // be replaced by stale bundled content after a successful HTTP response.
  return { content, error: false };
}
