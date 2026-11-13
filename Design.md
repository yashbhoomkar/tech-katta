> Superseded by tech-katta-context/20-UI-REDESIGN-SPEC.md. Kept as a record of observations only.

# Design.md — the look we are moving towards

> **2026-11-14:** the site's own type and motion are now in tech-katta-context/30-PREMIUM-RENOVATION.md (Instrument Sans, Source Serif 4, Geist Mono; expo-out and spring motion; `frontend/src/theme/premium.css`). This file stays the record of the fanout.sh study.

**Source of inspiration:** fanout.sh, observed on 2026-11-12 (owner: "take inspiration of their UI"; then "make the
design.md more detailed"). This file has two halves:

- **Part A (§1–§11): what that site does.** Measured in a real browser, not guessed: computed styles of every
  visible element, the CSS variables the site publishes, hover / pressed / focus / open states, its own dark theme,
  and how it reflows at nine widths.
- **Part B (§12–§14): what it means for Tech Katta.** A drop-in draft of our `frontend/src/theme/tokens.css`, a
  component-by-component and page-by-page plan using our real file and class names, an order of work with
  acceptance checks, and the rules for what we must not copy.

It is **inspiration, not a copy** (§14). We take principles — type pairing, tactile depth, card language, motion
timing, information density — and express them with our own content, figures and example system.

**How it was observed.** Chromium (Playwright) at 1440×900 (desktop, also at 2× for close-ups) and Pixel 7 (phone).
Pages: `/` (landing), `/system/overview` (a course overview), `/system/systems` (their interview-question list),
`/system/case-studies`, `/system/archive/consistent-hashing-load-balancing` (a lesson), `/labs`, `/papers`,
`/daily` (paper reader), `/pricing`, `/study-with-me`, `/updates` (changelog), `/ai/overview`. States captured: top
bar, buttons at rest / hover / pressed, keyboard focus, input focus, FAQ open, search palette open, list vs grid,
card hover, dark theme (their `html.dark` class) on the course, list and lesson pages, phone menu and drawer. Their
screenshots are **not** committed (they are their artwork); the numbers are.

---

# Part A — what fanout.sh does

## 1. Character and principles

A calm, near-white canvas with near-black ink, where almost everything is a soft rounded card lifted by very light
layered shadows. Personality comes from three places only: **type**, **colourful tactile objects inside cards**, and
**small physical motion**. Chrome (bars, buttons, borders) stays grey.

The principles we can read out of it:

1. **Grey chrome, colourful content.** The UI shell is ink on off-white; colour appears in course folders, tiles,
   illustrations and tags, never on navigation or buttons.
2. **Three voices of type.** A grotesk for things you read, a plain monospace for things you count or label, a pixel
   monospace for one word you remember.
3. **Everything is an object.** Cards have weight (layered shadows), buttons have a pressed edge, folders slide out,
   paper has texture. Flat hairline boxes are rare.
4. **Numbers and labels everywhere.** `02.07`, `13 LESSONS`, `18 MODULES · 200 LESSONS · 27 FREE`, `35 SYSTEMS`,
   `PART 1 · FUNDAMENTALS`: mono, uppercase, small, grey. They make a large archive feel navigable.
5. **Small, quick motion.** 120–250 ms, one easing curve, lifts of 1–5 px, arrows that slide 3 px. Ambient motion
   only on the marketing page.
6. **Two shells.** A marketing shell (centred, wide, generous whitespace) and an app shell (left sidebar, sticky
   bar, dense lists). The switch happens when you enter a course.
7. **Generous but dense.** Big section gaps on the landing page; inside the app, 32 px sidebar rows and 3-column
   grids put a lot on screen without crowding.
8. **Dark mode is a first-class theme**, not an inversion: its own greys, softer shadows, brighter accents.

---

## 2. Information architecture

**Marketing shell** (landing, Labs, Daily, Papers, Study, Pricing, Updates):
announcement strip → top bar (logo · "Learning" course switcher · Labs · Daily · Papers · Study · Explore ▾ ·
Community ▾ · Pricing · right: "New in November →" pill, round search button, Sign in) → page → large footer.

**App shell** (inside a course): a 64 px bar with logo ▾ · course switcher (icon + "System Design" ⇕) · breadcrumb
("Archive › Consistent Hashing Load Balancing") · right: search, Sign in. A 248 px sidebar: "Course roadmap", a
"WORKSPACE" group (Overview, Real-world systems, Case studies, Company guides, Resources), an info card ("27 lessons
open · ★ marks Pro lessons"), then "PART 1 · FUNDAMENTALS" with numbered, collapsible modules and their lesson
counts, the current lesson highlighted inside its open module.

**Landing order:** hero → logo marquee "Shared around the world" → "Choose where to start" (course folders) →
testimonial wall → "Inside the learning box" (illustrated explainer) → "Everything else on fanout." (numbered tiles)
→ Plans → "Keep company with people doing the work." (study wall) → FAQ → "Check out the roadmaps." call-out →
footer.

**Course overview order:** hero (H1 with a pixel-mono second line + the course folder art) → "Track your progress"
bar → "CURRICULUM STRUCTURE" (3-column module grid) → "FULL CURRICULUM" (All / Real-world systems / Case studies tabs,
List / Grid toggle, a module stepper) → lesson cards with illustrations.

---

## 3. Layout

| Measure | Value |
|---|---|
| Page background | `#f7f7f8`; cards `#fff` |
| Announcement strip | 40 px, full width, pale blue |
| Top bar | 64 px; translucent `rgba(247,247,248,.9)` with `backdrop-filter: blur(24px)`; bottom hairline `#e8e8ea` |
| Marketing content width | max 1280 px (`--content-max`), side padding ≈ 100 px at 1440 |
| Reading width | max 1000 px panel; paper reader column 476 px for the abstract, 1168 px for figures |
| App sidebar | 248 px wide (`--sidebar-w`), inner rows 226 px |
| App content | starts at 248 px; hero text left-aligned at ≈ 308 px; grids up to 1072 px |
| Grids | course folders 3 × ≈309 px (527 px tall); question cards 3 × 348 px; lab cards 3 × 348×207; numbered tiles 4 across; curriculum 3 across |
| Gaps | 12–16 px between cards; 14 px inside question cards; 22–28 px card padding |
| Spacing scale | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 (`--space-1…20`) |
| Section rhythm (landing) | 80–120 px between sections; eyebrow (mono caps) 12 px above the section title |

**Breakpoints measured on the landing page:** ≥ 1100 px the course grid has 3 columns and the text nav shows;
≤ 980 px the grid drops to 2 columns and the nav collapses into "☰ Menu". Their CSS also has steps at 1280, 1120,
1080, 1040, 920, 900, 880, 800, 760, 740, 720, 700, 640, 620, 560, 540, 520, 360 (component-level), plus
`(height <= 620px) and (width >= 640px)` for short laptop screens and `(hover: hover) and (pointer: fine)` around
every hover effect.

**Phone (Pixel 7):** a dismissible "BEST EXPERIENCED ON DESKTOP" mono notice under the bar; app pages get a ☰ that
opens the sidebar as a drawer; course switcher truncates ("Syste…"); grids become one column; the presence pill
stays bottom-right.

---

## 4. Colour

### 4.1 Neutrals (their `--ga-ink-*`)

`50 #fbfbfb` · `100 #f3f3f3` · `200 #e1e1e1` · `300 #cfcfcf` · `400 #adadad` · `500 #929292` · `600 #6e6e6e` ·
`700 #4a4a4a` · `800 #272727` · `900 #1d1d1d`. Text 1/2/3 = 800 / 600 / 500. Sidebar items use ink at 65–70 %
opacity for rest and full ink when active.

### 4.2 Roles, light and dark

| Role | Light | Dark |
|---|---|---|
| Page | `#f7f7f8` | `#111213` |
| Card / surface | `#ffffff` | `#191a1c` |
| Sidebar | `#fafafa` | `#151617` |
| Hover fill (incl. active sidebar row) | `#f0f0f2` | `#242527` |
| Chip / segmented "on" fill | `#f4f4f5` | `#202123` |
| Divider | `#e8e8ea` | `#2a2b2e` |
| Border / strong border | `#dedee2` / `#c9c9cf` | `#36373b` / `#4c4e54` |
| Text 1 / 2 / 3 | `#272727` / `#6e6e6e` / `#929292` | `#f2f4f7` / `#a9b0ba` / `#747d89` |
| Inverse text | `#ffffff` | `#111315` |
| Primary action | gradient `#272727 → #414141` | inverts: `#f2f4f7` fill, dark text |
| Link / info | `#2f7cf6`; course blue `#1062fe` on `#e4ecfd` | `#6ea2ff`; `#7fa9ff` |
| Success / warning / danger | `#0f9d58` / `#e8822a` / `#dc2626` | `#4ed08a` / `#f0a45b` / `#f87171` |
| Star (paid) | `#e3b341`-ish gold | same |
| Modal scrim | `#00000040` | `#00000094` |
| Glass (bar / panels / launcher) | `#f7f7f8e6` / `#fffffff0` / `#ffffff9e` | `#111213e6` / `#191a1cf5` / `#191c20c2` |
| Code block | — | bg `#0b111c`, border `#243041`, text `#d6e4f0`, selection `#7dd3fc38` |

### 4.3 Category and content colour

Categories: green `#2ab673`, blue `#2f7cf6`, red `#e4402c`, orange `#e8822a`, purple `#6e56cf`, yellow `#e9b949`
(also used for charts). Course folder washes (the card behind the folder art, ~50 % of the folder's own colour on
the off-white): sage, dusty pink, butter yellow, powder blue, teal, lavender, warm grey, terracotta. Numbered tiles use
full-strength pink, orange, white, cobalt, mint, lavender, sky, sand with black text.

### 4.4 Contrast (computed)

| Pair | Ratio | Verdict |
|---|---|---|
| Text 1 `#272727` on page `#f7f7f8` | 13.95 | AAA |
| Text 2 `#6e6e6e` on page / on card | 4.76 / 5.10 | AA body |
| Text 3 `#929292` on card / on page | 3.11 / 2.91 | **fails body text**; fine only for ≥ 18 px or decorative |
| Link blue `#2f7cf6` on white | 3.94 | **fails small text** (AA large only) |
| White on red LIVE `#dc2626` | 4.83 | AA |
| Course blue `#1062fe` on `#e4ecfd` | 4.22 | AA large only |
| Dark: text 2 `#a9b0ba` / text 3 `#747d89` on `#191a1c` | 7.97 / 4.18 | AA / AA large |
| Dark link `#6ea2ff` on `#191a1c` | 6.86 | AA |

Lesson for us: keep their structure but use darker values for small grey and blue text (§12).

---

## 5. Typography

### 5.1 Families and roles

| Family | Licence | Role |
|---|---|---|
| **Overused Grotesk** | SIL OFL | UI, navigation, card titles, page headings, hero |
| **IBM Plex Mono** | SIL OFL | labels, eyebrows, counts, lesson numbers, tags, table heads, buttons in the paper reader |
| **Departure Mono** (pixel) | SIL OFL | one accent word per headline ("Mapped.", "first principles.", "simple to understand"), the LIVE pill, pricing plan names, the wordmark |
| **Inter** | SIL OFL | lesson reading text and lesson titles |
| **Newsreader** (serif, variable) | SIL OFL | the Daily paper reader: headline, paper titles, abstracts |
| OffBit | **trial / commercial** | a display face they load; **not for us** |
| Patrick Hand | SIL OFL | doodle notes (rare) |
| Phosphor | MIT | the icon font (§6) |

### 5.2 Measured scale

| Use | Family | Size / line height | Weight | Tracking | Case |
|---|---|---|---|---|---|
| Hero headline | Grotesk | 88 / 87 px | 400 | −0.052em | — |
| Hero accent word | Departure Mono | ≈ 88 px | 400 | 0 | — |
| Daily headline | Newsreader | 64 px | 800 | tight | — |
| Labs / Study page H1 | Grotesk | 52.5 px | 600 | −0.02em | — |
| Course overview H1 | Grotesk + pixel second line | 48 / 52 px | 600 | tight | — |
| List page H1 ("System design interview questions") | Grotesk | 40 px | 600 | −0.025em | — |
| Lesson title | Inter | 38 / 43.7 px | 600 | — | — |
| Paper title (Daily) | Newsreader | 35 px | 400 | — | — |
| Section title (landing) | Grotesk | 21–30 px | 600 | −0.025em | — |
| Lesson h2 | Inter | 27 px | 600 | — | — |
| Card title (course folder) | Grotesk | 22 / 26 px | 600 | — | — |
| Card title (question / lab) | Grotesk | 21 px | 600 | −0.01em | lowercase allowed ("autocomplete") |
| Lesson body | Inter | 16 / 28.5 px (1.78) | 400 | — | secondary paragraphs `#6e6e6e` |
| Paper abstract | Newsreader | 14 / 21.7 px | 400 | — | grey, centred, 476 px column |
| FAQ question | Grotesk | 16 / 24 px | 650 | — | — |
| UI text / nav | Grotesk | 12.25–14 px | 400–500 | — | — |
| Sidebar rows | Grotesk | 13 px (modules 12 px) | 500 | — | — |
| Buttons | Grotesk | 13–15 px | 500 | +0.01em | — |
| Lesson number / eyebrow / count | Plex Mono | 9–11 px | 400–500 | +0.06–0.08em | UPPERCASE |
| LIVE pill | Departure Mono | 9 px | 600 | +0.04em | UPPERCASE |

Rules they keep: sans for reading, mono for counting, pixel-mono for one remembered word; numbers are always mono;
headlines are tight (negative tracking), labels are loose (positive tracking); reading text gets a long line height
(1.78) but never more than ~70 characters per line.

---

## 6. Iconography and imagery

- **Icons:** Phosphor (regular weight), 16–20 px in nav and sidebar, 26 px inside **icon tiles** (52×52, radius 8,
  `#f4f4f5` fill, 1 px border) on question cards; a row of up to three tiles shows the main parts of a design
  (search, database, chip, phone). Tech logos (PostgreSQL, NGINX, Discord) appear as small coloured marks inside chips
  or "Used in" rows.
- **Illustrations:** colourful, hand-inked "sticker" drawings per lesson (keys and drawers for a key-value store, a
  pencil drawing arrows for autocomplete), centred at the bottom of question cards (≈304×304). Line-art doodles on
  the numbered tiles. Textured "folders" for courses. A kraft-paper box with sticky notes for the product explainer.
- **Generated texture:** lab cards start with a 63 px band of **ASCII art** (`%#+-:=*@`) in grey mono — a cheap,
  on-brand pattern. Paper and kraft surfaces are layered CSS gradients with fine hatching.
- **Logos of others** (marquee) are forced to grey with `filter: brightness(0) saturate(0)`.

---

## 7. Shape, elevation and materials

### 7.1 Radii

`4px` badges · `6px` small chips · `7–9px` buttons · `8px` sidebar rows, icon tiles · `12px` cards, inputs at rest ·
`16px` search palette · `999px` pills, segmented controls, "online" widget, "New in…" button · `50%` avatars.

### 7.2 Elevation levels

| Level | Shadow (light) | Used for |
|---|---|---|
| 0 flat | none | sidebar, list rows on grey |
| 1 sm | `0 1px 2px #3b3b3b17, 0 2px 4px #3b3b3b0d, 0 0 0 1px #3b3b3b03` | question and lab cards, tiles at rest |
| 2 md | `0 2px 4px #3b3b3b0d, 0 4px 8px #3b3b3b17, 0 8px 16px #3b3b3b1a, 0 0 0 1px #3b3b3b03` | course folders, raised cards, hover, search palette |
| inset well | `inset 0 0 2px #00000008` | grey panels, chips |
| deep (marketing) | `0 22px 48px rgba(62,36,15,.18)` + highlights | floating paper artefacts |

Dark uses the same layers with black at 0.35–0.45 and a 1 px `#ffffff06` ring so edges still read.

### 7.3 Tactile buttons (the signature)

| State | Primary (dark) | Secondary (light) |
|---|---|---|
| Rest | `linear-gradient(#272727, #414141 90%)`, 1 px `#515151` border, radius 9, height 48 (hero) / 32–36 (bars), padding 0 14 px, white 15 px w500 | white, 1 px `#c9c9cf`, radius 7, padding 0 10 px, ink 14 px w500 |
| Shadow | soft stack `0 7px 3px #3b3b3b03, 0 4px 2px #3b3b3b0d, 0 2px 2px #3b3b3b17, 0 0 1px #3b3b3b1a` + `inset 0 1px 1px #ffffff7a` (top light) + **`inset 0 -3px 0 #232323`** (bottom edge) | `0 2px 2px #3b3b3b17, 0 0 1px #3b3b3b1a` + **`inset 0 -3px 0 #d3d3d3`** |
| Hover | gradient darkens to `#1f1f1f → #3a3a3a`, `translateY(-2px)` | lifts 1–2 px |
| Pressed | bottom edge shrinks to `inset 0 -1px 0`, top light dims to 25 %, drop shadow almost gone — the key "goes down" | same idea |
| Timing | transform / background / border .15 s `cubic-bezier(.2,.8,.2,1)`; press .12 s | |
| Focus | 2 px ink outline, 2 px offset | |

Other buttons: **round icon button** (search) 32 px white circle with the same bottom edge; **pill link** ("New in
November →") 36 px, 999 radius, 1 px ring, arrow; **ghost link** ("▷ See demo") icon + underlined text.

### 7.4 Materials

- **Glass:** top bar `rgba(247,247,248,.9)` + `blur(24px)`; search palette `rgba(255,255,255,.94)`; floating launcher
  `#ffffff9e` with a `#ffffff8c` border.
- **Paper / kraft:** radial highlights + a 1 px hatch every 6–8 px at 2–3 % alpha + a warm two-stop gradient.
- **Dividers:** 1 px `#e8e8ea`; FAQ rows and footer use hairlines, cards don't (shadow instead).

---

## 8. Components

Each with anatomy, measurements and states.

**8.1 Announcement strip** — 40 px, pale blue fill, centred: red LIVE pill (9 px Departure Mono, radius 4, blinking
dot) + "AI engineering is live" 13 px w500 + "Start the course →" 12 px; ✕ at the far right. Dismissal remembered.

**8.2 Marketing top bar** — 64 px glass. Logo + `BETA` badge (black pill, 9 px mono white). "Learning ⇕" course
switcher (w500), then text links 12.25 px `#6e6e6e` → ink on hover (.15 s), "Explore ▾" and "Community ▾" dropdowns.
Right: pill "New in November →", round search, secondary "Sign in".

**8.3 App top bar** — 64 px; logo + "Fanout ▾"; a vertical divider; course switcher (icon tile 24 px + "System
Design" w600 + ⇕); breadcrumb in grey with › separators, current page in ink. Right: search, Sign in.

**8.4 Buttons** — §7.3. Labels are verbs ("Start learning free", "Open", "Buy now", "Get started →"). Arrows are a
separate glyph that slides 3 px on hover.

**8.5 Pills and tags**
- *Meta pill* (on course cards): white 40 % fill, radius 999, 11 px Plex Mono caps, "18 MODULES · 200 LESSONS ·
  **27 FREE**" (the important number bold).
- *Tag chips* ("ASKED IN Google Amazon LinkedIn"): a grey mono label then `#f4f4f5` chips, radius 4, 10 px mono.
- *Tech chip*: logo 16 px + "PostgreSQL" in mono on `#f4f4f5`.
- *Status tag*: "SOON", "LAUNCHING" — mono caps on a grey chip, replaces the meta pill.
- *Paid marker*: a gold ★ beside the arrow; legend in the sidebar.

**8.6 Segmented control / filters** — "≡ List | ⊞ Grid": 32 px buttons, radius 999, padding 0 12 px, 13 px w500,
gap 6 px between icon and text, the selected one filled `#f4f4f5`, the other transparent. Filter tabs on Labs ("All
16 · On device 14 · Live data 2"): 44 px tall pills, the count in grey after the label.

**8.7 Search**
- *Search field* (Labs): 742×54, white, 1 px `#e8e8ea`, radius 9, left icon at 38 px, an **inset bottom glow**
  (`inset 0 -5px 5px #a6a6a640`) plus a soft drop stack — it looks pressed into the card. Above it "FIND A LAB" and
  "PRESS / TO FOCUS" in mono; under it the filter pills and "16 MATCHES" in mono.
- *Search palette* (from the round button): a 680 px panel, radius 16, padding 12, 94 % white, level-2 shadow,
  centred over a blurred, dimmed **wall of archive cards** that scrolls ("Scroll or drag to explore"). Inside: a
  52 px input row ("What do you want to learn?") with ✕; a row of 8 category tabs with icons (All, Courses, Papers,
  Labs, Blog, Tools, Open, Notation); a 3-column grid of large result tiles (course art + name). Animations
  `search-panel-in/out`, `search-scrim-in/out`, `search-tile-in` with a stagger.

**8.8 Inputs** — newsletter input 28 px, 12.25 px text, padding 3.5 × 8.75 px, 1 px `#dedee2`, radius 12; on focus the
border goes ink, a 2 px ink outline at 2 px offset plus a 3 px ink-50 % halo. Small black "Done" button beside it.

**8.9 Course folder card** — 309×527, radius 12, pastel wash (folder colour at 50 %), padding 28 / 24 / 24, level-2
shadow. Folder art on top (it **slides up and out** of the card on hover); title 22 px w600; three "+" bullet lines
13 px (the "+" in mono); meta pill; footer "Open ……… →" (14 px w600, arrow at the far right). Unreleased: grey wash
and a SOON tag.

**8.10 Question card** (`/system/systems`, our closest analogue)
- *Grid*: 348×457, white, radius 12, padding 22, gap 14, level-1 shadow → level-2 and −1 px on hover. Top row: lesson
  number `09.15` (10 px mono `#929292`) and, right, ★ + →. Then 1–3 icon tiles, a mono line "Database · Service ·
  Client", the title 21 px w600, a one-line description in grey, "ASKED IN" chips, and the illustration filling the
  bottom.
- *List*: full-width white rows 120–170 px tall, radius 12, a 2 px gap between rows; number in a left column, title
  + description + chips in the middle, ★ → on the right. Same content, no illustration.

**8.11 Lab card** — 348×207, white, radius 12, no padding at the top: a 63 px ASCII-art band, then an icon tile
(40×40, radius 8), the title 21 px w600, and a footer "Open Latency Numbers" with a round arrow button (32 px,
`#f4f4f5`).

**8.12 Numbered tile** — ≈280×390, full colour, radius 12, padding ≈ 24. Big number top-right (40 px w600), a two-line
mono caption under it, a hand-drawn line illustration top-left, title bottom-left (30 px w600), one-line subtitle,
round arrow button bottom-right (black at 10 %). Hover: −5 px and level-2 shadow, arrow +3 px.

**8.13 Curriculum grid** — a white panel (radius 12, padding 24) titled "CURRICULUM STRUCTURE" in mono; 3 columns of
boxes in chip grey (radius 8, padding 12 × 16): mono index `01`, module title 14 px w500, under it "13 LESSONS" in mono
grey, → at the right.

**8.14 Sidebar** — 248 px, `#fafafa`, 1 px right divider. Rows 32 px high, radius 8, padding 0 7 px, gap 8.75 px
icon→text, 13 px w500 at 65 % ink; active row `#f0f0f2` fill and full ink. Group labels ("WORKSPACE", "PART 1 ·
FUNDAMENTALS") 10 px Plex Mono caps, letter-spaced. Module rows 12 px: mono number at the left, a chevron, title,
right-aligned count, ★ where paid lessons exist; an open module indents its lessons under a 1 px guide line, the
current lesson in a grey pill, read lessons with a small dot.

**8.15 Lesson page**
- *Header card*: grey (`#f0f0f2`-ish) panel, radius 16, padding 44: breadcrumb ("← Overview / Part 1 · Module 02"),
  mono number `02.07`, title 38 px Inter w600, and two small tabs at the right ("📄 Notes", "</> Code").
- *"USED IN" card* to the right (≈340 px): mono label, rows with a 48 px logo tile + "Build a load balancer",
  "Discord's message storage".
- *Visual lesson card*: dark video thumbnail + "VISUAL LESSON" mono label + title + "★ Included with Pro · 7:30".
- *Body*: "LESSONS · 678 WORDS" mono line, h2 27 px, body 16 / 1.78 Inter, paragraphs after the first in grey; the
  text fades out into the **paywall card** (white, radius 12, centred 500 px): ★ PRO, "Continue reading", what Pro
  unlocks, the tracks as blue mono chips, a coupon pill with a countdown, plan rows with radio buttons and struck
  prices, a black "Buy now", "View all plans → · Already Pro? Sign in".
- *Prev / next*: two white cards (PREVIOUS / NEXT in mono, number + title), arrows outside.

**8.16 Paper reader (Daily)** — eyebrow "YOUR DAILY DIGEST" (Departure Mono), a serif headline (Newsreader 64 px
w800) over a pixel-mono second line; a white sheet (≈900 px) with authors in mono caps, the venue, a serif title
(35 px), a grey serif abstract (476 px, centred), "Read the original paper ↗" underlined mono, then figures drawn as
diagrams on a slightly rotated pale-blue sheet (`rotate(~-0.5deg)`), body in grotesk, a tactile "Read the complete
explanation →" button.

**8.17 Calendar (Daily archive)** — month pill "📅 November 2026" (white, radius 999, padding 8 × 16, 12 px w600),
‹ › round buttons, weekday heads in mono caps, day numbers 20 px, each day a pastel bar.

**8.18 Pricing** — plan names in Departure Mono; a large lifetime card (white, big pixel-mono heading, bullet list,
avatars + a line of social proof); smaller annual / quarterly / monthly cards; a "Recommended" green pill; struck-
through old prices; a sale strip at the very top with a countdown (`ga-sale-border-flow` animates its border).

**8.19 FAQ** — two columns: a 30 px title on the left ("Questions people ask before joining."), the accordion on
the right (680 px): native `<details>`/`<summary>`, 74 px rows, 16 px w650 questions, chevron, hairline separators;
open answers in 13 px grey.

**8.20 Changelog (Updates)** — a hand-drawn figure top-right; month labels; release cards (white, radius 12): a
line illustration left, title 21 px w500, a short paragraph, a small "Read Daily →" button, the date in a mono chip at
the top-right. Hover rotates the illustration −1.5° and scales it 1.025.

**8.21 Social proof** — a logo marquee and a tweet wall drifting sideways (72–120 s, linear, infinite), both pausing
on hover; testimonial cards are standard tweet embeds.

**8.22 Presence widget** — fixed bottom-right pill: green dot, "143 online", a round chat button. Present on every
page, desktop and phone.

**8.23 Footer** — off-white, wordmark + one-line description, columns with Plex Mono caps headings ("USE FANOUT",
"COURSES", "ACCOUNT"), 12 px links, a "NEWSLETTER" row with the pill input and a small black button, a bottom line
"© 2026 · Terms · Privacy · Refunds" and a quiet tagline at the right.

**8.24 Phone patterns** — ☰ + logo + course switcher + round search + Sign in in one 64 px row; the desktop-advice
notice; drawers instead of sidebars; the presence pill shrinks but stays; the primary button keeps its tactile edge
at full width.

---

## 9. Motion

### 9.1 Tokens

`--ease-out: cubic-bezier(.2,.8,.2,1)` (nearly everything) · `--ease-in-out: cubic-bezier(.4,0,.2,1)` (colour) ·
`--dur-fast: .15s` · `--dur-base: .2s` · `--dur-slow: .25s` · press `.12s` · fade-in `.3s` · wordmark entry `.42s`.

### 9.2 Interaction motion

| Element | Effect | Timing |
|---|---|---|
| Primary button | −2 px, gradient darkens; pressed: bottom edge 3 px → 1 px | .15 s / .12 s |
| Cards (grid-card) | −1 px, shadow sm → lg | .2 s |
| Feature tiles | −5 px, shadow lg | .2 s |
| Course folder | the folder art slides up out of the card | .2 s |
| Arrows in links | `translate: 3px` | .15 s |
| Changelog art | `rotate(-1.5deg) scale(1.025)` | .2 s |
| Nav links | colour only | .15 s |
| Sidebar chevrons | `rotate` 90° | .15 s |

### 9.3 Ambient and entrance

Hero paper artefacts drift (9–12 s ease-in-out, each on its own delay); marquees 72–120 s linear; the LIVE dot
blinks; the hero wordmark enters (.42 s); a loader draws nodes (`node-spawn`, `node-idle`) and dashed wires
(`wire-arrive`, `wire-flow` via `stroke-dashoffset`) and reveals letters one by one; the inference lab diagrams
"breathe" and pulse. 43 named keyframes in total; all are product-specific except fades, spins and pulses.

### 9.4 Rules

Hover effects only under `(hover: hover) and (pointer: fine)`. Under `prefers-reduced-motion: reduce` every
keyframe animation is set to `none !important` and hover transforms are removed. `(forced-colors: active)` is
handled for borders.

---

## 10. Accessibility details

- A "Skip to main content" link is the first tab stop.
- Focus ring: `2px solid` ink, `2px` offset, on every interactive element; inputs add a 3 px ink-50 % halo.
- Native `<details>` for the FAQ; `aria-expanded` on dropdowns; list/grid toggle as buttons.
- Weak spots (don't copy): text 3 `#929292` and link blue `#2f7cf6` are below AA for small text (§4.4); many labels
  are 9–10 px.

---

## 11. Content and voice patterns

Lesson numbers `PART.MODULE` (`02.07`); counts in mono caps everywhere (`35 SYSTEMS`, `13 LESSONS`, `678 WORDS`); one
plain-sentence description per card ("A design walkthrough you can build from."); verbs on buttons; "Open →" as the
universal card action; headings that are statements with a full stop ("Technical systems you can touch."); a single
pixel-mono word for emphasis instead of colour or italics.

---

# Part B — what it means for Tech Katta

## 12. The proposal

### 12.1 What stays ours

Zotato and Indian numbers, our animated step figures (they are our illustrations), read aloud, the problem workspace
and canvas, British spelling and the plain-sentence voice, signed-in-only articles, the token rules in
`frontend/src/theme/` (Rule 19 in tech-katta-context).

### 12.2 Draft of `frontend/src/theme/tokens.css` (step 1)

Same role names as today wherever possible, so stylesheets don't change in step 1; new names are added, not
renamed. Text greys, blue and green are darkened from theirs so small text passes AA (§4.4); every text colour in the draft was checked at ≥ 4.5:1 on both `--bg` and `--card`, in light and dark (dark: `--muted` 8.6, `--accent` 7.4, `--danger` 6.3, `--success` 8.9, `--warn` 8.4). Every new colour must also go into
`palette.js` `TOKENS` (the theme test enforces it).

```css
:root{
  color-scheme:light;
  /* surfaces */
  --bg:#f7f7f8;            /* page (was #fff) */
  --card:#ffffff;          /* NEW: cards, panels, inputs */
  --surface:#f4f4f5;       /* chips, wells, segmented "on" */
  --surface-2:#fafafa;     /* sidebar */
  --hover:#f0f0f2;         /* NEW: hover rows, active sidebar row */
  /* text (AA on --bg and --card) */
  --ink:#272727;  --ink-2:#4a4a4a;  --ink-3:#5c5c5c;
  --muted:#666666;         /* 5.7:1 on --card, 5.4:1 on --bg */
  --muted-2:#6e6e6e;       /* 5.1:1 on --card, 4.8:1 on --bg — captions */
  --faint:#929292;         /* decorative only: lesson numbers ≥ 10 px mono, never body text */
  --disabled:#c9c9cf;
  /* lines */
  --line-strong:#c9c9cf;  --line:#e8e8ea;  --line-soft:#dedee2;  --grid:#efeff1;
  /* actions: ink, not blue */
  --action:#1d1d1d;  --action-2:#414141;  --on-action:#ffffff;   /* NEW */
  /* accent: links, focus, "the path that works" in figures */
  --accent:#1d63d8;        /* 5.5:1 on --card, 5.1:1 on --bg (theirs #2f7cf6 is 3.9) */
  --accent-strong:#1550b5; --accent-mid:#8fb3f5; --accent-line:#bcd2fb; --accent-soft:#dbe7fd;
  --accent-tint-2:#eaf1fe; --accent-tint:#f3f7ff; --on-accent:#ffffff;
  /* status */
  --danger:#c42b1c; --red:#dc2626; --danger-line:#f6c9c3; --danger-soft:#fde4e1; --danger-tint:#fff4f2;
  --success:#0a7a45; --success-line:#b9e4cb; --success-tint:#ecf8f1;
  --warn:#9a5b00; --warn-strong:#7a4700; --warn-mid:#e8822a; --warn-line:#f6d3ad; --warn-tint:#fff6ec;
  --star:#e3a008;
  /* categories (figures, charts) and NEW pastel washes for section/course cards */
  --cat-green:#2ab673; --cat-amber:#e9b949; --cat-violet:#6e56cf; --cat-teal:#0e9aa7; --cat-pink:#e4407a;
  --wash-sage:#c2c9b4; --wash-pink:#f3c4be; --wash-butter:#f4e3a1; --wash-sky:#c9d8ec;
  --wash-teal:#b6dfdc; --wash-lavender:#d9cdf0; --wash-sand:#ead9bd; --wash-grey:#d9d9dc;
  /* rgb triples */
  --ink-rgb:59 59 59; --bg-rgb:247 247 248; --accent-rgb:29 99 216;
  /* elevation */
  --shadow-1:0 1px 2px rgb(var(--ink-rgb) / .09),0 2px 4px rgb(var(--ink-rgb) / .05),0 0 0 1px rgb(var(--ink-rgb) / .01);
  --shadow-2:0 2px 4px rgb(var(--ink-rgb) / .05),0 4px 8px rgb(var(--ink-rgb) / .09),0 8px 16px rgb(var(--ink-rgb) / .1),0 0 0 1px rgb(var(--ink-rgb) / .01);
  --shadow-3:0 10px 30px rgb(var(--ink-rgb) / .16);                 /* menus, dialogs */
  --shadow-inset:inset 0 0 2px rgb(0 0 0 / .03);                   /* NEW */
  --press:inset 0 1px 1px rgb(255 255 255 / .48),inset 0 -3px 0 #232323;   /* NEW: dark tactile edge */
  --press-light:inset 0 -3px 0 #d3d3d3;                                     /* NEW: light tactile edge */
  --scrim:rgb(0 0 0 / .25);
  --glass:rgb(var(--bg-rgb) / .9);                                          /* NEW */
  /* type */
  --font:"Overused Grotesk",Inter,system-ui,sans-serif;
  --font-read:Inter,system-ui,sans-serif;                                   /* NEW: article text */
  --font-display:"Departure Mono","IBM Plex Mono",monospace;               /* NEW: one word per headline */
  --mono:"IBM Plex Mono",monospace;
  /* shape */
  --radius:8px;            /* default (was 2px) */
  --r-xs:4px; --r-sm:6px; --r-md:8px; --r-btn:9px; --r-lg:12px; --r-xl:16px; --r-full:999px;
  /* space */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:20px; --space-6:24px;
  --space-8:32px; --space-10:40px; --space-12:48px; --space-16:64px; --space-20:80px;
  /* motion */
  --dur-press:.12s; --dur-fast:.15s; --dur:.2s; --dur-slow:.25s;
  --ease:cubic-bezier(.2,.8,.2,1); --ease-in-out:cubic-bezier(.4,0,.2,1);
}
:root[data-theme=dark]{
  color-scheme:dark;
  --bg:#111213; --card:#191a1c; --surface:#202123; --surface-2:#151617; --hover:#242527;
  --ink:#f2f4f7; --ink-2:#d0d5dc; --ink-3:#bcc3cc; --muted:#a9b0ba; --muted-2:#959daa; --faint:#747d89; --disabled:#4c4e54;
  --line-strong:#4c4e54; --line:#2a2b2e; --line-soft:#36373b; --grid:#1d1e20;
  --action:#f2f4f7; --action-2:#d9dde3; --on-action:#111315;
  --accent:#6ea2ff; --accent-strong:#94baff; --accent-mid:#3d63b8; --accent-line:#2c4a8a; --accent-soft:#1d3363;
  --accent-tint-2:#18284a; --accent-tint:#141f38; --on-accent:#0b1020;
  --danger:#f87171; --red:#f87171; --danger-line:#5b2522; --danger-soft:#3f1d1b; --danger-tint:#261514;
  --success:#4ed08a; --success-line:#24563a; --success-tint:#13251b;
  --warn:#f0a45b; --warn-strong:#f6c38d; --warn-mid:#e8822a; --warn-line:#5c3c1a; --warn-tint:#291d10;
  --star:#f2b01e;
  --cat-green:#4ed08a; --cat-amber:#f0c661; --cat-violet:#a48ff0; --cat-teal:#3cc3cf; --cat-pink:#f472a8;
  --wash-sage:#2c3226; --wash-pink:#3a2423; --wash-butter:#3a3320; --wash-sky:#1f2a3a;
  --wash-teal:#1c3332; --wash-lavender:#2a2440; --wash-sand:#352c20; --wash-grey:#26272a;
  --ink-rgb:0 0 0; --bg-rgb:17 18 19; --accent-rgb:110 162 255;
  --shadow-1:0 1px 2px rgb(0 0 0 / .34),0 0 0 1px rgb(255 255 255 / .024);
  --shadow-2:0 2px 4px rgb(0 0 0 / .42),0 8px 20px rgb(0 0 0 / .24),0 0 0 1px rgb(255 255 255 / .035);
  --shadow-3:0 10px 30px rgb(0 0 0 / .5);
  --press:inset 0 1px 1px rgb(255 255 255 / .6),inset 0 -3px 0 #b9bec6;
  --press-light:inset 0 -3px 0 #0b0c0d;
  --scrim:rgb(0 0 0 / .58); --glass:rgb(var(--bg-rgb) / .9);
}
```

Fonts to self-host (step 2): Overused Grotesk (variable, from its OFL release), Departure Mono (OFL release),
keep Inter and IBM Plex Mono (already self-hosted in `theme/fonts.css`). Licence files sit next to the fonts.

### 12.3 Shared building blocks (step 3) — new `theme/ui.css`

One set of classes every page uses instead of per-page variants:

| Class | What it is | Replaces |
|---|---|---|
| `.btn` `.btn-primary` `.btn-secondary` `.btn-ghost` `.btn-icon` | §7.3: tactile edge, −2 px hover, pressed edge, `--r-btn`, 32 / 40 / 48 px sizes (`.btn-sm/.btn-lg`) | `styles.css .btn`, `.pr-solve`, `.r-btn`, `.lab-btn`, `.sv-submit`, `.pb-pick`, `.sd-copy`, `.acct-signin-link`, `.tour-next`, `.st-err button`, `admin .a-btn` |
| `.pill` `.pill-meta` `.pill-tag` `.pill-live` | §8.5 | `.d-tag`, `.pb-tag`, `.qt-st`, `.lab-ch-level`, eyebrow `label`s |
| `.seg` (+ `[aria-pressed=true]`) | §8.6 segmented control | `.pb-filter`, the workspace tab bar on phones |
| `.card` `.card-lift` | white, `--r-lg`, `--shadow-1` → `--shadow-2` and −1 px on hover | `.d-panel`, `.a-type`, `.a-lab`, `.a-next a`, `.rail-lab`, lab panels |
| `.eyebrow` `.count` `.num` | Plex Mono caps labels, counts, numbers | `.d-panel>label`, `.crumbs`, `.d-no`, `CONCEPT // 04` labels |
| `.field` | input with the focus ring and halo of §8.8 | `.sv-field input`, `.sch input`, admin inputs |
| `.icon-tile` | 40/52 px rounded tile for an icon or a component glyph | lab palette glyphs, problem component hints |

### 12.4 Component mapping (our file → their pattern → change)

| Ours (file · class) | Pattern | Change |
|---|---|---|
| Landing hero `main.jsx` · `.hero` | §8 hero | Off-white page, 64–88 px tight headline with one **pixel-mono word** ("System design, *explained.*"), centred; primary tactile button "Start practising →" + ghost "Try IND vs PAK"; the Kafka figure becomes a floating white card with `--shadow-2` (our own artefact) |
| Landing "What's inside" `.inside-grid` | course folders §8.9 | four folder-style cards with pastel washes; the "art" is a still frame of one of our figures; meta pill "22 QUESTIONS · 66 ARTICLES" |
| Landing IND vs PAK `.lp-lab` | lab card §8.11 | white card, eyebrow "TRY IT NOW", tactile Run button |
| Header `.header`, `.nav` | §8.2 | glass bar 64 px, grey text links, Sign in as secondary tactile button, round theme button with the light edge |
| Dashboard shell `dashboard/shell.css` · `.side`, `.d-head`, `.tabs` | §8.3, §8.14 | sidebar `--surface-2`, 32 px rows radius 8, active `--hover`; group labels mono caps; numbered groups with page counts (`01 Core concepts 9`); top bar with a section switcher + breadcrumb instead of the long tab row (also fixes the cut-off tabs on phones) |
| Dashboard start `pages.jsx` · `Home`, `library.css .card` | course folders §8.9 | Library cards become folders; washes `--wash-sage/sky/butter`; "Open →" footer |
| Section list `pages.jsx` · `List`, `.d-group`, `.d-list` | curriculum grid §8.13 + question cards §8.10 | group header as a curriculum box; articles as cards with `CONCEPT // 04` → `04` mono number, title, dek, and a List / Grid toggle (grid shows a still of the article's first figure) |
| Interview Questions / Problems `problems.jsx` · `.qt-table` | question cards (list mode) §8.10 | rows become white cards: number, title, one-line dek, tags (difficulty, "ASKED IN"-style chips from our tags), score/★ and → on the right; keep the table semantics for screen readers |
| Article `article.jsx` · `.d-article` header | lesson header §8.15 | grey header panel: breadcrumb, mono number, title (Inter 38 px), tabs "Notes · Listen · Share"; the right `Rail` becomes "ON THIS PAGE" + a "TRY IT" card like "USED IN" |
| Article body `blocks.css` | lesson body | `--font-read` 16 px / 1.78, max 70 ch; `.a-tldr` as a white card with a mono eyebrow; `.a-example` as a wash card; `.a-type` as cards; tables with mono heads; `.a-more` as an accordion like §8.19 |
| Figures `figure.css` · `.a-fig` | sheets in the paper reader §8.16 | white card `--r-lg`, `--shadow-1`, mono caption head; the figure itself keeps our palette (it follows tokens) |
| Read aloud `reader.css` | segmented control + tactile button | Listen as `.btn-secondary` with an icon; speed and voice as `.seg` / selects |
| Prev/next `.a-next` | §8.15 prev/next | two cards "PREVIOUS / NEXT" |
| Lock page `account.css` · `.lock-card` | paywall card §8.15 | centred white card, mono eyebrow, the Google button, terms checkbox; text above fades out |
| Workspace `solve.css` · `.sv-tabs`, `.sv-bar`, `.sv-console` | app shell + segmented control | tabs as `.seg`; Run secondary, Submit primary (tactile); results console as a card with mono counts ("4 / 4 TESTS PASSED") |
| Canvas `lab/lab.css` · `.lab-ins`, `.lab-item`, nodes | icon tiles, cards | palette items as `.icon-tile` + label rows (32 px, radius 8); nodes white `--r-md` with `--shadow-1`; inspector panels as cards |
| Tour `tour.css` | search-palette panel | `--r-xl`, glass, `--shadow-2`, tactile Next |
| Theme button `theme/toggle.css` | round icon button §7.3 | white circle with the light tactile edge |
| Quick Notes `pages.css .d-notes` | changelog §8.20 | white rows with a mono date/status chip |
| Analytics `admin.css` | app shell | cards and mono numbers, same tokens |

### 12.5 Page-by-page target

1. **Landing** — announcement strip (from `site.json`, dismissible) → hero (§12.4) → "Practise system design the way
   interviews test it" with four folder cards → IND vs PAK lab card → FAQ (new, `site.json`) → footer with mono column
   heads. No marquee or tweet wall (§14).
2. **Dashboard start** — app shell; "LIBRARY" eyebrow; folders for Concepts, Components, Interview Questions; a
   second row of numbered tiles for Problems, Quick Notes, Real systems.
3. **Section page** — title 40 px, mono count ("21 PAGES"), List / Grid toggle, curriculum boxes per group, cards.
4. **Article** — lesson header card, ON THIS PAGE + TRY IT side cards, reading column, prev/next cards.
5. **Problems** — "PRACTISE" eyebrow, the progress line as mono counts, filters as `.seg`, question cards in list mode.
6. **Workspace** — tabs as `.seg`, tactile Run/Submit, results card; the canvas unchanged except node and panel skin.
7. **Challenge** — same as workspace; Score dialog as a palette-style panel with stars.
8. **Privacy / Terms** — reading column, mono eyebrows.
9. **Lock page** — paywall-style card.
10. **Analytics** — app shell cards.

### 12.6 Figures in the new look

Figures already read colours from `palette.js`, so step 1 recolours them. Keep our step captions; set figure text to
`--font` (grotesk) and labels to `--mono`; boxes get `rx=6` where the figure's `Bx` helper draws rects (one change in
`figs/parts.jsx`), so diagrams match the rounder UI. Pastel washes can fill "zones" in figures sparingly.

### 12.7 Order of work and acceptance checks

| Step | Scope | Done when |
|---|---|---|
| 1 Tokens | §12.2 into `tokens.css` + `palette.js`; no markup | theme test green; every page screenshot reviewed light + dark; AA for `--ink`, `--muted`, `--accent` on `--bg` and `--card` (script in the PR) |
| 2 Type | self-host Overused Grotesk + Departure Mono; `--font`, `--font-read`, `--font-display` | no layout overflow 320→1440 px; article text unchanged (Inter); headline accent word on landing |
| 3 Buttons, pills, fields | `theme/ui.css`; replace the per-page buttons/tags listed in §12.3 | one button style across the site; focus ring visible on every control; reduced motion removes the lift |
| 4 Cards | folders, curriculum grid, question cards, article blocks as cards | Library, section, Problems pages match §12.5; `no-lab.js`, `eval-problem.js`, `challenges-v2.js` green |
| 5 Shell | glass bar, numbered sidebar, section switcher + breadcrumb, lesson header, prev/next | phone header no longer cut off; sidebar drawer on phones; keyboard navigation unchanged |
| 6 Motion | hover lifts, arrow slides, pressed edges, headline word entry, palette-style tour | all motion off under reduced motion; no motion on the canvas while editing |

Every PR: light and dark, desktop 1366×900 and Pixel 7, the screenshots of every page compared with the previous
build (the method in the handover, "The UI is built to change"), and one sentence per visible change in the PR body.

---

## 13. Appendix — raw measured values

- Primary button shadow at rest: `rgba(59,59,59,.01) 0 7px 3px, rgba(59,59,59,.05) 0 4px 2px, rgba(59,59,59,.09) 0 2px 2px, rgba(59,59,59,.1) 0 0 1px, rgba(255,255,255,.48) 0 1px 1px inset, #232323 0 -3px 0 inset`.
- Primary pressed: `rgba(59,59,59,.04) 0 2px 1px, rgba(255,255,255,.25) 0 1px 1px inset, #232323 0 -1px 0 inset`, still `translateY(-2px)` from hover.
- Secondary (Sign in): `rgba(59,59,59,.09) 0 2px 2px, rgba(59,59,59,.1) 0 0 1px, #d3d3d3 0 -3px 0 inset`, border 1 px `#c9c9cf`, radius 7, 14 px w500.
- Labs search field: `rgba(143,143,143,.01) 0 18px 7px, rgba(143,143,143,.05) 0 10px 6px, rgba(143,143,143,.09) 0 4px 4px, rgba(143,143,143,.1) 0 1px 2px, rgba(166,166,166,.25) 0 -5px 5px inset`.
- Focus: `outline: 2px solid #272727; outline-offset: 2px`; input focus adds `0 0 0 3px rgb(39 39 39 / .5)`.
- Top bar: 1440×64, `rgba(247,247,248,.9)`, `backdrop-filter: blur(24px)`.
- Search palette: 680×366, `rgba(255,255,255,.94)`, radius 16, padding 12, shadow level 2; input 546×52, 16 px.
- Sidebar row: 226×32, padding 0 7 px, gap 8.75 px, radius 8, 13 px w500, rest colour ink at 65 %, active fill `#f0f0f2`; module row 12 px at 70 %.
- Question card: 348×457, padding 22, gap 14, radius 12; number 10 px Plex Mono `#929292`; icon 26 px Phosphor; tags 10 px mono `#6e6e6e`; image 304×304.
- Lab card: 348×207, radius 12, ASCII band 63 px; filter pill 57×44, radius 999, `#f4f4f5`, 13 px w500.
- Segmented "Grid": 69×32, radius 999, `#f4f4f5`, padding 0 12 px, gap 6 px, 13 px w500 +0.01em.
- "New in November" pill: 151×36, radius 999, 1 px ring `#dedee2`.
- FAQ summary: 680×74, 16 px w650, gap 22 px.
- Newsletter input: 279×28, radius 12 (4 on focus), padding 3.5×8.75 px, 1 px `#dedee2`.
- Daily abstract: Newsreader 14/21.7 px `#6e6e6e`, 476 px wide.

---

## 14. Do not copy

- No fanout name, wordmark, logo, folder or sticker artwork, illustrations, ASCII art, tweets, testimonials, course
  names, copy or page layouts reproduced one-to-one. Our cards carry our own art (our figures, Zotato).
- No OffBit (trial/commercial). Overused Grotesk, Departure Mono, IBM Plex Mono, Inter and Newsreader are SIL OFL;
  Phosphor icons are MIT — keep the licence files with them.
- No trackers, social embeds, fake "online" counts or countdown timers to imitate their marketing.
- Keep our accessibility bar higher than theirs: no body text below AA, no 9 px labels for anything important.
- Keep our rules: colours only through `frontend/src/theme/`, every change checked in light and dark, figures
  readable at phone width, reduced motion respected.
