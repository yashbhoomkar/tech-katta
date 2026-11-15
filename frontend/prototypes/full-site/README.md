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

1. **Three settings: System (default), Light, Dark.** System follows the device and changes live when the device changes. The choice is remembered per viewer. The switch is in the sidebar, on the You page (with previews) and in the landing footer.
2. **No white flash.** `boot-theme.js` runs in `<head>` before the first paint. `theme-color` follows the page colour, so the phone's browser bar matches.
3. **Warm near-black, not blue-grey.** Page `#121110`, surface `#1A1917`, raised `#23211E`: the same paper at night.
4. **Depth from lighter surfaces, not shadows.** Shadows disappear on black, so dialogs and menus sit on `--raised` with a 1 px top highlight and a hairline edge.
5. **Section colours keep their identity without glaring.** Big colour blocks (the cards on the landing, Explore, section headers) become deep versions of each hue with light text. The bright pastel moves to the accent (dots, progress bars, a thin edge), so Concepts is still blue and Problems still green.
6. **Text is never pure white.** Ink `#EEEBE4`; secondary and muted text keep at least 5:1 contrast. Every text pair passes WCAG AA, the lowest being muted text on raised surfaces at 5.1:1.
7. **Status colours are lifted for dark**: pass `#5CC98A`, fail `#F28B82`, warn `#F0A35E`, link `#A5B8F5`. The focus ring follows the link colour.
8. **Inverted buttons.** Primary buttons become light pills with dark text. The black call-to-action band on the landing becomes a deep marigold band, so it still stands out on a dark page.
9. **No hard-coded colours outside `tokens.css`**, except the small theme previews on the You page, which have to show both themes at once.
10. **Switching cross-fades** (View Transitions, 280 ms) where the browser supports it, and only when the colours actually change.

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
