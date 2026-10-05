import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { articles as fallbackArticles, categories as fallbackCategories } from './data.js';
import { fetchArticles, fetchCategories } from './api.js';
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

function Sidebar({ collapsed, mobileOpen, onToggle, onClose, activeCategory, onCategoryChange, categories }) {
  const navigate = useNavigate();

  function chooseCategory(categoryId) {
    onCategoryChange(activeCategory === categoryId ? null : categoryId);
    navigate('/');
    onClose();
  }

  function goHome() {
    onCategoryChange(null);
    navigate('/');
    onClose();
  }

  return (
    <>
      <aside className={'learning-sidebar' + (collapsed ? ' is-collapsed' : '') + (mobileOpen ? ' is-mobile-open' : '')}>
        <div className="sidebar-top">
          <button className="back-to-main" type="button" onClick={goHome}>
            <span>←</span>
            <span className="sidebar-label-text">Back to Tech Katta</span>
          </button>

          <button
            className="sidebar-toggle"
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <div className="sidebar-scroll">
          <Brand />

          <div className="sidebar-program-title">
            Learn Technology
            <span>In a Hurry</span>
          </div>

          <nav className="sidebar-nav" aria-label="Learning navigation">
            <div className="sidebar-section">
              <div className="sidebar-section-title">Start Here</div>
              <button
                className={'sidebar-link' + (!activeCategory ? ' is-active' : '')}
                type="button"
                onClick={goHome}
                title={collapsed ? 'Overview' : undefined}
              >
                <span className="sidebar-link-index">01</span>
                <span className="sidebar-link-text">Overview</span>
              </button>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-section-title">Topic Tracks</div>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={'sidebar-link' + (activeCategory === category.id ? ' is-active' : '')}
                  type="button"
                  onClick={() => chooseCategory(category.id)}
                  aria-pressed={activeCategory === category.id}
                  title={collapsed ? category.label : undefined}
                >
                  <span className="sidebar-link-index">→</span>
                  <span className="sidebar-link-text">{category.label}</span>
                  <span className="sidebar-link-count">{category.count}</span>
                </button>
              ))}
            </div>

            <div className="sidebar-section sidebar-future">
              <div className="sidebar-section-title">Coming Up</div>
              <p><span className="sidebar-status-dot" />New notes when I learn something worth keeping.</p>
            </div>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <a href="https://github.com/yashbhoomkar/tech-katta" target="_blank" rel="noreferrer">GitHub ↗</a>
          <span>© 2026</span>
        </div>
      </aside>

      {mobileOpen && (
        <button className="sidebar-overlay" type="button" aria-label="Close navigation" onClick={onClose} />
      )}
    </>
  );
}

function Header({ isArticle, articleSlug, articleTitle, onOpenSidebar }) {
  return (
    <header className="site-header">
      <button className="mobile-sidebar-button" type="button" onClick={onOpenSidebar} aria-label="Open navigation">
        <span />
        <span />
        <span />
      </button>

      <div className="header-breadcrumb">
        <NavLink to="/" className="breadcrumb-link">Learn Technology</NavLink>
        {isArticle && (
          <>
            <span className="breadcrumb-separator">/</span>
            <NavLink to={'/learn/' + articleSlug} className="breadcrumb-link breadcrumb-current" aria-current="page">
              <strong>{articleTitle || 'Article'}</strong>
            </NavLink>
          </>
        )}
      </div>

      <div className="header-actions">
        <NavLink to="/">Library</NavLink>
        <a href="https://github.com/yashbhoomkar/tech-katta" target="_blank" rel="noreferrer">GitHub ↗</a>
      </div>
    </header>
  );
}

function Home({ query, activeCategory, onCategoryChange, articles, categories }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState(query);

  const visibleArticles = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return articles.filter((article) => {
      const categoryMatch = !activeCategory || article.category === activeCategory;
      if (!normalized) return categoryMatch;
      const haystack = [article.title, article.eyebrow, article.description, ...article.tags].join(' ').toLowerCase();
      return categoryMatch && haystack.includes(normalized);
    });
  }, [search, activeCategory]);

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="eyebrow">Learn Technology</div>
        <h1>Understand the tools that shape modern systems.</h1>
        <p>Practical notes on distributed systems, databases, AI infrastructure, and backend engineering — written while learning, with enough depth to be useful later.</p>
        <div className="eyebrow">Updated Oct 5, 2026 · CI/CD test #2</div>
      </section>

      <div className="library-toolbar">
        <div>
          <div className="eyebrow">Library</div>
          <h2>{activeCategory ? categories.find((category) => category.id === activeCategory)?.label : 'All notes'}</h2>
        </div>
        <label className="library-search">
          <span>⌕</span>
          <input value={search} onChange={(event) => { setSearch(event.target.value); }} placeholder="Search notes" aria-label="Search notes" />
        </label>
      </div>

      {activeCategory && (
        <div className="active-filter">
          <span>Showing {categories.find((category) => category.id === activeCategory)?.label}</span>
          <button type="button" onClick={() => onCategoryChange(null)}>Clear ×</button>
        </div>
      )}

      <section className="library-list">
        {visibleArticles.map((article) => {
          const content = (
            <>
              <div className="library-item-main">
                <span className="library-item-kicker">{article.eyebrow}</span>
                <h3><strong>{article.title}</strong></h3>
                <p>{article.description}</p>
                <div className="library-tags">
                  {article.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              </div>
              <div className="library-item-meta">
                <span className={article.status === 'published' ? 'published-dot' : 'soon-dot'} />
                <span>{article.status === 'published' ? article.readTime : 'Coming soon'}</span>
                <span className="library-arrow">→</span>
              </div>
            </>
          );

          return article.status === 'published' ? (
            <NavLink
              key={article.slug}
              to={'/learn/' + article.slug}
              className="library-item"
            >
              {content}
            </NavLink>
          ) : (
            <div key={article.slug} className="library-item is-soon">
              {content}
            </div>
          );
        })}
      </section>

      {!visibleArticles.length && (
        <div className="empty-state">Nothing matched “{search}”.</div>
      )}
    </main>
  );
}

export default function App() {
  const location = useLocation();
  const [articles, setArticles] = useState(fallbackArticles);
  const [categories, setCategories] = useState(fallbackCategories);
  const isArticle = location.pathname.startsWith('/learn/');
  const articleSlug = isArticle ? location.pathname.split('/learn/')[1] : null;
  const articleTitle = articles.find((article) => article.slug === articleSlug)?.title;
  const categoriesWithCounts = categories.map((category) => ({
    ...category,
    count: articles.filter((article) => article.category === category.id).length,
  }));
  const [activeCategory, setActiveCategory] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchArticles(), fetchCategories()]).then(([remoteArticles, remoteCategories]) => {
      if (!active) return;
      if (remoteArticles?.length) setArticles(remoteArticles);
      if (remoteCategories?.length) setCategories(remoteCategories);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className={'site-frame' + (sidebarCollapsed ? ' nav-collapsed' : '')}>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        onClose={() => setMobileSidebarOpen(false)}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        categories={categoriesWithCounts}
      />

      <div className="site-main">
        <Header isArticle={isArticle} articleSlug={articleSlug} articleTitle={articleTitle} onOpenSidebar={() => setMobileSidebarOpen(true)} />
        <Routes>
          <Route
            path="/"
            element={
              <Home
                query=""
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                articles={articles}
                categories={categoriesWithCounts}
              />
            }
          />
          <Route path="/learn/:slug" element={<Article />} />
        </Routes>
      </div>
    </div>
  );
}
