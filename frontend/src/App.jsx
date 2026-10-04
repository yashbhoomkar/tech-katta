import React, { useMemo, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { articles, categories } from './data.js';
import Article from './pages/Article.jsx';

function Brand() {
  return (
    <NavLink to="/" className="brand" aria-label="Tech Katta home">
      <span className="brand-mark">tk</span>
      <span>
        <strong>tech katta</strong>
        <small>learn. build. explain.</small>
      </span>
    </NavLink>
  );
}

function Sidebar({ activeCategory, onCategoryChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <Brand />
        <div className="side-section">
          <div className="side-label">Start here</div>
          <NavLink to="/" end className={({ isActive }) => 'side-link ' + (isActive ? 'active' : '')}>
            <span className="side-index">00</span>
            Overview
          </NavLink>
        </div>
        <div className="side-section">
          <div className="side-label">Topics</div>
          {categories.map((category) => (
            <button
              key={category.id}
              className={'side-link side-button ' + (activeCategory === category.id ? 'active' : '')}
              onClick={() => onCategoryChange(category.id)}
            >
              <span className="side-index">→</span>
              <span>{category.label}</span>
              <span className="side-count">{category.count}</span>
            </button>
          ))}
        </div>
        <div className="side-section">
          <div className="side-label">Coming up</div>
          <div className="side-note"><span className="pulse-dot" />New notes every time I learn something worth keeping.</div>
        </div>
        <div className="sidebar-footer">
          <a href="https://github.com/yashbhoomkar/tech-katta" target="_blank" rel="noreferrer">GitHub ↗</a>
          <span>© 2026</span>
        </div>
      </div>
    </aside>
  );
}

function Header({ query, onQueryChange }) {
  return (
    <header className="topbar">
      <div className="mobile-brand"><Brand /></div>
      <div className="topbar-copy"><span className="eyebrow">A living engineering notebook</span></div>
      <label className="search-box">
        <span>/</span>
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search articles" aria-label="Search articles" />
        <kbd>⌘ K</kbd>
      </label>
    </header>
  );
}

function Home({ query, activeCategory, onCategoryChange }) {
  const navigate = useNavigate();
  const visibleArticles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return articles.filter((article) => {
      const categoryMatch = !activeCategory || article.category === activeCategory;
      if (!normalized) return categoryMatch;
      const haystack = [article.title, article.eyebrow, article.description, ...article.tags].join(' ').toLowerCase();
      return categoryMatch && haystack.includes(normalized);
    });
  }, [query, activeCategory]);

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-kicker">/ tech katta</div>
        <h1>Understand the stack.<span>One note at a time.</span></h1>
        <p>A practical knowledge base for the systems, tools, and ideas I am learning — written down in a way I would want to read six months later.</p>
        <div className="hero-meta">
          <span><b>{articles.length}</b> notes planned</span>
          <span><b>{categories.length}</b> topic tracks</span>
          <span>100% dark mode</span>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <span className="eyebrow">Library</span>
          <h2>{activeCategory ? categories.find((c) => c.id === activeCategory)?.label : 'All notes'}</h2>
        </div>
        {activeCategory && <button className="clear-filter" onClick={() => onCategoryChange(null)}>Clear filter ×</button>}
      </div>

      <section className="article-grid">
        {visibleArticles.map((article, index) => (
          <button
            className={'article-card ' + (article.status === 'soon' ? 'is-soon' : '')}
            key={article.slug}
            onClick={() => article.status === 'published' && navigate('/learn/' + article.slug)}
            disabled={article.status === 'soon'}
          >
            <div className="card-topline">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span className={article.status === 'published' ? 'status-live' : 'status-soon'}>{article.status === 'published' ? 'Published' : 'Coming soon'}</span>
            </div>
            <div className="card-body">
              <span className="card-eyebrow">{article.eyebrow}</span>
              <h3>{article.title}</h3>
              <p>{article.description}</p>
            </div>
            <div className="card-footer">
              <div className="tag-row">{article.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
              <span>{article.readTime}</span>
            </div>
          </button>
        ))}
      </section>

      {visibleArticles.length === 0 && <div className="empty-state">Nothing matched “{query}”. Try a different concept or clear the topic filter.</div>}
    </main>
  );
}

function App() {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const isArticle = location.pathname.startsWith('/learn/');

  return (
    <div className={isArticle ? "app-frame article-frame" : "app-frame"}>
      {!isArticle && <Sidebar activeCategory={activeCategory} onCategoryChange={setActiveCategory} />}
      <div className={isArticle ? 'content-article' : 'content-area'}>
        {!isArticle && <Header query={query} onQueryChange={setQuery} />}
        <Routes>
          <Route path="/" element={<Home query={query} activeCategory={activeCategory} onCategoryChange={setActiveCategory} />} />
          <Route path="/learn/:slug" element={<Article />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
