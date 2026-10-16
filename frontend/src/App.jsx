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
        <small>notes on building systems</small>
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
            Engineering notes
            <span>things I’m learning, building, and trying to understand</span>
          </div>

          <nav className="sidebar-nav" aria-label="Learning navigation">
            <div className="sidebar-section">
              <div className="sidebar-section-title">Library</div>
              <NavLink
                className={'sidebar-link' + (!activeUnit ? ' is-active' : '')}
                to="/"
                title={collapsed ? 'All notes' : undefined}
                onClick={onClose}
              >
                <span className="sidebar-link-index">01</span>
                <span className="sidebar-link-text">All notes</span>
              </NavLink>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-section-title">Topics</div>
              {units.map((unit) => (
                <NavLink
                  key={unit.id}
                  className={'sidebar-link' + (activeUnit === unit.id ? ' is-active' : '')}
                  to={'/unit/' + unit.id}
                  title={collapsed ? unit.label : undefined}
                  onClick={onClose}
                >
                  <span className="sidebar-link-index">→</span>
                  <span className="sidebar-link-text">
                    {unit.label}
                    {unit.allUpcoming && <span className="sidebar-upcoming-badge">UPCOMING</span>}
                  </span>
                  <span className="sidebar-link-count">{unit.count}</span>
                </NavLink>
              ))}
            </div>

            <div className="sidebar-section sidebar-future">
              <div className="sidebar-section-title">Next</div>
              <p><span className="sidebar-status-dot" />New notes as I learn something worth keeping.</p>
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
        <NavLink to="/" className="breadcrumb-link">Notes</NavLink>
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

