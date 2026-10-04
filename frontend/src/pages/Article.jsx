import { NavLink, useParams } from 'react-router-dom';
import { getArticle, getArticleFacts, getArticleSections } from '../data.js';

export default function Article() {
  const { slug } = useParams();
  const article = getArticle(slug);

  if (!article) {
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

  const sections = getArticleSections(slug);
  const facts = getArticleFacts(slug);

  return (
    <main className="article-page">
      <div className="article-header">
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
      </div>

      <div className="article-layout">
        <article className="article-content">
          <div className="article-callout">
            <span className="callout-mark">↳</span>
            <div>
              <strong>The mental model</strong>
              <p>
                {slug === 'kafka-basics'
                  ? 'Kafka is a distributed append-only log: producers append records, partitions provide ordered storage and parallelism, and consumers track their position with offsets.'
                  : 'Start with the primitive, then reason about what it buys you at scale.'}
              </p>
            </div>
          </div>

          {facts.length > 0 && (
            <div className="fact-grid">
              {facts.map(([label, value]) => (
                <div className="fact" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          )}

          {sections.map((section, index) => (
            <section className="article-section" id={section.id} key={section.id}>
              <span className="section-number">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h2>{section.title}</h2>
                {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {slug === 'kafka-basics' && index === 1 && (
                  <pre className="code-block"><code>{['Producer', '   │', '   ▼', 'Topic', ' ├── Partition 0 ──► Consumer A', ' ├── Partition 1 ──► Consumer B', ' └── Partition 2 ──► Consumer C'].join('\n')}</code></pre>
                )}
              </div>
            </section>
          ))}

          {sections.length === 0 && (
            <div className="article-not-found">
              <span className="eyebrow">Coming soon</span>
              <h1>This note is not published yet.</h1>
              <p>The deep dive will land after the basics.</p>
            </div>
          )}

          <div className="article-end">
            <span>End of note</span>
            <NavLink to="/">Browse more →</NavLink>
          </div>
        </article>

        <aside className="toc">
          <div className="toc-title">On this page</div>
          {sections.map((section) => (
            <a key={section.id} href={'#' + section.id}>{section.title}</a>
          ))}
          <div className="toc-divider" />
          <span className="toc-note">Built from first principles.<br />No interview-theatre.</span>
        </aside>
      </div>
    </main>
  );
}
