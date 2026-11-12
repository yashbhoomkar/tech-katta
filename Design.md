# Design.md — the look we are moving towards

Observed on **fanout.sh** on 2026-11-12 (owner: "take inspiration of their UI"). This file records what that site does,
measured in a browser rather than guessed, and how each idea maps onto Tech Katta's own theme (`frontend/src/theme/`).
It is **inspiration, not a copy**: we take the principles (type pairing, tactile depth, card language, motion
timing), never their brand, artwork, copy or layouts one-to-one. See "Do not copy" at the end.

How it was observed: Chromium at 1440×900 and Pixel 7, every visible element's computed style collected (fonts,
sizes, colours, borders, radii, shadows, transitions, animations), their published CSS variables read, hover states
captured, and their own dark theme switched on. Pages: the landing page, the System Design course overview
(`/system/overview`) and a lesson page (`/system/archive/consistent-hashing-load-balancing`). Values below are
theirs unless marked **TK** (what we would use).

---

## 1. The character in one paragraph

A calm, near-white canvas (`#f7f7f8`) with near-black ink (`#272727`), where almost everything is a soft rounded
card lifted by very light layered shadows, and the personality comes from three places only: **type** (a neutral
grotesk for reading, a pixel monospace for one or two words of emphasis, a plain monospace for small uppercase
labels and counts), **colourful tactile objects** (pastel course "folders", bright numbered tiles, illustrated
textures), and **small physical motion** (buttons with a pressed bottom edge, cards that lift 1–5 px on hover,
arrows that slide 3 px). The UI chrome itself stays grey; colour lives in content.

Compared with Tech Katta today (Swiss: white, hairlines, square corners, cobalt accent, no shadows), the change is:
square → rounded, flat → softly lifted, cobalt accent everywhere → neutral ink for actions with colour kept for
content, Inter → a grotesk with more character plus a pixel-mono accent.

---

## 2. Layout

| | fanout | Notes |
|---|---|---|
| Page background | `#f7f7f8` (off-white), cards `#fff` on top | the off-white is what makes white cards read without borders |
| Top bar | 64 px, glass: `#f7f7f8e6` + `backdrop-filter: blur(8px)`, bottom hairline | logo · product switcher · text nav · right: "New in…" pill, round search button, Sign in |
| Announcement strip | 40 px above the bar, pale blue, centred: red "LIVE" pill + message + "Start the course →", close ✕ | dismissible |
| App shell (course pages) | sidebar 248 px (`#fafafa`), content max 1280 px, reading max 1000 px | sidebar: course switcher, "Workspace" links with line icons, numbered modules with lesson counts |
| Landing width | sections max 1280 px; text columns 580–690 px | generous vertical rhythm (80–120 px between sections) |
| Grids | course cards 3 across (≈309×527), tiles 4 across, curriculum 3 across | gaps 12–16 px |
| Spacing scale | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 | a strict 4 px base |

Landing sections in order: hero (headline, one-line pitch, primary + ghost button, floating paper "artefacts" around
it) → "Shared around the world" logo marquee → "Choose where to start" course folders → testimonial wall (tweets) →
"Inside the learning box" (an illustrated kraft folder with numbered sticky notes explaining the product) →
"Everything else" numbered colour tiles → Plans → "Keep company with people doing the work" (study wall) → FAQ
accordion → "Check out the roadmaps" call-out → big footer with a newsletter row.

---

## 3. Colour

**Neutral ink scale** (their `--ga-ink-*`): `#fbfbfb` 50 · `#f3f3f3` 100 · `#e1e1e1` 200 · `#cfcfcf` 300 · `#adadad` 400 ·
`#929292` 500 · `#6e6e6e` 600 · `#4a4a4a` 700 · `#272727` 800 · `#1d1d1d` 900.

| Role | Light | Dark (`html.dark`) |
|---|---|---|
| Page | `#f7f7f8` | `#111213` |
| Card / surface | `#ffffff` | `#191a1c` |
| Sidebar | `#fafafa` | `#151617` |
| Hover fill | `#f0f0f2` | `#242527` |
| Chip fill | `#f4f4f5` | `#202123` |
| Divider | `#e8e8ea` | `#2a2b2e` |
| Border | `#dedee2` (strong `#c9c9cf`) | `#36373b` (strong `#4c4e54`) |
| Text 1 / 2 / 3 | `#272727` / `#6e6e6e` / `#929292` | `#f2f4f7` / `#a9b0ba` / `#747d89` |
| Primary action | ink-900 `#1d1d1d` (gradient `#272727→#414141`) | inverts to `#f2f4f7` with dark text |
| Link / info | `#2f7cf6`, course blue `#1062fe` on `#e4ecfd` | `#6ea2ff`, `#7fa9ff` |
| Success / warning / danger | `#0f9d58` / `#e8822a` / `#dc2626` | `#4ed08a` / `#f0a45b` / `#f87171` |
| Categories | green `#2ab673`, blue `#2f7cf6`, red `#e4402c`, orange `#e8822a`, purple `#6e56cf`, yellow `#e9b949` | |

