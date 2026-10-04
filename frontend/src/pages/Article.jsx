import React, { useEffect, useState } from 'react';
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
      setCopied(false);
    }
  }

  return (
    <div className="code-example">
      <div className="code-example-header">
        <span>{label}</span>
        <div className="code-example-tools">
          <span>{language}</span>
          <button type="button" onClick={copyCode}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

function DiagramBlock({ name }) {
  const Component = diagrams[name];
  return Component ? <Component /> : null;
}

function ContentBlock({ block }) {
  if (!block) return null;

  if (block.type === 'paragraph') {
    return <p>{block.text}</p>;
  }

  if (block.type === 'bullets') {
    return (
      <ul className="article-list">
        {block.items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    );
  }

  if (block.type === 'diagram') {
    return <DiagramBlock name={block.name} />;
  }

  if (block.type === 'code') {
    return <CodeBlock code={block.code} language={block.language} label={block.label} />;
  }

  if (block.type === 'callout') {
    return (
      <aside className="article-callout">
        <span className="callout-mark">↳</span>
        <div>
          <strong>{block.title}</strong>
          <p>{block.text}</p>
        </div>
      </aside>
    );
  }

  return null;
}

function Subsection({ subsection }) {
  return (
    <div className="article-subsection">
      <h3>{subsection.title}</h3>
      {subsection.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {subsection.bullets && (
        <ul className="article-list">
          {subsection.bullets.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
      {subsection.diagram && <DiagramBlock name={subsection.diagram} />}
    </div>
  );
}

export default function Article() {
  const { slug } = useParams();
  const article = getArticle(slug);
  const content = getArticleContent(slug);

  if (!article || !content) {
    return (
      <main className="article-page">
        <NavLink className="back-link" to="/">← Back to library</NavLink>
        <div className="article-not-found">
          <span className="eyebrow">404</span>
          <h1>That note does not exist yet.</h1>
          <p>Go back to the library and pick a published article.</p>
        </div>
      </main>
    );
  }

  const tocItems = content.sections.map((section) => ({
    id: section.id,
    title: section.title,
    subsections: section.subsections || [],
  }));

  const [activeSection, setActiveSection] = useState(tocItems[0]?.id || '');

  useEffect(() => {
    const elements = content.sections
      .map((section) => document.getElementById(section.id))
      .filter(Boolean);

    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-18% 0px -68% 0px', threshold: 0 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [content.sections]);

  return (
    <main className="article-page">
      <header className="article-header">
        <NavLink className="back-link" to="/">← All notes</NavLink>
        <div className="article-kicker">
          <span>{article.eyebrow}</span>
          <span>·</span>
          <span>{article.readTime}</span>
        </div>
        <h1>{article.title}<span>.</span></h1>
        <p className="article-lede">{article.description}</p>
        <div className="article-byline">
          <span>Tech Katta</span>
          <span>Updated {article.updated}</span>
        </div>
      </header>

      <div className="article-shell">
        <article className="article-content">
          <div className="article-introduction">
            {content.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>

          {content.sections.map((section, index) => (
            <section className="article-section" id={section.id} key={section.id}>
              <div className="section-heading-row">
                <h2>{section.title}</h2>
              </div>

              <div className="section-body">
                {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && (
                  <ul className="article-list">
                    {section.bullets.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
                {section.diagram && <DiagramBlock name={section.diagram} />}
                {section.code && <CodeBlock {...section.code} />}
                {section.callout && <ContentBlock block={{ type: 'callout', ...section.callout }} />}
                {section.subsections?.map((subsection) => (
                  <Subsection key={subsection.title} subsection={subsection} />
                ))}
              </div>
            </section>
          ))}

          <section className="knowledge-check">
            <div className="section-heading-row">
              <h2>Test your understanding</h2>
            </div>
            <div className="question-grid">
              {content.knowledgeCheck.map((question, index) => (
                <div className="question-card" key={question}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{question}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="article-end">
            <div>
              <span className="eyebrow">End of note</span>
              <h2>Build the mental model first. Go deeper when the system demands it.</h2>
            </div>
            <NavLink to="/">Browse more →</NavLink>
          </div>
        </article>

        <aside className="toc" aria-label="On this page">
          <div className="toc-title">On this page</div>
          {tocItems.map((item) => (
            <div key={item.id} className="toc-group">
              <a
                href={'#' + item.id}
                className={activeSection === item.id ? 'is-active' : ''}
              >
                <span className="toc-dot" />
                {item.title}
              </a>
              {item.subsections.map((subsection) => (
                <span key={subsection.title}>{subsection.title}</span>
              ))}
            </div>
          ))}
          <div className="toc-divider" />
          <span className="toc-note">Learned from first principles.<br />Written for future me.</span>
        </aside>
      </div>
    </main>
  );
}
