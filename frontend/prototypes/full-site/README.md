# Full site prototype (prototype.katta.cc/p/full-site/)

The premium revamp built as a small frontend, organised the way the real app would be after the switch. Plain HTML, CSS and ES modules with no build step and no libraries. `hosting/prototype.mjs` copies this folder to `dist/p/full-site/`. It runs under the site's Content-Security-Policy, so it has no inline scripts and loads script files from this site only.

Nothing here touches the real app (`frontend/src`). Content is a fixed sample in `scripts/data/`; in the real app it comes from the content API.

## Folders

```
full-site/
  index.html                 page shell: chrome containers, overlays, stylesheet and script order
  styles/
    tokens.css               every colour, font, radius and timing; light and dark values for the same names
    base.css                 reset, type, utilities
    components/controls.css  buttons, chips, bars, segmented control, theme switch, tabs, logo
    components/cards.css     cards and section colour blocks ([data-sec] sets --c / --a / --t)
    components/overlays.css  dialogs, search, sheets, tour, toast, the prototype switcher
    layout/shell.css         sidebar (full / rail / drawer), top bar, phone tab bar, per-layout rules
    pages/*.css              landing, app pages (home, learn, section, problems, you), lesson, workspace
    motion.css               every animation and the reduced-motion rules (the system from /p/motion/)
  scripts/
    boot-theme.js            sets the theme before first paint (classic script in <head>)
    main.js                  entry: theme, chrome, overlays, router
    core/                    dom helpers, storage, motion helpers, theme, router
    components/              shell, sidebar, topbar, tabbar, command palette, sign-in, tour, shortcuts, toast, icons, switcher
    pages/                   one module per page: render(ctx) returns HTML, mount(root, ctx, scope) wires it up
    data/                    sections and lessons, problems, hints, interviewer answers
```

Each page module has the same shape as a React route component: `render` is the JSX, `mount` is the effects, and `scope` cleans up on unmount. Optional exports `title`, `crumbs`, `up` and `pager` describe the page to the chrome, the way route metadata would. A component here maps one to one to a component file in `frontend/src` when the design is built into the app.

## Routes and layouts

| Route | Page | Layout |
|---|---|---|
| `#/` | landing | landing: its own sticky nav, no app chrome |
| `#/home` | home (dashboard) | app |
| `#/learn` | learn hub | app |
| `#/learn/<section>` | section | app |
| `#/learn/<section>/<lesson>` | lesson | focus |
| `#/problems` | problems | app |
| `#/problems/<slug>` | workspace | workspace |
| `#/me` | you and settings | app |
| anything else | not found | app |

The real app uses paths (`/dashboard/concepts/caching/`); a hash keeps this prototype as static files. Links from the first prototype (`#dashboard`, `#lesson` and so on) are redirected.

## Navigation decisions

1. **One place for "where am I".** Desktop app pages keep a sidebar. It has Home; *Learn* (the five sections, each with its colour dot and progress, e.g. 3/21); *Practise* (Problems, 3/22); and at the bottom, the theme switch and *You*. Inside a lesson, the lesson's section stays highlighted.
2. **Reading and building get the whole width.** On lesson and workspace pages the sidebar steps aside. ☰ or `[` slides it in as a drawer. The lesson's top bar carries breadcrumbs (Learn › Concepts › Core concepts › Caching, each part a link), previous / next, and Share.
3. **The sidebar folds.** `[` or the panel button turns it into a 72 px rail of icons and dots. The choice is remembered.
4. **Phones get a bottom tab bar**, within thumb reach: Home, Learn, Problems, Search, You. Search is a tab because a phone has no ⌘K. The tab bar and top bar slide away while you scroll down a page and come back when you scroll up. The workspace hides the tab bar because the canvas needs the whole screen.
5. **Back goes up, not back in time.** On phones, the top bar's ‹ goes to the page's parent (lesson → its section → Learn). It does the same whether you arrived by a shared link or by clicking. The browser's Back still works and returns you to the scroll position you left; a link click opens a page at the top.
6. **Search everywhere.** ⌘K, Ctrl+K, `/`, the sidebar box, the top-bar icon or the Search tab. An empty search shows *Jump back in* (the last pages you opened), then the sections and pages. Results are grouped (Lessons, Problems, Sections, Pages), with the match highlighted and full keyboard control.
7. **Landing nav.** The nav is sticky and gains a hairline once you scroll. *Learn ▾* opens a menu of the sections: hover with a mouse (80 ms in, 200 ms out, so it does not flicker), or click / Enter. On phones, ☰ opens the same list as a bottom sheet, with Log in and Start free. *How it works* and *About* scroll within the page.
8. **Keyboard.** `?` lists the shortcuts. `g` then `h` / `l` / `p` / `m` goes to Home, Learn, Problems or You. `Esc` closes whatever is open. There is a *Skip to content* link, and focus moves to the new page on every route change.
9. **Section pages** have jump links to their groups (sticky), and each lesson row shows its state (done, in progress, not started) and its length.
10. **Dead ends point the way.** The not-found page offers Search, Home and Learn.

