import { Link } from "react-router-dom";
import s from "./layout.module.css";

export function Logo({ to, compact = false }: { to: string; compact?: boolean }) {
  return (
    <Link to={to} className={s.logo} aria-label="Tech Katta, home">
      <b aria-hidden="true">TK</b>
      {!compact && <span>Tech Katta</span>}
    </Link>
  );
}