**Content colour** (only on cards, never on chrome): pastel washes behind course folders — sage, dusty pink, butter
yellow, powder blue, teal, lavender, warm grey, terracotta — each the folder's own colour at ~50 % on the off-white;
the "everything else" tiles in full-strength pink, orange, white, cobalt, mint, lavender, sky, sand with black text.

Shadows are tinted grey `#3b3b3b` at very low alpha, never pure black (see §5).

---

## 4. Typography

| Use | Family | Measured |
|---|---|---|
| UI, body, headings | **Overused Grotesk** (open source, OFL) → system sans fallback | UI text 13–16 px / 1.5; card titles 22 px w600; section titles 21–30 px w600 −0.025em; course H1 48 px w600 / 1.08 |
| Hero headline | Overused Grotesk w400 | 88 px / 0.99, letter-spacing −0.052em (very tight); the brand-name line inside it 56 px |
| Display accent | **Departure Mono** (pixel monospace, OFL) | one word per headline: "Mapped.", "first principles.", `fanout` wordmark; also the LIVE pill (9 px w600 uppercase) |
| Labels, counts, meta | **IBM Plex Mono** | 9–11 px, UPPERCASE, letter-spacing +0.06–0.08em, grey: "PICK YOUR PATH", "CURRICULUM STRUCTURE", "13 LESSONS", "18 MODULES · 200 LESSONS · **27 FREE**" |
| Lesson pages | **Inter** for reading | title 38 px w600; h2 27 px w600; body 16 px / **1.78** (28.5 px), secondary paragraphs in grey `#6e6e6e` |

Type scale tokens: 12 · 13 · 14 · 16 · 18 · 20 · 24 · 32 · 56 (hero overrides). Weights 400 · 500 · 600 (650 for a few
titles). Rule of thumb they follow: **sans for things you read, mono for things you count, pixel-mono for one word
you remember.**

---

## 5. Shape and depth

- **Radii**: pills `999px` (chips, meta pills, the "online" widget, the "New in…" button), cards `12px`, buttons
  `7–9px`, small badges `4px`. Tokens: 4 · 6 · 8 · 12 · 16 · full.
- **Shadows** (layered, tinted, low alpha):
  - sm `0 1px 2px #3b3b3b17, 0 0 0 1px #3b3b3b03`
  - md `0 1px 2px #3b3b3b17, 0 2px 4px #3b3b3b0d, 0 0 0 1px #3b3b3b03` (most cards)
  - lg `0 2px 4px #3b3b3b0d, 0 4px 8px #3b3b3b17, 0 8px 16px #3b3b3b1a, 0 0 0 1px #3b3b3b03` (hover, raised cards)
  - inset well `inset 0 0 2px #00000008` (input-like areas)
  - Dark: same structure with black at 0.35–0.45 and a `#ffffff06` 1 px ring.
- **Tactile buttons** — the signature detail. The primary button is a dark gradient (`#272727 → #414141`), radius 9,
  with a stack of soft drop shadows plus `inset 0 1px 1px #ffffff7a` (top highlight) and `inset 0 -3px 0 #232323`
  (a thicker bottom edge, like a physical key). Secondary buttons are white with a `#c9c9cf` border and
  `inset 0 -3px 0 #d3d3d3`. On hover the primary lifts `translateY(-2px)` and darkens slightly.
- **Glass**: top bar and floating panels use translucent fills with `backdrop-filter: blur(4–8px)`.
- **Texture**: paper and kraft surfaces are drawn with layered radial gradients plus fine repeating-linear-gradient
  hatching (1 px lines every 6–8 px at 2–3 % alpha) — no image files needed.

---

## 6. Components (what each looks like)

1. **LIVE pill**: red `#dc2626`, white Departure Mono 9 px uppercase, radius 4, a blinking dot (`fanout-live-blink`).
2. **Announcement pill in the hero**: pale blue fill, LIVE pill + blue text + "New course →".
3. **Nav links**: 12.25 px grey `#6e6e6e`, hover to ink, colour transition .15 s; dropdowns with a small chevron.
4. **Round icon button** (search): white circle with the tactile bottom edge.
5. **Primary / secondary buttons**: see §5; label 15 px w500; a trailing `→` that slides 3 px on hover.
6. **Ghost link button**: icon + underlined text ("▷ See demo"), underline offset, no box.
7. **Course folder card**: 12 px radius, pastel background, 28/24 px padding; a large illustrated folder at the top
   that **slides up out of the card on hover** (the card itself stays put); title 22 px w600; three "+ " bullet lines
   13 px; a meta pill (mono uppercase, white 40 % fill, the important number bold); footer row "Open ……… →".
   A "SOON" / "LAUNCHING" mono tag replaces the meta pill for unreleased ones; unreleased cards are grey.
