import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { getArticle, getArticleContent } from '../data.js';
import { fetchArticleBySlug } from '../api.js';
import {
  KafkaArchitectureDiagram,
  KafkaConsumerGroupDiagram,
  KafkaMotivatingDiagram,
  KafkaPartitionDiagram,
  KafkaReplicationDiagram,
  KafkaRetryDiagram,
} from '../components/ArticleDiagrams.jsx';

const diagrams = {
  motivating: KafkaMotivatingDiagram,
  architecture: KafkaArchitectureDiagram,
  partitions: KafkaPartitionDiagram,
  'consumer-group': KafkaConsumerGroupDiagram,
  replication: KafkaReplicationDiagram,
  retry: KafkaRetryDiagram,
};

function CodeBlock({ code, language = 'text', label = 'Example' }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard permissions are optional.
    }
  }

  return (
    <div className="doc-code">
      <div className="doc-code-bar">
        <span>{label}</span>
        <div>
          <span>{language}</span>
          <button type="button" onClick={copyCode}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

function Diagram({ name }) {
  const Component = diagrams[name];
  return Component ? <figure className="doc-figure"><Component /></figure> : null;
}

function Callout({ block }) {
  return (
    <aside className="doc-callout">
      <strong>{block.title}</strong>
      {block.text && <p>{block.text}</p>}
    </aside>
  );
}

function ImageBlock({ block }) {
  return (
    <figure className="doc-media">
      <img src={block.src} alt={block.alt || ''} loading="lazy" />
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  );
}

function VideoBlock({ block }) {
  const source = block.url || block.src;
  if (!source) return null;

  let embedUrl = source;
  try {
    const url = new URL(source);
    if (url.hostname.includes('youtube.com')) {
      const id = url.searchParams.get('v');
      if (id) embedUrl = `https://www.youtube.com/embed/${id}`;
    } else if (url.hostname === 'youtu.be') {
      embedUrl = `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    } else if (url.hostname.includes('vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).pop();
      if (id) embedUrl = `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }

  return (
    <figure className="doc-media doc-video">
      <div className="doc-video-frame">
        <iframe
          src={embedUrl}
          title={block.title || 'Article video'}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  );
}

function TextBlock({ block }) {
  const paragraphs = block.paragraphs || (block.text ? [block.text] : []);
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </>
  );
}

function ListBlock({ block }) {
  const Tag = block.ordered ? 'ol' : 'ul';
  return (
    <Tag className="doc-list">
      {(block.items || []).map((item, index) => <li key={index}>{item}</li>)}
    </Tag>
  );
}

function QuoteBlock({ block }) {
  return (
    <blockquote className="doc-quote">
      <p>{block.text}</p>
      {block.author && <cite>— {block.author}</cite>}
    </blockquote>
  );
}

function TableBlock({ block }) {
  return (
    <div className="doc-table-wrap">
      <table className="doc-table">
        {block.headers?.length > 0 && (
          <thead>
            <tr>{block.headers.map((header, index) => <th key={index}>{header}</th>)}</tr>
          </thead>
        )}
        <tbody>
          {(block.rows || []).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Block({ block }) {
  switch (block.type) {
    case 'text':
      return <TextBlock block={block} />;
    case 'list':
      return <ListBlock block={block} />;
    case 'diagram':
      return <Diagram name={block.name} />;
    case 'code':
      return <CodeBlock {...block} />;
    case 'callout':
      return <Callout block={block} />;
    case 'image':
      return <ImageBlock block={block} />;
    case 'video':
      return <VideoBlock block={block} />;
    case 'quote':
      return <QuoteBlock block={block} />;
    case 'table':
      return <TableBlock block={block} />;
    case 'divider':
      return <hr className="doc-divider" />;
    default:
      return null;
  }
}

/*
 * Keeps existing articles compatible while the canonical schema moves to:
 *
 * article.content.sections = [
 *   {
 *     id: 'unique-section-id',
 *     title: 'Section title',
 *     blocks: [
 *       { type: 'text', paragraphs: ['...'] },
 *       { type: 'diagram', name: 'architecture' },
 *       { type: 'video', url: 'https://...' },
 *       { type: 'code', language: 'javascript', code: '...' }
 *     ]
 *   }
 * ]
 */
function normalizeContent(rawContent) {
  if (!rawContent) return null;

  const sections = (rawContent.sections || []).map((section) => {
    if (Array.isArray(section.blocks)) {
      return section;
    }

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
      blocks.push({ type: 'text', paragraphs: [`### ${subsection.title}`] });
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

    return { ...section, blocks };
  });

  return {
    ...rawContent,
    sections,
  };
}

export default function Article() {
  const { slug } = useParams();
  const [remoteArticle, setRemoteArticle] = useState(null);
  const [progress, setProgress] = useState(0);
  const [markedRead, setMarkedRead] = useState(() => localStorage.getItem('tk-read-' + slug) === '1');
  const [expandedSections, setExpandedSections] = useState({});

  const fallbackArticle = getArticle(slug);
  const fallbackContent = getArticleContent(slug);
  const article = remoteArticle || fallbackArticle;
  const content = normalizeContent(remoteArticle?.content || fallbackContent);

  useEffect(() => {
    let active = true;
    fetchArticleBySlug(slug).then((remote) => {
      if (active && remote) setRemoteArticle(remote);
    });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!content?.sections) return;
    setExpandedSections(Object.fromEntries(content.sections.map((section) => [section.id, true])));
  }, [content]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tocItems = useMemo(
    () => content?.sections?.map((section) => ({ id: section.id, title: section.title })) || [],
    [content]
  );

  function toggleSection(sectionId) {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  function markRead() {
    const next = !markedRead;
    setMarkedRead(next);
    localStorage.setItem('tk-read-' + slug, next ? '1' : '0');
  }

  if (!article || !content) {
    return (
      <main className="article-page">
        <NavLink className="article-back" to="/">← Back to library</NavLink>
        <h1>That note does not exist yet.</h1>
      </main>
    );
  }

  return (
    <main className="article-page">
      <div className="article-column">
        <header className="article-hero">
          <div className="article-breadcrumb">
            <NavLink to="/">Key Technologies</NavLink>
            <span>/</span>
            <span>{article.title}</span>
          </div>

          <h1>{article.title}</h1>
          <p className="article-summary">{article.description}</p>

          <div className="article-meta">
            <span>{article.readTime}</span>
            <span>•</span>
            <span>Updated {article.updated}</span>
          </div>

          <div className="article-progress-mobile">
            <div className="progress-track"><span style={{ width: progress + '%' }} /></div>
            <span>{Math.round(progress)}% read</span>
          </div>
        </header>

        <div className="article-body">
          {content.introduction?.length > 0 && (
            <div className="article-intro">
              {content.introduction.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          )}

          {content.sections.map((section) => (
            <section
              className={'doc-section' + (!expandedSections[section.id] ? ' is-collapsed' : '')}
              id={section.id}
              key={section.id}
            >
              <button
                type="button"
                className="doc-section-heading"
                onClick={() => toggleSection(section.id)}
                aria-expanded={expandedSections[section.id] !== false}
                aria-controls={'section-content-' + section.id}
              >
                <h2>{section.title}</h2>
                <span className="doc-section-chevron" aria-hidden="true">
                  {expandedSections[section.id] === false ? '›' : '⌄'}
                </span>
              </button>

              <div className="doc-section-content" id={'section-content-' + section.id}>
                {section.blocks.map((block, index) => (
                  <Block key={block.id || index} block={block} />
                ))}
              </div>
            </section>
          ))}

          {content.knowledgeCheck?.length > 0 && (
            <section className="knowledge-section">
              <div className="knowledge-heading">
                <span className="eyebrow">Knowledge check</span>
                <h2>Test your understanding</h2>
                <p>Answer these without looking back to find the gaps in your mental model.</p>
              </div>

              <div className="knowledge-list">
                {content.knowledgeCheck.map((question, index) => (
                  <div className="knowledge-item" key={question}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p>{question}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <footer className="article-footer">
            <div className="article-footer-main">
              <span className="eyebrow">Summary</span>
              <p>{content.summary || 'This article is part of the Tech Katta engineering knowledge base.'}</p>
            </div>
            <div className="article-footer-actions">
              <button type="button" className={'read-button' + (markedRead ? ' is-read' : '')} onClick={markRead}>
                {markedRead ? '✓ Read' : 'Mark as read'}
              </button>
              <NavLink to="/">Back to library</NavLink>
            </div>
          </footer>
        </div>
      </div>

      <aside className="article-rail">
        <div className="reading-progress">
          <div className="rail-heading">Reading progress</div>
          <div className="progress-track vertical">
            <span style={{ height: progress + '%' }} />
          </div>
          <span className="progress-label">{Math.round(progress)}%</span>
        </div>

        <nav className="article-toc" aria-label="On this page">
          <div className="rail-heading">On this page</div>
          {tocItems.map((item) => (
            <div className="toc-group" key={item.id}>
              <a href={'#' + item.id}>{item.title}</a>
            </div>
          ))}
        </nav>
      </aside>
    </main>
  );
}
