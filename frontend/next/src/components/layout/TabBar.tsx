import { NavLink } from "react-router-dom";
import { useCommandPalette } from "@/components/CommandPalette";
import { Icon, type IconName } from "@/components/Icon";
import { paths } from "@/content/sections";
import s from "./layout.module.css";

// Phones only: five tabs in thumb reach. Search is a tab because a phone has no ⌘K.
const TABS: [IconName, string, string][] = [
  ["home", "Home", paths.home],
  ["learn", "Learn", paths.learn],
  ["problems", "Problems", paths.problems],
];

export function TabBar() {
  const { open } = useCommandPalette();
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? `${s.tab} ${s.tabActive}` : s.tab);
  return (
    <nav className={s.tabbar} aria-label="Tab bar">
      {TABS.map(([icon, label, to]) => (
        <NavLink key={to} to={to} className={cls}>
          <Icon name={icon} />
          <span>{label}</span>
        </NavLink>
      ))}
      <button type="button" className={s.tab} onClick={open}>
        <Icon name="search" />
        <span>Search</span>
      </button>
      <NavLink to={paths.me} className={cls}>
        <Icon name="me" />
        <span>You</span>
      </NavLink>
    </nav>
  );
}
