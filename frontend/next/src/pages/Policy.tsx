import { useContent } from "@/content/ContentProvider";
import { usePageMeta } from "@/components/layout/PageMeta";
import s from "./pages.module.css";

// Privacy policy and Terms and conditions, from the site copy (site.privacy, site.terms). Always open.

export function PolicyPage({ which }: { which: "privacy" | "terms" }) {
  const { site } = useContent();
  const p = site[which];
  usePageMeta(p?.title ?? (which === "privacy" ? "Privacy" : "Terms"));
  if (!p) return null;
  return (
    <article className={`${s.page} ${s.narrow} ${s.policy}`}>
      <p className="mono">{p.eyebrow}</p>
      <h1>{p.title}</h1>
      <p className={s.muted}>{p.updated}</p>
      {p.sections.map(([h, text]) => (
        <section key={h}>
          <h2>{h}</h2>
          {text.split(/\n\n+/).map((para, i) => <p key={i}>{para}</p>)}
        </section>
      ))}
    </article>
  );
}
