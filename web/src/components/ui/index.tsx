import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { setPref, useThemePref, type ThemePref } from "@/lib/theme";
import s from "./ui.module.css";

type Variant = "default" | "primary" | "ghost";
type Size = "md" | "sm" | "icon";

function btnClass(variant: Variant = "default", size: Size = "md", extra?: string): string {
  return [s.btn, variant !== "default" && s[variant], size !== "md" && s[size], extra].filter(Boolean).join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant, size, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={btnClass(variant, size, className)} {...rest} />;
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
}

export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={btnClass(variant, size, className)} {...rest} />;
}

/** A button-styled link that leaves the app (another site, or the current app during the migration). */
export function ButtonAnchor({ variant, size, className, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size }) {
  return <a className={btnClass(variant, size, className)} {...rest} />;
}

export function Chip({ children, level, className }: { children: ReactNode; level?: "easy" | "medium" | "hard"; className?: string | undefined }) {
  return <span className={[s.chip, level && s[level], className].filter(Boolean).join(" ")}>{children}</span>;
}

/** value: 0..1. Reads --a for its colour, so wrap it (or a parent) in data-accent. */
export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string | undefined }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={[s.bar, className].filter(Boolean).join(" ")} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Card({ children, className, style }: { children: ReactNode; className?: string | undefined; style?: CSSProperties }) {
  return <div className={[s.card, className].filter(Boolean).join(" ")} style={style}>{children}</div>;
}

export function Skeleton({ width = "100%", height = 14 }: { width?: number | string; height?: number }) {
  return <span className={s.skeleton} style={{ width, height }} aria-hidden="true" />;
}

const THEMES: [ThemePref, string][] = [
  ["system", "Match this device"],
  ["light", "Light"],
  ["dark", "Dark"],
];

export function ThemeSwitch({ label = "Theme" }: { label?: string }) {
  const pref = useThemePref();
  return (
    <div className={s.themeSwitch} role="group" aria-label={label}>
      {THEMES.map(([value, name]) => (
        <button key={value} type="button" aria-pressed={pref === value} title={name} aria-label={name} onClick={() => setPref(value)}>
          <Icon name={value} size={16} />
        </button>
      ))}
    </div>
  );
}

export function StateMessage({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={s.state} role="status">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
