import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { getArticle, getArticleContent } from '../data.js';
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
      <p>{block.text}</p>
    </aside>
  );
}

function Subsection({ subsection }) {
  return (
    <div className="doc-subsection">
      <h3>{subsection.title}</h3>
      {subsection.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {subsection.bullets && (
        <ul className="doc-list">
          {subsection.bullets.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
      {subsection.diagram && <Diagram name={subsection.diagram} />}
    </div>
  );
}

export default function Article() {
  const { slug } = useParams();
  const article = getArticle(slug);
  const content = getArticleContent(slug);
  const [progress, setProgress] = useState(0);
  const [markedRead, setMarkedRead] = useState(() => localStorage.getItem('tk-read-' + slug) === '1');

  const tocItems = useMemo(
    () => content?.sections.map((section) => ({ id: section.id, title: section.title, subsections: section.subsections || [] })) || [],
    [content]
  );

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

  if (!article || !content) {
    return (
      <main className="article-page">
        <NavLink className="article-back" to="/">← Back to library</NavLink>
        <h1>That note does not exist yet.</h1>
      </main>
    );
  }

  function markRead() {
    const next = !markedRead;
    setMarkedRead(next);
    localStorage.setItem('tk-read-' + slug, next ? '1' : '0');
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
          <div className="article-intro">
            {content.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>

          {content.sections.map((section) => (
            <section className="doc-section" id={section.id} key={section.id}>
              <h2>{section.title}</h2>

              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}

              {section.bullets && (
                <ul className="doc-list">
                  {section.bullets.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}

              {section.diagram && <Diagram name={section.diagram} />}
              {section.code && <CodeBlock {...section.code} />}
              {section.callout && <Callout block={section.callout} />}

              {section.subsections?.map((subsection) => (
                <Subsection key={subsection.title} subsection={subsection} />
              ))}
            </section>
          ))}

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

          <footer className="article-footer">
            <div className="article-footer-main">
              <span className="eyebrow">Summary</span>
              <p>Kafka is a distributed, replicated append-only log. Topics organize streams, partitions provide ordering and parallelism, consumer groups distribute work, offsets track progress, and replication provides fault tolerance.</p>
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
              {item.subsections.map((subsection) => (
                <a className="toc-subsection" href={'#' + item.id} key={subsection.title}>{subsection.title}</a>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </main>
  );
}