8. **Numbered tiles**: full-colour, radius 12, big number top-right (40 px w600) with a 2-line mono caption under it,
   a hand-drawn line illustration, title bottom-left 30 px w600, one-line subtitle, round arrow button bottom-right
   (black 10 % fill). Hover: lift −5 px + shadow-lg, arrow slides 3 px.
9. **Curriculum grid** (course overview): a white panel titled in mono caps; 3-column grid of rows, each a pale
   chip-coloured box: mono index `01` (grey) · module title 14 px · mono "13 LESSONS" under it · `→` on the right.
10. **Lesson cards** (overview "Grid"): white cards with a mono index (`01.04`), a ★ for paid ones, title, and a
    colourful flat illustration; a **List / Grid** switch and filter tabs ("All 200 · Real-world systems 31 · Case
    studies 5") above them; a module stepper with a blue pill on the current module.
11. **Sidebar**: course switcher at the top; "WORKSPACE" mono label; icon links (Overview selected = grey pill);
    a small info card ("27 lessons open · ★ marks Pro lessons"); "PART 1 · FUNDAMENTALS" mono label; numbered
    collapsible modules with counts right-aligned and ★ where a module has paid lessons.
12. **Lesson header card**: grey rounded panel with breadcrumb ("← Overview / Part 1 · Module 02"), mono lesson number
    `02.07`, title 38 px w600, and small tab chips "Notes · Code" at the right; a side card "USED IN" lists real
    systems with logos; below, a "VISUAL LESSON" video card; then the text, with a soft fade into a **paywall card**
    ("Continue reading", what Pro unlocks as mono chips, a plan picker with radio rows, a black "Buy now" button);
    previous / next cards at the bottom ("PREVIOUS 02.06 Load balancers").
13. **FAQ**: two columns — a big question title on the left, an accordion on the right with hairline separators,
    16 px questions and a chevron.
14. **Pricing cards**: white, radius 12, plan name in mono caps, struck-through old price, big price, short line,
    footer link "Choose Monthly →"; the best one with a pale green wash and a black "BEST OPPORTUNITY" tag.
15. **Presence widget**: a floating white pill at bottom right, green dot "143 online" and a chat bubble button.
16. **Social proof**: a logo marquee (logos greyed with `filter: brightness(0) saturate(0)`) and a tweet wall drifting
    sideways (72–120 s linear loops), both pausing on hover.
17. **Footer**: off-white, wordmark + one-line description, link columns with mono caps headings, a newsletter row
    (pill input + small black button), a bottom line "© … · Terms · Privacy · Refunds" and a quiet tagline.
18. **Phone**: the nav collapses to a round search button + "☰ Menu" tactile button; a dismissible "BEST EXPERIENCED
    ON DESKTOP" mono notice; the hero stacks with the same tactile primary button full width-ish.

---

## 7. Motion

- **Easing**: `cubic-bezier(.2,.8,.2,1)` for almost everything (a quick, soft ease-out); `cubic-bezier(.4,0,.2,1)`
  for colour changes.
- **Durations**: .12 s (button press), .15 s (colour, small translates), .2 s (card shadow and lift), .25 s (panels),
  .3 s (fade-in), .42 s (the hero wordmark entering).
- **Hover vocabulary** (always small): buttons −2 px; cards −1 px with shadow md → lg; feature tiles −5 px; arrows
  `translate: 3px`; folder art slides out of its card; images rotate −1.5° and scale 1.025.
- **Ambient**: floating paper artefacts drift (9–12 s ease-in-out, staggered), marquees (72–120 s linear), a
  blinking LIVE dot, "breathing" diagram nodes; loaders draw nodes and dashed wires (`stroke-dasharray` animation),
  letter-by-letter reveals.
- **Reduced motion**: every animation and hover transform is switched off under `prefers-reduced-motion: reduce`;
  hover effects only apply under `(hover: hover) and (pointer: fine)`.

---

## 8. How this maps onto Tech Katta (`frontend/src/theme/tokens.css`)

Our roles stay; the values change. A first pass (light; dark values in brackets):

| TK token | Today | Proposed |
|---|---|---|
| `--bg` | `#fff` | `#f7f7f8` page (`#111213`) — and add **`--card: #fff`** (`#191a1c`) for panels/cards |
| `--surface` / `--surface-2` | `#f5f7fa` / `#fbfcfd` | chip `#f4f4f5` (`#202123`) / sidebar `#fafafa` (`#151617`) |
| `--ink` / `--ink-2` / `--muted` / `--faint` | `#1c2733` … | `#272727` / `#4a4a4a` / `#6e6e6e` / `#929292` (`#f2f4f7` / `#c9cfd8` / `#a9b0ba` / `#747d89`) |
| `--line` / `--line-strong` / `--line-soft` | `#d9dee7` … | `#e8e8ea` / `#c9c9cf` / `#dedee2` (`#2a2b2e` / `#4c4e54` / `#36373b`) |
| `--accent` | cobalt `#2855d9` | **actions become ink** (`--action: #1d1d1d`, inverted in dark); keep a blue `#2f7cf6` (`#6ea2ff`) for links, focus and "the path that works" in figures |
| `--radius` | `2px` | split into `--r-xs 4px`, `--r-sm 6px`, `--r-md 8px`, `--r-lg 12px`, `--r-full 999px` |
| `--shadow-1..3` | single drop shadows | the layered sm / md / lg in §5, plus `--shadow-press` (the tactile button edge) |
| `--font` | Inter | **Overused Grotesk** (self-hosted, OFL) for UI and headings; keep **Inter for article reading text** (16 px / 1.78), as they do |
| `--mono` | IBM Plex Mono | keep (we already use it for labels — matches) |
| new `--font-display` | — | **Departure Mono** (self-hosted, OFL) for one word per headline and small pills |
| `--dur-fast` / `--dur` / `--ease` | .2s / .3s / ease | .15s / .2s / `cubic-bezier(.2,.8,.2,1)`; add `--dur-press .12s`, `--dur-slow .25s` |
| new `--space-*` | — | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 |
| `--cat-*` | figure categories | add pastel card washes (sage, pink, butter, powder blue, teal, lavender, terracotta) for section/course cards |

Figures (`theme/palette.js`) follow automatically: `INK`, `GREY`, `BLUE`, `LB`, `FB` read the same tokens, so the
diagrams take the new ink and blue without edits.

### Where each component lands in our UI

| Fanout pattern | Tech Katta place |
|---|---|
| Course folder cards | the dashboard start page's Library cards (Concepts, Components, Interview Questions) and the landing "What's inside" grid — our own illustrations (we already draw animated diagrams; a figure can be the "folder art") |
| Numbered colour tiles | section pages' group headers, or the landing page's secondary links (Quick Notes, Real systems, Problems) |
| Curriculum grid with mono counts | section pages (`dashboard/pages.jsx` List): groups as boxes "01 · Core concepts · 9 PAGES →" |
| Sidebar with numbered modules and counts | `dashboard/shell.jsx` sidebar: number the groups, show page counts, mono labels |
| Lesson header card + "Used in" + prev/next | `dashboard/article.jsx`: header in a soft panel with the CONCEPT // 04 number in mono, the Rail becomes a "Used in / Try it" card, prev/next cards at the end |
| Tactile buttons | Run / Submit in the workspace, "Start practising", Score, sign-in |
| Meta pills | problem difficulty, "22 QUESTIONS · 66 ARTICLES", tests passed "10 / 10" |
| Paywall card | the sign-in lock card (`PageLock`) |
| Presence widget | not now (no live presence backend) |
| LIVE pill / announcement strip | new-content notices (site.json driven) |
| Pixel-mono accent word | the landing headline ("System design, *explained.*") and section heroes |

### Order of work (each step is one PR, checked in light and dark)

1. **Tokens only**: palette, radii, layered shadows, motion timing, the off-white page with white cards. No markup.
2. **Type**: self-host Overused Grotesk and Departure Mono under `theme/fonts`, swap `--font`, add `--font-display`;
   check every page for wrapping changes (the grotesk is a little wider than Inter).
3. **Buttons and pills**: one `.btn` (primary / secondary / ghost, tactile edge, hover lift) and one `.pill` used
   everywhere instead of the per-page button styles.
4. **Cards**: Library cards → folder cards; section lists → curriculum grid; problem table rows → soft rows.
5. **Shell**: glass top bar, numbered sidebar, lesson header card and prev/next.
6. **Motion**: hover lifts, arrow slides, the headline word entering, ambient drift on the landing only; all off under
   reduced motion.

---

## 9. Do not copy

- No "fanout" name, wordmark, logo, folder artwork, illustrations, sticker art, tweets, testimonials, copy or course
  names. Our cards get our own art (our animated figures, our Zotato example system).
- Do not use the "OffBit" display font they load as a trial (commercial licence). Overused Grotesk, Departure Mono
  and IBM Plex Mono are open-source (SIL OFL) and fine to self-host; keep their licence files with the fonts.
- Do not add trackers or social embeds to match the look (their testimonial wall embeds X).
- Keep our rules: colours only through `theme/` (Rule 19 in tech-katta-context), every change checked in light and
  dark, figures readable at phone width, reduced motion respected.
