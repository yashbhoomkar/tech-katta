// The site's three typefaces (tech-katta-context 30, "type"), served from the site itself as variable fonts from
// @fontsource (SIL Open Font Licence). Each CSS file lists every subset with a unicode-range, so a visitor downloads
// only the Latin file (and others only if a page uses those letters):
// - Instrument Sans: interface and reading text (weights 400 to 700, about 30 KB)
// - Source Serif 4: headlines, article and card titles, and their italics (about 51 KB; the italic loads only where used)
// - Geist Mono: figures, code, labels and numbers (about 23 KB)
// The two Latin files a first screen needs are preloaded (vite.config.js, fontPreload). Fallback faces with matched
// widths (tokens.css) keep text from jumping while the fonts arrive (font-display: swap).
import"@fontsource-variable/instrument-sans/wght.css";import"@fontsource-variable/source-serif-4/wght.css";import"@fontsource-variable/source-serif-4/wght-italic.css";import"@fontsource-variable/geist-mono/wght.css";
