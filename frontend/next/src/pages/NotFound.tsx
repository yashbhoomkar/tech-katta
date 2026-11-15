import { usePageMeta } from "@/components/layout/PageMeta";
import { Button, ButtonLink } from "@/components/ui";
import { useCommandPalette } from "@/components/CommandPalette";
import { paths } from "@/content/sections";
import s from "./pages.module.css";

export function NotFoundPage() {
  usePageMeta("Page not found");
  const { open } = useCommandPalette();
  return (
    <div className={`${s.page} ${s.narrow}`} style={{ paddingTop: "12vh" }}>
      <p className="mono">404</p>
      <h1 style={{ fontSize: 44 }}>This page isn't here.</h1>
      <p className={s.muted} style={{ fontSize: 18 }}>The link may be old, or the lesson may have moved. Search for it, or start from Home.</p>
      <div className={s.row} style={{ justifyContent: "flex-start" }}>
        <Button variant="primary" onClick={open}>Search</Button>
        <ButtonLink to={paths.home}>Home</ButtonLink>
        <ButtonLink to={paths.learn}>Learn</ButtonLink>
      </div>
    </div>
  );
}
