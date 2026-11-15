import { useParams } from "react-router-dom";
import { useContent } from "@/content/ContentProvider";
import { paths, sectionMeta } from "@/content/sections";
import { usePageMeta } from "@/components/layout/PageMeta";
import { ButtonAnchor, ButtonLink } from "@/components/ui";
import s from "./pages.module.css";

// Pages that arrive in later milestones (the lesson reader, Problems, the workspace). Each says so plainly and
// links to the same page in the current app, so nothing is a dead end while the new frontend grows.

const LEGACY = "/dashboard";

type Kind = "article" | "problems" | "problem";

export function ComingSoonPage({ kind }: { kind: Kind }) {
  const { section, slug } = useParams();
  const { articles } = useContent();
  const article = slug ? articles.find((a) => a.slug === slug) : undefined;

  const title = kind === "problems" ? "Problems" : (article?.title ?? "Coming soon");
  const up = kind === "article" && section ? { to: paths.section(section), label: "Section" } : kind === "problem" ? { to: paths.problems, label: "Problems" } : undefined;
  usePageMeta(title, up);

  const what = kind === "article" ? "The lesson reader" : kind === "problems" ? "The Problems page" : "The design workspace";
  const legacyHref = kind === "article" && section && slug ? `${LEGACY}/${section}/${slug}/` : kind === "problem" && slug ? `${LEGACY}/problems/${slug}/` : `${LEGACY}/problems/`;

  return (
    <div className={`${s.page} ${s.narrow}`} data-accent={section ? sectionMeta(section)?.accent : "problems"}>
      <p className="mono">Coming in the next milestone</p>
      <h1 style={{ fontSize: 36 }}>{title}</h1>
      {article && <p style={{ color: "var(--ink-2)", fontSize: 18 }}>{article.dek}</p>}
      <p className={s.muted}>{what} is being rebuilt in the new design. Until then it opens in the current app.</p>
      <div className={s.row} style={{ justifyContent: "flex-start" }}>
        <ButtonAnchor variant="primary" href={legacyHref}>Open in the current app →</ButtonAnchor>
        <ButtonLink to={up?.to ?? paths.home}>Back</ButtonLink>
      </div>
    </div>
  );
}
