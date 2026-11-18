import { Link } from "react-router-dom";
import { usePageMeta } from "@/components/layout/PageMeta";
import { Button, ButtonLink } from "@/components/ui";
import { useCommandPalette } from "@/components/CommandPalette";
import { SECTIONS, paths } from "@/content/sections";
import { StateScene } from "@/components/StateScene";
import s from "./pages.module.css";

// Not found: the request that reached a 404 box (spec 24 G3) framed as a figure, the message, and a way on: search,
// Home, or straight into a section. It renders outside the content gate (any unknown address), so it uses the
// built-in section names, not the API's.
export function NotFoundPage() {
  usePageMeta("Page not found");
  const { open } = useCommandPalette();
  return (
    <div className={s.lost}>
      <div className={s.lostFig}><StateScene kind="missing" /></div>
      <p className="mono">Error 404</p>
      <h1>This page isn't here.</h1>
      <p className={s.muted}>The link may be old, or the lesson may have moved. Search for it, or start from Home.</p>
      <div className={s.lostActions}>
        <Button variant="primary" onClick={open}>Search</Button>
        <ButtonLink to={paths.home}>Home</ButtonLink>
        <ButtonLink to={paths.learn}>Learn</ButtonLink>
      </div>
      <nav className={s.lostLinks} aria-label="Sections">
        {SECTIONS.map((m) => (
          <Link key={m.id} to={paths.section(m.id)} data-accent={m.accent}><i aria-hidden="true" />{m.label}</Link>
        ))}
        <Link to={paths.problems} data-accent="problems"><i aria-hidden="true" />Problems</Link>
      </nav>
    </div>
  );
}
