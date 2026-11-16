// The burst of section-coloured pieces when a lesson is marked complete.
import s from "@/features/reader/reader.module.css";

/** Ten pieces in the section colours fly out from the button. */
export function Burst() {
  const colours = ["var(--a-concepts)", "var(--a-components)", "var(--a-interview)", "var(--a-problems)", "var(--marigold)"];
  return (
    <span className={s.burstHost} aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const d = 46 + (i % 3) * 14;
        return <i key={i} className={s.burst} style={{ background: colours[i % colours.length], ["--x" as string]: `${Math.cos(a) * d}px`, ["--y" as string]: `${Math.sin(a) * d}px`, ["--rot" as string]: `${(i % 2 ? 1 : -1) * 120}deg` }} />;
      })}
    </span>
  );
}
