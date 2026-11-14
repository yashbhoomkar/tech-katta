// The site's typeface (tech-katta-context 32, "type"): ONE family, Geist, for the interface, reading and headlines,
// plus Geist Mono where a monospace does a job (figures, code, numbers). Both are served from the site itself as
// variable fonts from @fontsource (SIL Open Font Licence). Each CSS file lists every subset with a unicode-range, so a
// visitor downloads only the Latin file (and others only if a page uses those letters):
// - Geist: every word on the site (weights 400 to 600 used, about 28 KB); no italic file: the site sets no italics
// - Geist Mono: figures, code, labels and numbers (about 23 KB)
// The Geist Latin file is preloaded (vite.config.js, fontPreload). A fallback face with matched widths (tokens.css)
// keeps text from jumping while the fonts arrive (font-display: swap).
import"@fontsource-variable/geist/wght.css";import"@fontsource-variable/geist-mono/wght.css";