function Home({ units, articles }) {
  const [search, setSearch] = useState('');

  const visibleUnits = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return units;
    return units.filter((unit) => [unit.label, unit.description].join(' ').toLowerCase().includes(normalized));
  }, [search, units]);

  const publishedNotes = useMemo(
    () => articles
      .filter((article) => article.status === 'published')
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
    [articles]
  );
  const recentNotes = publishedNotes.slice(0, 3);

  return (
    <main className="home-page">
      <section className="home-hero home-hero-layout">
        <div className="home-hero-copy">
          <div className="eyebrow">Yash’s engineering notes <span className="hero-edition">/ FIELD NOTES</span></div>
          <h1>Things I learn, build, and eventually understand.</h1>
          <p>Mostly distributed systems and backend infrastructure, with notes from databases and AI systems when they intersect with something I’m building or trying to understand.</p>
          <div className="home-note"><span className="home-note-mark" /> Written while learning, building, and debugging real systems.</div>
        </div>
        <div className="home-system-visual" aria-hidden="true">
          <div className="system-visual-top"><span>MENTAL MODEL / 001</span><span>REQUEST FLOW</span></div>
          <div className="system-flow">
            <div className="system-node system-node-client"><span className="system-node-index">01</span><strong>Client</strong><small>request</small></div>
            <span className="system-flow-link"><i /></span>
            <div className="system-node system-node-service"><span className="system-node-index">02</span><strong>Service</strong><small>compute</small></div>
            <span className="system-flow-link"><i /></span>
            <div className="system-node system-node-store"><span className="system-node-index">03</span><strong>Storage</strong><small>state</small></div>
          </div>
          <div className="system-visual-footer"><span><i className="system-status-dot" /> Every hop has a trade-off</span><span>LATENCY · FAILURE · SCALE</span></div>
        </div>
      </section>

      <div className="library-toolbar">
        <div>
          <div className="eyebrow">What I’m studying</div>
          <h2>Topics</h2>
        </div>
        <label className="library-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search topics"
            aria-label="Search topics"
          />
        </label>
      </div>

      <section className="unit-grid" aria-label="Technology topics">
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
                <span className="unit-card-kicker">Topic</span>
                <h3>{unit.label}</h3>
                <p>{unit.description}</p>
              </div>
            </div>
            <div className="unit-card-meta">
              <span>{unit.count} {unit.count === 1 ? 'note' : 'notes'}</span>
              <span className="library-arrow">→</span>
            </div>
          </NavLink>
        ))}
      </section>

      {!visibleUnits.length && <div className="empty-state">Nothing matched “{search}”.</div>}

      {recentNotes.length > 0 && (
        <section className="recent-notes" aria-labelledby="recent-notes-title">
          <div className="recent-notes-heading">
            <div>
              <div className="eyebrow">From the notebook</div>
              <h2 id="recent-notes-title">Notes worth keeping</h2>
            </div>
            <span className="recent-notes-count">{String(publishedNotes.length).padStart(2, '0')} PUBLISHED</span>
          </div>
          <div className="recent-notes-list">
            {recentNotes.map((note, index) => (
              <NavLink key={note.slug} to={'/learn/' + note.slug} className="recent-note">
                <span className="recent-note-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="recent-note-copy">
                  <span className="recent-note-topic">{units.find((unit) => unit.id === note.category)?.label || 'Engineering'}</span>
                  <strong>{note.title}</strong>
                  <span className="recent-note-description">{note.description}</span>
                </span>
                <span className="recent-note-meta">{note.readTime || 'Note'} <span aria-hidden="true">↗</span></span>
              </NavLink>
            ))}
          </div>
        </section>
      )}
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
        <div className="eyebrow">Topic</div>
        <h1>{unit.label}</h1>
        <p>{unit.description}</p>
        <div className="unit-hero-meta">
          <span>{unit.count} {unit.count === 1 ? 'note' : 'notes'}</span>
          <span>•</span>
          <span>{publishedCount} published</span>
        </div>
      </section>

      <div className="library-toolbar">
        <div>
          <div className="eyebrow">Notes in this topic</div>
          <h2>{unit.label}</h2>
        </div>
        <label className="library-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notes"
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
  const navigate = useNavigate();
  const [articles, setArticles] = useState(fallbackArticles);
  const [categories, setCategories] = useState(fallbackCategories);
  const [apiError, setApiError] = useState(false);
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
      const articlesFailed = remoteArticles?.status === 'error';
      const categoriesFailed = remoteCategories?.status === 'error';

      // Successful empty responses are authoritative. Only network failures (null)
      // use the bundled fallback; server errors must not silently show stale content.
      if (Array.isArray(remoteArticles)) setArticles(remoteArticles);
      else if (articlesFailed) setArticles([]);
      if (Array.isArray(remoteCategories)) setCategories(remoteCategories);
      else if (categoriesFailed) setCategories([]);
      setApiError(articlesFailed || categoriesFailed);
    }).catch(() => {
      if (active) setApiError(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let startX = null;
    let startY = null;
    let startTarget = null;

    const onTouchStart = (event) => {
      if (event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      startTarget = event.target;
    };

    const onTouchEnd = (event) => {
      if (startX === null || startY === null || event.changedTouches.length !== 1) return;

      const endX = event.changedTouches[0].clientX;
      const endY = event.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const target = startTarget;

      startX = null;
      startY = null;
      startTarget = null;

      if (Math.abs(deltaX) < 70 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return;

      if (mobileSidebarOpen) {
        if (deltaX < 0) setMobileSidebarOpen(false);
        return;
      }

      // On the home page, a right swipe opens the navigation instead of
      // navigating browser history. Other pages retain back/forward gestures.
      if (location.pathname === '/' && deltaX > 0) {
        setMobileSidebarOpen(true);
        return;
      }

      // Let horizontally scrollable content (code, tables, diagrams, etc.) keep
      // its native swipe behavior instead of treating the gesture as navigation.
      if (target instanceof Element) {
        const horizontalScroller = target.closest(
          '.doc-code, .doc-table-wrap, .doc-figure, .diagram-static-frame, [data-horizontal-scroll]'
        );
        if (horizontalScroller && horizontalScroller.scrollWidth > horizontalScroller.clientWidth + 2) {
          return;
        }
      }

      // The home page has no previous/next article context; left swipe must not
      // activate a stale forward-history entry from an earlier route.
      if (location.pathname === '/' && deltaX < 0) return;

      // Match Chrome-style mobile navigation on article/unit pages.
      navigate(deltaX > 0 ? -1 : 1);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [location.pathname, mobileSidebarOpen, navigate]);

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
        {apiError && (
          <div className="empty-state api-error-banner" role="alert">
            The content service is temporarily unavailable. Some notes may be hidden until it recovers.
          </div>
        )}
        <Routes>
          <Route path="/" element={<Home units={units} articles={articles} />} />
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
