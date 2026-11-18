import { Link } from "react-router-dom";
import { useCommandPalette } from "@/components/CommandPalette";
import { Icon } from "@/components/Icon";
import { paths } from "@/content/sections";
import { Logo } from "./Logo";
import { usePageMetaValue } from "./PageMeta";
import s from "./layout.module.css";

// Phones only (hidden on desktop, where the sidebar does this job). Top-level pages show the logo; deeper pages
// show ‹ back to their parent and their title.
export function TopBar() {
  const meta = usePageMetaValue();
  const { open } = useCommandPalette();
  return (
    <header className={s.topbar}>
      <div className={s.topLeft}>
        {meta?.up ? (
          <>
            <Link to={meta.up.to} className={s.iconBtn} aria-label={`Back to ${meta.up.label}`}>
              <Icon name="back" />
            </Link>
            <b className={s.topTitle}>{meta.title}</b>
          </>
        ) : (
          <Logo to={paths.home} />
        )}
      </div>
      <button type="button" className={s.iconBtn} onClick={open} aria-label="Search">
        <Icon name="search" />
      </button>
    </header>
  );
}
