import { Link } from "react-router-dom";
import s from "./layout.module.css";

export function Logo({ to, compact = false }: { to: string; compact?: boolean }) {
  return (
    <Link to={to} className={s.logo} aria-label="Tech Katta, home">
      {/* the monogram is drawn by CSS (::before, with empty alt text), so the link's name is its visible words */}
      <b aria-hidden="true" />
      {!compact && <span>Tech Katta</span>}
    </Link>
  );
}
