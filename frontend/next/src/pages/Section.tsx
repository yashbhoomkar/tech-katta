import { Link, useParams } from "react-router-dom";
import { useContent } from "@/content/ContentProvider";
import { nextInSection, sectionView, tally } from "@/content/model";
import { isSectionId, paths, sectionMeta } from "@/content/sections";
import { usePageMeta } from "@/components/layout/PageMeta";
import { Icon } from "@/components/Icon";
import { ButtonLink, Chip, ProgressBar, StateMessage } from "@/components/ui";
import { useProgress } from "@/lib/progress";
import { NotFoundPage } from "./NotFound";
import s from "./pages.module.css";

export function SectionPage() {
  const { section } = useParams();
  return isSectionId(section) ? <Section id={section} /> : <NotFoundPage />;
}

function Section({ id }: { id: Parameters<typeof sectionView>[2] }) {
  const { site, articles } = useContent();
  const progress = useProgress();
  const view = sectionView(site, articles, id);
  const meta = sectionMeta(id);
  usePageMeta(view.title, { to: paths.learn, label: "Learn" });
  // the API's topic card for Interview Questions has the id "problems"
  const card = site.topics.cards.find((c) => c.id === (id === "interview-questions" ? "problems" : id));
  const all = view.groups.flatMap((g) => g.articles);
  const t = tally(all, progress);
  const next = nextInSection(view, progress);

  return (
    <div className={s.page} data-accent={meta?.accent}>
      <header className={s.sechead}>
        <div>
          <p className="mono">{card?.kind ?? view.title}</p>
          <h1>{view.title}</h1>
          <p>{card?.desc ?? meta?.blurb}</p>
        </div>
        {view.total > 0 && (
          <div className={s.cprog}>
            <b>{t.done} of {t.total} done</b>
            <ProgressBar value={t.total ? t.done / t.total : 0} label={`${view.title} progress`} />
            {next && (
              <>
                <small>Next up: {next.title}</small>
                <ButtonLink variant="primary" to={paths.article(id, next.slug)}>{progress[next.slug] ? "Continue" : "Start"} →</ButtonLink>
              </>
            )}
          </div>
        )}
      </header>

      {view.total === 0 && <StateMessage title="Coming soon">Nothing in this section yet. The first notes are being written.</StateMessage>}

      {view.groups.length > 1 && (
        <nav className={s.jump} aria-label={`Groups in ${view.title}`}>
          {view.groups.map((g) => (
            <a key={g.id} href={`#g-${g.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`g-${g.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
              {g.title}
            </a>
          ))}
        </nav>
      )}

      {view.groups.map((g) => {
        const gt = tally(g.articles, progress);
        return (
          <section key={g.id} id={`g-${g.id}`} className={s.group} aria-labelledby={`gh-${g.id}`}>
            <div className={s.groupHead}>
              <div>
                <h2 id={`gh-${g.id}`}>{g.title}</h2>
                {g.desc && <p>{g.desc}</p>}
              </div>
              <Chip>{gt.done} of {gt.total} done</Chip>
            </div>
            {g.articles.map((a, i) => {
              const p = progress[a.slug];
              const state = p?.done ? s.done : p ? s.now : "";
              return (
                <Link key={a.slug} to={paths.article(id, a.slug)} className={`${s.lesson} ${state}`}>
                  <span className={s.st} aria-label={p?.done ? "Done" : p ? "In progress" : "Not started"}>{p?.done && <Icon name="check" size={12} />}</span>
                  <span className={s.no}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={s.lessonTitle}>{a.title}</span>
                  <span className={s.lessonTag}>{a.tag}</span>
                </Link>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
