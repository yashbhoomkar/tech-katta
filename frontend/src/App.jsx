import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { articles as fallbackArticles, categories as fallbackCategories } from './data.js';
import { fetchArticles, fetchCategories } from './api.js';
import Article from './pages/Article.jsx';

function Brand() {
  return (
    <NavLink to="/" className="brand" aria-label="Tech Katta home">
      <span className="brand-mark">TK</span>
      <span className="brand-copy">
        <strong>Tech Katta</strong>
        <small>learn. build. explain.</small>
      </span>
    </NavLink>
  );
}

function Sidebar({ collapsed, mobileOpen, onToggle, onClose, activeUnit, units }) {
  const navigate = useNavigate();

  function chooseUnit(unitId) {
    navigate('/unit/' + unitId);
    onClose();
  }

  function goHome() {
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
              <NavLink
                className={'sidebar-link' + (!activeUnit ? ' is-active' : '')}
                to="/"
                title={collapsed ? 'Overview' : undefined}
                onClick={onClose}
              >
                <span className="sidebar-link-index">01</span>
                <span className="sidebar-link-text">Overview</span>
              </NavLink>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-section-title">Units</div>
              {units.map((unit) => (
                <NavLink
                  key={unit.id}
                  className={'sidebar-link' + (activeUnit === unit.id ? ' is-active' : '')}
                  to={'/unit/' + unit.id}
                  title={collapsed ? unit.label : undefined}
                  onClick={onClose}
                >
                  <span className="sidebar-link-index">→</span>
                  <span className="sidebar-link-text">{unit.label}</span>
                  <span className="sidebar-link-count">{unit.count}</span>
                </NavLink>
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

function Header({ unitId, unitLabel, isArticle, articleSlug, articleTitle, onOpenSidebar }) {
  return (
    <header className="site-header">
      <button className="mobile-sidebar-button" type="button" onClick={onOpenSidebar} aria-label="Open navigation">
        <span />
        <span />
        <span />
      </button>

      <div className="header-breadcrumb">
        <NavLink to="/" className="breadcrumb-link">Learn Technology</NavLink>
        {unitId && (
          <>
            <span className="breadcrumb-separator">/</span>
            <NavLink to={'/unit/' + unitId} className="breadcrumb-link">{unitLabel || 'Unit'}</NavLink>
          </>
        )}
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

function Home({ units }) {
  const [search, setSearch] = useState('');

  const visibleUnits = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return units;
    return units.filter((unit) => [unit.label, unit.description].join(' ').toLowerCase().includes(normalized));
  }, [search, units]);

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
          <div className="eyebrow">Learning path</div>
          <h2>Units</h2>
        </div>
        <label className="library-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search units"
            aria-label="Search units"
          />
        </label>
      </div>

      <section className="unit-grid" aria-label="Technology units">
        {visibleUnits.map((unit) => (
          <NavLink
            key={unit.id}
            to={'/unit/' + unit.id}
            className={'unit-card' + (unit.allUpcoming ? ' is-all-upcoming' : '')}
          >
            {unit.allUpcoming && <span className="unit-upcoming-badge">UPCOMING</span>}
            <div className="unit-card-main">
              <div className="unit-card-index">{String(units.findIndex((item) => item.id === unit.id) + 1).padStart(2, '0')}</div>
              <div>
                <span className="unit-card-kicker">Unit</span>
                <h3>{unit.label}</h3>
                <p>{unit.description}</p>
              </div>
            </div>
            <div className="unit-card-meta">
              <span>{unit.count} {unit.count === 1 ? 'chapter' : 'chapters'}</span>
              <span className="library-arrow">→</span>
            </div>
          </NavLink>
        ))}
      </section>

      {!visibleUnits.length && <div className="empty-state">Nothing matched “{search}”.</div>}
    </main>
  );
}

function UnitPage({ units, articles }) {
  const { unitId } = useParams();
  const unit = units.find((item) => item.id === unitId);
  const [search, setSearch] = useState('');

  const chapters = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return articles
      .filter((article) => article.category === unitId)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .filter((article) => {
        if (!normalized) return true;
        const haystack = [article.title, article.eyebrow, article.description, ...(article.tags || [])].join(' ').toLowerCase();
        return haystack.includes(normalized);
      });
  }, [articles, search, unitId]);

  if (!unit) {
    return (
      <main className="unit-page">
        <NavLink className="article-back" to="/">← Back to units</NavLink>
        <h1>That unit does not exist yet.</h1>
      </main>
    );
  }

  const publishedCount = articles.filter((article) => article.category === unitId && article.status === 'published').length;

  return (
    <main className="unit-page">
      <section className="unit-hero">
        <div className="eyebrow">Unit</div>
        <h1>{unit.label}</h1>
        <p>{unit.description}</p>
        <div className="unit-hero-meta">
          <span>{unit.count} {unit.count === 1 ? 'chapter' : 'chapters'}</span>
          <span>•</span>
          <span>{publishedCount} published</span>
        </div>
      </section>

      <div className="library-toolbar">
        <div>
          <div className="eyebrow">Chapters</div>
          <h2>{unit.label}</h2>
        </div>
        <label className="library-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search chapters"
            aria-label="Search chapters"
          />
        </label>
      </div>

      <section className="unit-chapter-list" aria-label={unit.label + ' chapters'}>
        {chapters.map((article, index) => {
          const chapterNumber = article.order ?? index + 1;
          const content = (
            <>
              <div className="unit-chapter-main">
                <div className="unit-chapter-number">{String(chapterNumber).padStart(2, '0')}</div>
                <div>
                  <span className="library-item-kicker">{article.eyebrow}</span>
                  <h3>{article.title}</h3>
                  <p>{article.description}</p>
                  <div className="library-tags">
                    {article.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                </div>
              </div>
              <div className="unit-chapter-meta">
                <span className={article.status === 'published' ? 'published-dot' : 'soon-dot'} />
                <span>{article.status === 'published' ? article.readTime : 'Coming soon'}</span>
                <span className="library-arrow">→</span>
              </div>
            </>
          );

          return article.status === 'published' ? (
            <NavLink key={article.slug} to={'/learn/' + article.slug} className="unit-chapter">
              {content}
            </NavLink>
          ) : (
            <div key={article.slug} className="unit-chapter is-soon">
              {content}
            </div>
          );
        })}
      </section>

      {!chapters.length && <div className="empty-state">Nothing matched “{search}”.</div>}
    </main>
  );
}

export default function App() {
  const location = useLocation();
  const [articles, setArticles] = useState(fallbackArticles);
  const [categories, setCategories] = useState(fallbackCategories);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isArticle = location.pathname.startsWith('/learn/');
  const unitMatch = location.pathname.match(/^\/unit\/([^/]+)/);
  const activeUnitFromPath = unitMatch ? unitMatch[1] : null;
  const articleSlug = isArticle ? location.pathname.split('/learn/')[1] : null;
  const article = articles.find((item) => item.slug === articleSlug);
  const unitId = article?.category || activeUnitFromPath;
  const units = categories.map((category) => {
    const unitArticles = articles.filter((articleItem) => articleItem.category === category.id);
    const publishedCount = unitArticles.filter((articleItem) => articleItem.status === 'published').length;
    return {
      ...category,
      count: unitArticles.length,
      publishedCount,
      allUpcoming: unitArticles.length > 0 && publishedCount === 0,
    };
  });
  const activeUnit = article?.category || activeUnitFromPath;
  const unitLabel = units.find((unit) => unit.id === unitId)?.label;

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
        activeUnit={activeUnit}
        units={units}
      />

      <div className="site-main">
        <Header
          isArticle={isArticle}
          unitId={unitId}
          unitLabel={unitLabel}
          articleSlug={articleSlug}
          articleTitle={article?.title}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
        />
        <Routes>
          <Route path="/" element={<Home units={units} />} />
          <Route path="/unit/:unitId" element={<UnitPage units={units} articles={articles} />} />
          <Route
            path="/learn/distributed-system-components"
            element={<Navigate to="/learn/distributed-system-components-overview" replace />}
          />
          <Route path="/learn/:slug" element={<Article />} />
        </Routes>
      </div>
    </div>
  );
}
