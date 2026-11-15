import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useContent } from "@/content/ContentProvider";
import { AccountMenu } from "@/components/AccountMenu";
import { useContentState } from "@/content/ContentProvider";
import { problemsOf, sectionTitle, sectionView, tally } from "@/content/model";
import { SECTIONS, isSectionId, paths } from "@/content/sections";
import { useProgress } from "@/lib/progress";
import { readString, writeString } from "@/lib/storage";
import { useCommandPalette } from "@/components/CommandPalette";
import { Icon } from "@/components/Icon";
import { Logo } from "./Logo";
import { ThemeSwitch } from "@/components/ui";
import s from "./layout.module.css";

// Desktop navigation. Full (264 px) or a 72 px rail of icons and colour dots; "[" or the panel button toggles it
// and the choice is remembered. Each section shows how much of it has been read, so the sidebar doubles as a
// "where am I in the course" summary.

const RAIL_KEY = "tk-sidebar";

/** The workspace and challenges need the width: there the sidebar folds to the rail (without changing the saved
 *  choice) unless it is opened again on that page. */
const FOCUS = /^\/(problems\/.+|practice\/.+)/;

function useRail(): [boolean, () => void] {
  const { pathname } = useLocation();
  const focus = FOCUS.test(pathname);
  const [saved, setSaved] = useState(() => readString(RAIL_KEY) === "rail");
  const [openHere, setOpenHere] = useState(false);
  useEffect(() => setOpenHere(false), [pathname]);
  const rail = focus ? !openHere : saved;
  useEffect(() => {
    if (rail) document.documentElement.setAttribute("data-sidebar", "rail");
    else document.documentElement.removeAttribute("data-sidebar");
  }, [rail]);
  useEffect(() => writeString(RAIL_KEY, saved ? "rail" : "full"), [saved]);
  const toggle = useCallback(() => (focus ? setOpenHere((o) => !o) : setSaved((r) => !r)), [focus]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = !!el && (/^(input|textarea|select)$/i.test(el.tagName) || (el as HTMLElement).isContentEditable);
      if (e.key === "[" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);
  return [rail, toggle];
}

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? `${s.navItem} ${s.navActive}` : s.navItem);

/** The open section's lessons, in reading order and grouped, under its row (the current site's side list). */
function SectionLessons({ sectionId, accent }: { sectionId: string; accent: string }) {
  const { site, articles } = useContent();
  const progress = useProgress();
  const { pathname } = useLocation();
  if (!isSectionId(sectionId)) return null;
  const view = sectionView(site, articles, sectionId);
  return (
    <div className={`${s.sub} ${s.label}`} data-accent={accent} data-tour="side-sub">
      {view.groups.map((g) => (
        <div key={g.id}>
          {view.groups.length > 1 && <p className={s.subHead}>{g.title}</p>}
          {g.articles.map((a) => {
            const to = paths.article(sectionId, a.slug);
            return (
              <Link key={a.slug} to={to} className={s.subItem} aria-current={pathname.startsWith(to) ? "page" : undefined} data-done={progress[a.slug]?.done ? "" : undefined}>
                <i aria-hidden="true" />{a.title.split(":")[0]}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function Sidebar() {
  const { pathname } = useLocation();
  const [rail, toggleRail] = useRail();
  const { open } = useCommandPalette();
  const content = useContentState();
  // the active row's fill is one shape that slides between rows (tech.katta.cc's side marker)
  const navRef = useRef<HTMLElement>(null);
  const [mark, setMark] = useState<{ y: number; h: number; w: number; x: number } | null>(null);
  const progress = useProgress();
  const data = content.status === "success" ? content.data : null;
  useLayoutEffect(() => {
    const place = () => {
      // measured against the nav itself (section rows sit inside a wrapper with their lesson list)
      const nav = navRef.current;
      const a = nav?.querySelector<HTMLElement>(`.${s.navActive}`);
      if (!nav || !a) return setMark(null);
      const n = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
      setMark({ y: r.top - n.top + nav.scrollTop, h: r.height, w: r.width, x: r.left - n.left });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [pathname, rail, data]);

  return (
    <aside className={s.sidebar} aria-label="Sidebar">
      <div className={s.sideTop}>
        <Logo to={paths.home} compact={rail} />
        <button type="button" className={s.iconBtn} onClick={toggleRail} aria-label={rail ? "Expand sidebar" : "Collapse sidebar"} title={`${rail ? "Expand" : "Collapse"} sidebar  [`}>
          <Icon name="rail" />
        </button>
      </div>
      <button type="button" className={s.search} onClick={open} aria-label="Search" title="Search  ⌘K">
        <Icon name="search" size={18} />
        <span className={s.label}>Search</span>
        <kbd className={s.label}>⌘K</kbd>
      </button>
      <nav aria-label="Main" className={s.nav} ref={navRef}>
        {mark && <i className={s.sideMark} style={{ transform: `translate(${mark.x}px, ${mark.y}px)`, width: mark.w, height: mark.h }} aria-hidden="true" />}
        <NavLink to={paths.home} className={navClass} title="Home">
          <Icon name="home" />
          <span className={s.label}>Home</span>
        </NavLink>
        <p className={`${s.navHead} ${s.label}`}>Learn</p>
        {SECTIONS.map((sec) => {
          const own = data?.articles.filter((a) => a.section === sec.id) ?? [];
          const t = tally(own, progress);
          const title = data ? sectionTitle(data.site, sec.id) : sec.label;
          const here = pathname.startsWith(paths.section(sec.id));
          const notes = sec.id === "quick-notes" ? (data?.site.notes?.items.length ?? 0) : 0;
          return (
            <div key={sec.id}>
              <NavLink to={paths.section(sec.id)} className={navClass} data-accent={sec.accent} title={title} data-tour={here ? "side-nav" : undefined}>
                <span className={s.dotWrap}><i className={s.dot} /></span>
                <span className={s.label}>{title}</span>
                {data && <small className={s.label}>{t.total ? `${t.done}/${t.total}` : notes ? String(notes) : "soon"}</small>}
              </NavLink>
              {here && own.length > 0 && data && <SectionLessons sectionId={sec.id} accent={sec.accent} />}
            </div>
          );
        })}
        <p className={`${s.navHead} ${s.label}`}>Practise</p>
        <NavLink to={paths.problems} className={navClass} data-accent="problems" title="Problems">
          <Icon name="problems" />
          <span className={s.label}>Problems</span>
          {data && <small className={s.label}>{tally(problemsOf(data.articles), progress).done}/{problemsOf(data.articles).length}</small>}
        </NavLink>
      </nav>
      <nav className={`${s.policyLinks} ${s.label}`} aria-label="Policies">
        <Link to="/privacy">{data?.site.account?.privacy ?? "Privacy"}</Link>
        <Link to="/terms">{data?.site.account?.termsLink ?? "Terms and conditions"}</Link>
      </nav>
      <div className={s.sideFoot}>
        <div className={`${s.themeRow} ${s.label}`} data-tour="theme">
          <span>Theme</span>
          <ThemeSwitch />
        </div>
        <AccountMenu />
      </div>
    </aside>
  );
}
