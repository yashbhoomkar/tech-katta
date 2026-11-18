import { Link } from "react-router-dom";
import { useContent } from "@/content/ContentProvider";
import { nextInSection, sectionView, tally } from "@/content/model";
import { SECTIONS, paths } from "@/content/sections";
import { usePageMeta } from "@/components/layout/PageMeta";
import { ButtonLink, ProgressBar } from "@/components/ui";
import { useProgress } from "@/lib/progress";
import { SectionPicture } from "@/components/SectionPicture";
import s from "./pages.module.css";

export function LearnPage() {
  usePageMeta("Learn");
  const { site, articles } = useContent();
  const progress = useProgress();
  const cardText = new Map(site.topics.cards.map((c) => [c.id, c.desc]));

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1>Learn</h1>
          <p>Start with Concepts if you are new; jump anywhere if you have an interview soon.</p>
        </div>
      </div>
      <div className={s.hub}>
        {SECTIONS.map((meta) => {
          const view = sectionView(site, articles, meta.id);
          const all = view.groups.flatMap((g) => g.articles);
          const t = tally(all, progress);
          const next = nextInSection(view, progress);
          return (
            <article key={meta.id} className={s.hubCard} data-accent={meta.accent}>
              <Link to={paths.section(meta.id)} className={s.hubMain}>
                <SectionPicture sectionId={meta.id} className={s.hubPic} />
                <span className="mono">{view.total ? `${view.total} lessons` : view.id === "quick-notes" && site.notes ? `${site.notes.items.length} notes` : "Coming soon"}</span>
                <h2>{view.title || meta.label}</h2>
                <p>{cardText.get(meta.id) ?? meta.blurb}</p>
              </Link>
              {view.total > 0 && (
                <div className={s.hubFoot}>
                  <ProgressBar value={t.total ? t.done / t.total : 0} label={`${view.title} progress`} />
                  <small>{t.done} of {t.total} done</small>
                  {next && (
                    <ButtonLink size="sm" to={paths.article(meta.id, next.slug)}>
                      {progress[next.slug] ? "Continue" : "Start"} →
                    </ButtonLink>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
