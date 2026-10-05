const BLOCK_TYPES = new Set([
  'text',
  'list',
  'heading',
  'diagram',
  'code',
  'callout',
  'image',
  'video',
  'quote',
  'table',
  'divider',
]);

function legacySectionToBlocks(section) {
  const blocks = [];

  if (section.paragraphs?.length) {
    blocks.push({ type: 'text', paragraphs: section.paragraphs });
  }

  if (section.bullets?.length) {
    blocks.push({ type: 'list', items: section.bullets });
  }

  if (section.diagram) {
    blocks.push({ type: 'diagram', name: section.diagram });
  }

  if (section.code) {
    blocks.push({ type: 'code', ...section.code });
  }

  if (section.callout) {
    blocks.push({ type: 'callout', ...section.callout });
  }

  section.subsections?.forEach((subsection) => {
    blocks.push({ type: 'heading', text: subsection.title });

    if (subsection.paragraphs?.length) {
      blocks.push({ type: 'text', paragraphs: subsection.paragraphs });
    }

    if (subsection.bullets?.length) {
      blocks.push({ type: 'list', items: subsection.bullets });
    }

    if (subsection.diagram) {
      blocks.push({ type: 'diagram', name: subsection.diagram });
    }
  });

  return blocks;
}

function normalizeBlock(block) {
  if (!block || typeof block !== 'object') return null;
  if (!BLOCK_TYPES.has(block.type)) return null;

  switch (block.type) {
    case 'text':
      return {
        ...block,
        paragraphs: Array.isArray(block.paragraphs)
          ? block.paragraphs.filter((item) => typeof item === 'string')
          : typeof block.text === 'string'
            ? [block.text]
            : [],
      };
    case 'list':
      return {
        ...block,
        items: Array.isArray(block.items) ? block.items : [],
      };
    case 'heading':
      return { type: 'heading', text: block.text || '' };
    default:
      return block;
  }
}

export function normalizeArticleContent(content) {
  if (!content || typeof content !== 'object') return null;

  const sections = Array.isArray(content.sections)
    ? content.sections.map((section, sectionIndex) => {
        const blocks = Array.isArray(section.blocks)
          ? section.blocks.map(normalizeBlock).filter(Boolean)
          : legacySectionToBlocks(section).map(normalizeBlock).filter(Boolean);

        return {
          id: section.id || `section-${sectionIndex + 1}`,
          title: section.title || `Section ${sectionIndex + 1}`,
          blocks,
        };
      })
    : [];

  return {
    schemaVersion: 2,
    ...(content.introduction ? { introduction: content.introduction } : {}),
    sections,
    ...(content.knowledgeCheck ? { knowledgeCheck: content.knowledgeCheck } : {}),
    ...(content.summary ? { summary: content.summary } : {}),
  };
}

export { BLOCK_TYPES };
