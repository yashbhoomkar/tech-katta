import { forwardRef, type MouseEvent } from "react";
import { Link, type LinkProps } from "react-router-dom";

// A link whose page change runs as a view transition (spec 24 A2): the page cross-fades, and with `morph` the
// element marked [data-morph] inside it carries view-transition-name tk-title, so a card's title becomes the
// lesson's title (the reader's h1 has the same name). Browsers without view transitions navigate as usual.
export const TransitionLink = forwardRef<HTMLAnchorElement, LinkProps & { morph?: boolean }>(function TransitionLink({ morph, onClick, ...rest }, ref) {
  const click = (e: MouseEvent<HTMLAnchorElement>) => {
    if (morph) {
      document.querySelectorAll<HTMLElement>("[data-morph]").forEach((el) => (el.style.viewTransitionName = ""));
      const t = e.currentTarget.querySelector<HTMLElement>("[data-morph]");
      if (t) t.style.viewTransitionName = "tk-title";
    }
    onClick?.(e);
  };
  return <Link ref={ref} viewTransition onClick={click} {...rest} />;
});
