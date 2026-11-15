import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useContentState } from "@/content/ContentProvider";
import { problemsOf, sectionTitle, tally } from "@/content/model";
import { SECTIONS, paths } from "@/content/sections";
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
const FOCUS = /^\/problems\/.+/;

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

export function Sidebar() {
  const [rail, toggleRail] = useRail();
  const { open } = useCommandPalette();
  const content = useContentState();
  const progress = useProgress();
  const data = content.status === "success" ? content.data : null;

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
      <nav aria-label="Main" className={s.nav}>
        <NavLink to={paths.home} className={navClass} title="Home">
          <Icon name="home" />
          <span className={s.label}>Home</span>
        </NavLink>
        <p className={`${s.navHead} ${s.label}`}>Learn</p>
        {SECTIONS.map((sec) => {
          const own = data?.articles.filter((a) => a.section === sec.id) ?? [];
          const t = tally(own, progress);
          const title = data ? sectionTitle(data.site, sec.id) : sec.label;
          return (
            <NavLink key={sec.id} to={paths.section(sec.id)} className={navClass} data-accent={sec.accent} title={title}>
              <span className={s.dotWrap}><i className={s.dot} /></span>
              <span className={s.label}>{title}</span>
              {data && <small className={s.label}>{t.total ? `${t.done}/${t.total}` : "soon"}</small>}
            </NavLink>
          );
        })}
        <p className={`${s.navHead} ${s.label}`}>Practise</p>
        <NavLink to={paths.problems} className={navClass} data-accent="problems" title="Problems">
          <Icon name="problems" />
          <span className={s.label}>Problems</span>
          {data && <small className={s.label}>{tally(problemsOf(data.articles), progress).done}/{problemsOf(data.articles).length}</small>}
        </NavLink>
      </nav>
      <div className={s.sideFoot}>
        <div className={`${s.themeRow} ${s.label}`}>
          <span>Theme</span>
          <ThemeSwitch />
        </div>
        <Link to={paths.me} className={s.me} title="You and settings">
          <span className={s.avatar} aria-hidden="true"><Icon name="me" size={18} /></span>
          <span className={s.label}>
            You
            <small>Settings and theme</small>
          </span>
        </Link>
      </div>
    </aside>
  );
}