## Dark mode decisions

Chosen by the owner on 2026-11-15 after three rounds of side-by-side comparison ("F2 it is"); the rounds and why
each lost are in tech-katta-context/ui-prototypes/TRIED.md.

1. **System (default), Light, Dark**; System follows the device live. Set before first paint (`boot-theme.js`), so
   there is no white flash; `theme-color` follows the page.
2. **Warm graphite**: page `#131312`, surface `#1C1C1A`, raised `#252523`, sunken `#2A2A27`. Neither brown (the
   first dark) nor cold grey. Depth from lighter layers, not shadows.
3. **Vivid, balanced section colours**: the light theme's hues, saturated, at one perceived lightness (OKLCH L .80,
   chroma up to .14) so no section outshines another: concepts `#6ACAFF`, components `#FAAA51`, interview
   `#CCABFE`, problems `#3FD9AE`, real systems `#FFA384`, quick notes `#EADB58` (lemon: a yellow must be a little
   brighter to read as yellow, and it stays clear of the marigold brand). Dark text on every colour block (≈10:1).
4. **Colour is a fill or a line, never a dark wash**: a dark orange is brown and a dark yellow is olive, which made
   the first dark muddy. Figures, "Say this", Problem of the day, the canvas challenge, hints: neutral with a 3 px
   edge in the section's colour. Difficulty chips are outlined.
5. **Status colours kept apart from sections**: Passed is leaf green `#75D079`, Problems is teal.
6. **Calm at night**: section headers sit 10 % darker than tiles; hover brightens a coloured card instead of lifting it.
7. **Text never pure white** (`#F2F0EB`); every text pair at least 4.5:1.
8. **Switching cross-fades** (View Transitions, 280 ms) where the browser supports it.

## Motion

`styles/motion.css` follows the system shown at /p/motion/ (rules after Emil Kowalski's review-animations, MIT):

- Pressed things scale to 0.97.
- Hover movement only with a real mouse.
- Arrivals use ease-out.
- No bounce except celebrations.
- Page changes fade in 160 ms.
- Modals open in 260 ms from 0.96; drawers and sheets take 400–500 ms on the drawer curve.
- Search opens almost at once, because it is opened from the keyboard.
- With reduced motion, fades and colour changes stay; movement and loops go.

## Phones

`styles/phone.css` (loaded last) and `scripts/components/swipe.js` hold the phone pass (owner, 2026-11-15: good on desktop, "not upto the mark for the mobile view"):

- **Landing**: the four section cards are a swipe row with a peek of the next card and dots, not a tall stack. The hero is tighter, and the two buttons share the width. Numbers are two-up and the portrait is small.
- **Home**: the continue card drops its picture, and Explore is a grid of two-up tiles.
- **Problems**: cards instead of the wide table, so difficulty, acceptance, best score and stars are visible without sideways scrolling. Filters are one swipeable row.
- **Workspace**: a Brief / Canvas switch gives each the whole screen. Run and Submit jump to the canvas so you see the requests travel. Results are one swipeable row.
- **Lesson**: in Cards mode, swipe left or right; the card controls sit above the tab bar, in thumb reach.
- **Gestures**: the menu sheet, the sign-in sheet and the interviewer sheet follow your finger and close on a flick down or past 30 %.
- **Tab bar**: a soft pill behind the current tab, and tabs press in. Nothing behind an open sheet scrolls.
- **Motion**: no blur and no looping shapes, shorter travel, section cards slide in from the side, and press feedback works on iOS.
