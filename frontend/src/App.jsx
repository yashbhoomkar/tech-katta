import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { articles, categories } from './data.js';
import Article from './pages/Article.jsx';

function Brand() {
  return (
    <NavLink to="/" className="brand" aria-label="Tech Katta home">
      <span className="brand-mark">tk</span>
      <span className="brand-copy">
        <strong>tech katta</strong>
        <small>learn. build. explain.</small>
      </span>
    </NavLink>
  );
}

function Sidebar({ activeCategory, onCategoryChange, collapsed, mobileOpen, onClose, onToggle }) {
  const navigate = useNavigate();

  const selectCategory = (categoryId) => {
    const next = activeCategory === categoryId ? null : categoryId;
    onCategoryChange(next);
    navigate('/');
    onClose();
  };

  const goHome = () => {
    onCategoryChange(null);
    navigate('/');
    onClose();
  };

  return (
    <>
      <aside className={'sidebar' + (collapsed ? ' sidebar-collapsed' : '') + (mobileOpen ? ' sidebar-mobile-open' : '')}>
        <div className="sidebar-inner">
          <div className="sidebar-head">
            <Brand />
            <button
              className="sidebar-collapse"
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? '→' : '←'}
            </button>
          </div>

          <nav className="sidebar-nav" aria-label="Primary navigation">
            <div className="side-section">
              <div className="side-label">Start here</div>
              <button
                className={'side-link ' + (!activeCategory ? 'active' : '')}
                type="button"
                onClick={goHome}
              >
                <span className="side-index">00</span>
                <span className="side-link-label">Overview</span>
              </button>
            </div>

            <div className="side-section">
              <div className="side-label">Topics</div>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={'side-link ' + (activeCategory === category.id ? 'active' : '')}
                  type="button"
                  onClick={() => selectCategory(category.id)}
                  aria-pressed={activeCategory === category.id}
                  title={collapsed ? category.label : undefined}
                >
                  <span className="side-index">→</span>
                  <span className="side-link-label">{category.label}</span>
                  <span className="side-count">{category.count}</span>
                </button>
              ))}
            </div>

            <div className="side-section side-coming-up">
              <div className="side-label">Coming up</div>
              <div className="side-note">
                <span className="pulse-dot" />
                <span className="side-note-copy">New notes every time I learn something worth keeping.</span>
              </div>
            </div>
          </nav>

          <div className="sidebar-footer">
            <a href="https://github.com/yashbhoomkar/tech-katta" target="_blank" rel="noreferrer">GitHub ↗</a>
            <span>© 2026</span>
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="sidebar-overlay"
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}
    </>
  );
}

function Header({ query, onQueryChange, onToggleMobileSidebar, isArticle, collapsed }) {
  const searchRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="topbar">
      <button
        className="mobile-menu-button"
        type="button"
        onClick={onToggleMobileSidebar}
        aria-label="Open navigation"
      >
        <span />
        <span />
        <span />
      </button>

      <div className="topbar-context">
        {isArticle ? (
          <>
            <span>Key Technologies</span>
            <span className="context-separator">/</span>
            <strong>Kafka Basics</strong>
          </>
        ) : (
          <span>A living engineering notebook</span>
        )}
      </div>

      <label className="search-box">
        <span className="search-prefix">/</span>
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search articles"
          aria-label="Search articles"
        />
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
      const haystack = [article.title, article.eyebrow, article.description, ...article.tags]
        .join(' ')
        .toLowerCase();
      return categoryMatch && haystack.includes(normalized);
    });
  }, [query, activeCategory]);

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-kicker">/ tech katta</div>
        <h1>Understand the stack.<span>One note at a time.</span></h1>
        <p>
          A practical knowledge base for the systems, tools, and ideas I am learning —
          written down in a way I would want to read six months later.
        </p>
        <div className="hero-meta">
          <span><b>{articles.filter((article) => article.status === 'published').length}</b> published</span>
          <span><b>{articles.length}</b> notes planned</span>
          <span><b>{categories.length}</b> topic tracks</span>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <span className="eyebrow">Library</span>
          <h2>{activeCategory ? categories.find((c) => c.id === activeCategory)?.label : 'All notes'}</h2>
        </div>
        {activeCategory && (
          <button className="clear-filter" onClick={() => onCategoryChange(null)} type="button">
            Clear filter ×
          </button>
        )}
      </div>

      <section className="article-grid">
        {visibleArticles.map((article, index) => (
          <button
            className={'article-card ' + (article.status === 'soon' ? 'is-soon' : '')}
            key={article.slug}
            type="button"
            onClick={() => article.status === 'published' && navigate('/learn/' + article.slug)}
            disabled={article.status === 'soon'}
          >
            <div className="card-topline">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span className={article.status === 'published' ? 'status-live' : 'status-soon'}>
                {article.status === 'published' ? 'Published' : 'Coming soon'}
              </span>
            </div>
            <div className="card-body">
              <span className="card-eyebrow">{article.eyebrow}</span>
              <h3>{article.title}</h3>
              <p>{article.description}</p>
            </div>
            <div className="card-footer">
              <div className="tag-row">
                {article.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
              </div>
              <span>{article.readTime}</span>
            </div>
          </button>
        ))}
      </section>

      {visibleArticles.length === 0 && (
        <div className="empty-state">
          Nothing matched “{query}”. Try a different concept or clear the topic filter.
        </div>
      )}
    </main>
  );
}

function App() {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isArticle = location.pathname.startsWith('/learn/');

  return (
    <div className={'app-frame' + (sidebarCollapsed ? ' sidebar-layout-collapsed' : '')}>
      <Sidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onToggle={() => setSidebarCollapsed((value) => !value)}
      />

      <div className={isArticle ? 'content-article' : 'content-area'}>
        <Header
          query={query}
          onQueryChange={setQuery}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
          isArticle={isArticle}
          collapsed={sidebarCollapsed}
        />
        <Routes>
          <Route
            path="/"
            element={
              <Home
                query={query}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
              />
            }
          />
          <Route path="/learn/:slug" element={<Article />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
