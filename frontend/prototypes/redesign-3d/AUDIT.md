# Redesign 3D: UI/UX inconsistencies (audit, 2026-11-19)

How this was checked: every page (landing, Dashboard, a section, interview questions, a concept article, an interview
question, Practice, 404) loaded in a browser at three widths (phone 412 px light, tablet 900 px dark, desktop
1440 px dark), with an automated scan of every visible element (text in capitals, corner radii, button heights,
small-label sizes, headline sizes, text colours, page width, script errors), then screenshots read by eye and the
code read where needed. No script errors and no sideways scroll on any page at any width.

The original findings, ranked by how much it hurts someone using the site.

## Status: all 32 addressed (2026-11-19)

| # | What was done |
|---|---|
| 1 | Below 1000 px the glass bottom bar is the navigation (it used to stop at 760 px); the top bar's links and button are hidden in the app there. Checked at 900 px. |
| 2 | New Practice page (`#/sim`): all five scenarios with level, budget, best score, a status tick and a live 3D preview. Sidebar, Dashboard card, phone bar and footer open it. |
| 3 | Scenario page: breadcrumbs "Dashboard / Practice" instead of "← HOME". |
| 4 | One label, "Start preparing", in the top bar and the hero. |
| 5 | 404 uses the app frame, sentence case, no full stop, "Go to the Dashboard". Article not-found/offline pages match. |
| 6 | "Done" everywhere ("2 of 21 done", "Recently completed", "All concepts done"); "Mark complete" stays as the action. |
| 7 | "Learn" dropped from the trail: "Dashboard / Concepts / Core / Caching". |
| 8 | The Interview chapter's four questions are now a list in the words (with part colour dots). |
| 9 | Scenario page: sentence case, no full stops, the one glass recipe, no blue links, 12 px labels, chart text 12 px. |
| 10 | Two heading sizes: `--h-hero` (landing and article story, 69 px) and `--h-app` (every app page, 56 px). |
| 11 | Radii 10 / 16 / 24 plus pills (8 only for the inner pill of a segmented control). |
| 12 | Button heights 36 (chips and icons) / 40 / 48. |
| 13 | One label size, 12 px (code keeps its own size). |
| 14 | One pure black / white for text and one secondary grey per theme, set once on `:root`. |
| 15 | Primary buttons carry the arrow chip everywhere; links keep a text arrow. |
| 16 | Breadcrumbs on every app page; tags only on the landing and article stories. |
| 17 | One separator (·) in every tag. |
| 18 | "Practice" everywhere. |
| 19 | The reader no longer repeats the title; it opens with breadcrumbs, read time and tools. |
| 20 | Footer carries the hero's line. |
| 21 | One card hover (2 px lift, firmer edge); rows tint. |
| 22 | The worked-example card is a plain card, not glass. |
| 23 | The article hero is framed for the narrower page next to the sidebar. |
| 24 | One drawn tick for done (section rows, Dashboard, sidebar, rail, the Completed chip). |
| 25 | "Clear my progress" asks again on the button ("Tap again…") instead of the browser dialog. |
| 26 | Theme button is an icon with a tooltip, and "Theme: Dark" in the sidebar. |
| 27 | "Scroll to play" sits under the hero buttons. |
| 28 | Touch screens never fold the sidebar to the rail; the fold button shows only where there is a mouse. |
| 29 | Wording now points to the list of concepts below the 3D ("Tap a part, or pick a concept from the list below"). The 3D parts themselves are still not reachable by keyboard; the list is. |
| 30 | `[` on a scenario page opens the sidebar for that page only; it no longer changes the saved choice. |
| 31 | 83 unused rules deleted. The stylesheet is still layered: a final block sets the shared sizes and wins over the older ones with `!important`. Merging all layers into one is not done. |
| 32 | The article loading page has the same frame as the others (breadcrumbs, title, skeleton lines). |

Also found while fixing: a stray blue line across the Practice and 404 pages (the page container's focus outline).

## High: confusing or broken

1. **Tablets have no navigation once you scroll.** Between 761 and 999 px wide there is no sidebar (it starts at
   1000 px) and no bottom bar (it stops at 760 px), so the only navigation is the top bar, and the top bar hides
   after 120 px of scrolling and never comes back. On a tablet, inside a long article, there is no way to reach
   Dashboard, Learn or Practice without scrolling to the top.
   *Fix:* start the sidebar at 900 px and show the bottom bar below that, or keep the top bar on app pages.
2. **Practice has five scenarios but only one door.** The sidebar and the Dashboard card say "Practice 0/5", but
   every Practice link opens IND vs PAK; the other four are reachable only from the "next" link after a run. There is
   no list of scenarios anywhere.
   *Fix:* a Practice page listing the five, with level, best score and a 3D preview, like a section page.
3. **The Practice page still says "← HOME" and sends you to the landing.** Home no longer exists (it was merged into
   the Dashboard), and the landing is not "home" for someone working in the app. On phones it is the only way out,
   because the bottom bar is hidden on Practice.
   *Fix:* "← Dashboard" to `#/me`, and keep the bottom bar (or a back button) on phones.
4. **"Start learning" goes to the Dashboard, not to Learn.** The landing's top button says "Start learning" and the
   hero says "Start preparing"; both open the Dashboard. Two names for one action, and one of them names the wrong
   place.
   *Fix:* one label, e.g. "Start preparing", everywhere.
5. **The 404 page belongs to neither world.** It shows the landing's top bar on desktop but the app's bottom bar on
   phones, its headline ends with a full stop ("Nothing runs at this address."), its tag is in capitals
   ("NOT FOUND"), and "Go home" goes to the landing.
   *Fix:* app frame, sentence case, no full stop, "Go to the Dashboard".
6. **Read, done, complete: three words for one thing.** The Dashboard says "2 of 21 concepts read", section pages say
   "1 of 21 done", the sidebar says "2/21", the reader has "Mark complete" and a "Completed" chip, the Dashboard card
   says "Articles count once you mark them complete".
   *Fix:* pick one ("done" matches tech.katta.cc's "Mark complete"/"x of y done") and use it everywhere.
7. **"Learn" in the breadcrumbs is not a page.** Section pages show "Dashboard / Learn" and articles
   "Learn / Concepts / Core"; the "Learn" link opens Concepts, so the trail goes back to a sibling, not a parent.
   *Fix:* drop "Learn" from the trail ("Dashboard / Concepts / Core"), or make `#/learn` a real overview.
8. **On the landing, the Interview chapter's questions are almost never seen.** The four questions pinned to the
   parts ("What if a server crashes mid-publish?" …) are 3D labels, and labels fade out as soon as the words arrive,
   so they show only in the last moments of the camera move. That chapter's key content is effectively hidden.
   *Fix:* keep that chapter's labels while reading, or move the questions into the text.

## Medium: visibly inconsistent

9. **The Practice page is still in the old style.** Labels in capitals ("EASY · URL SHORTENER", "TIME", "TRAFFIC",
   "ERRORS", "P99", "COST A MONTH", "IT BROKE · SCORE 5 / 100", "WHAT HAPPENED"), verdict headlines with full stops
   ("The evening did not hold."), panels in an older translucent style rather than the one glass recipe, a blue
   accent on its "Read: …" links and on a line across the top that appears nowhere else, and small labels at 9.5–
   10.5 px, the smallest on the site.
   *Fix:* bring it into line with the rest: sentence case, the glass recipe, the part colours, no full stops.
10. **Five headline sizes for the same kind of page title** (desktop): landing 75 px, article hero 65 px, 404 63 px,
    Dashboard 60 px, sections 58 px.
    *Fix:* one page-title size for app pages, one hero size for the landing and article stories.
11. **Nine corner radii** on cards and panels: 8, 10, 12, 14, 16, 18, 20, 24 px and fully round.
    *Fix:* three steps (e.g. 10 for controls, 16 for cards, 24 for large panels) plus round pills.
12. **Nine button heights:** 32, 34, 36, 38, 40, 41, 42, 46 and 48 px across the site (the reader alone has six).
    *Fix:* two sizes (40 and 48) and one for icon buttons.
13. **Six sizes of small grey labels** (the mono font): 11, 11.5, 12, 12.5, 13.5 and 15 px, plus 9.5–10.5 px on
    Practice.
    *Fix:* one label size (12 px), one larger (13.5 px).
14. **Three "blacks" and two "whites" for body text.** In light mode the app pages use pure black, the landing chapter
    text #1B1A22 and secondary text two different greys (#393743 and #4A4757); in dark mode the landing mixes #FFFFFF
    and #F4F2FA. The owner asked for pure white and pure black text.
    *Fix:* one text colour per theme and one secondary grey, set once on `:root`.
15. **Three ways to show an arrow on a button:** a round chip with "→" (landing, "Mark complete & next"), a plain
    "→" in the label ("Continue →", "Start →"), and a text link with "→" ("Play the story →").
    *Fix:* one primary-button style with one arrow treatment.
16. **Three different page headers.** The Dashboard has a tag ("Dashboard · On this device"), section pages have
    breadcrumbs and no tag, articles have both a tag in the story and breadcrumbs in the reader.
    *Fix:* breadcrumbs on every app page, the tag only on the landing and article stories.
17. **Two separators in tags:** "01 • Learn" and "Concept 04 • Core" (dot), but "Concept 04 · Caching" and
    "2 of 21 · next" (middle dot).
    *Fix:* one separator.
18. **"Practice" and "Practise" mixed.** The nav, cards and bottom bar say "Practice"; the sidebar group heading and the
    reader's side button say "Practise".
    *Fix:* one spelling (noun "Practice" for the place).
19. **The article title appears twice.** The 3D story opens with the title split over two lines ("Caching / When to
    add a cache…"), then the reader below repeats the full title, number, tag and breadcrumbs.
    *Fix:* keep the reader's header compact (breadcrumbs, read time, tools) and let the story own the title.
20. **Two different tagline voices.** The landing hero says "Your system design interview / Everything for it, in one
    place"; the footer on every page still says "System design you can watch".
    *Fix:* one line, the hero's.
21. **Hover feedback varies:** cards lift 2 px or 3 px, borders turn to the section colour, to a grey or not at all;
    some rows fill with a grey background instead.
    *Fix:* one hover rule for cards, one for list rows.
22. **Glass where the rule says no glass.** The worked-example card in articles uses the glass highlight on a plain
    page section; the rule is glass only for things floating over the 3D (phone text panel, bars, labels, toasts).
23. **The article's opening 3D is clipped on desktop.** With the sidebar open, the system in the article hero runs off
    the right edge (the database is cut in half on Caching).
    *Fix:* frame the hero camera to the main column's width, not the window's.
24. **The ✓ is a text character in some places and drawn in others** (section rows and the sidebar use "✓", the
    Dashboard parts use the colour-filled dot).
25. **"Clear my progress" uses the browser's own confirm box,** the only native dialog on a site that otherwise uses
    its own panels and toasts.

## Low: polish and upkeep

26. **The theme button shows the current setting ("Dark"), not the action.** It is unclear whether pressing "Dark"
    turns dark mode on or off. *Fix:* an icon with a tooltip ("Theme: dark").
27. **"Scroll to play" floats far below the hero buttons** on desktop, detached from them.
28. **The folded sidebar (rail) shows sections only as coloured squares;** the names are in tooltips only, so on touch
    screens with a wide window they cannot be read.
29. **The Dashboard's 3D parts can be clicked but not reached by keyboard.** The list of parts below does the same job,
    so this is minor, but the "Tap a part" sentence only describes the mouse and touch path.
30. **Pressing "[" on Practice does nothing visible** (Practice forces the rail), but it still flips the saved setting,
    so the sidebar is unexpectedly folded on the next page.
31. **Old styles still in the stylesheet:** about 50 rules for pages that no longer exist (old lessons, the old "You"
    page, incident cards, "ways" cards), and 5 uppercase rules. `app.css` is 1,134 lines in layers where later blocks
    override earlier ones, which is why several of the issues above exist.
    *Fix:* one cleanup pass that merges the layers into one set of tokens (sizes, radii, colours) and deletes unused
    rules.
32. **Loading looks different per page:** articles show a "Loading" page, section pages render at once from the
    bundled list, the Dashboard has no loading state.

## Suggested order

1–5 first (navigation and dead ends), then one tokens pass for 10–14 (sizes, radii, colours; it fixes most of the
visual drift at once), then 6, 7, 15–20 (words and headers), then Practice (9), then the rest.

## Second pass (2026-11-19, after the owner's review)

Re-checked all 32 fixes with an automated pass on every page at 412, 900 and 1440 px (full stops in headings, text in
capitals, blue links, primary buttons without the arrow, the ✓ character, overflowing boxes, tap targets under 34 px on
phones, breadcrumbs, which navigation shows, theme icon). All held, apart from the gaps below, now fixed:

| # | Found | Fixed |
|---|---|---|
| 33 | The worked-example card's peach tint read as brown in dark mode (owner: "Did not like the colour"). | A neutral card with the section's colour as a small dot by its label. |
| 34 | The old blue accent survived in the focus ring, text selection, the simulator's traffic chart, the selected part and stepper hover in the dock, the running ring and the footer link hover. | The accent now points to the text colour; the chart and selection use the app-server colour. No blue left. |
| 35 | The top bar's "Start preparing" was the only primary button without the arrow. | Arrow added. |
| 36 | The Practice list hid the bottom bar on phones (the rule meant for the full-screen simulator caught it too). | Only the simulator hides it. |
| 37 | The logo in the phone top bar was a 22 px tap target. | 40 px. |
| 38 | Section list rows bled 10–12 px past their dividers on hover. | Rows sit inside the dividers. |
| 39 | On phones the simulator's verdict sat on top of the live stats panel. | The stats panel hides while the verdict shows. |
| 40 | The contents list was "In this article" on phones and "On this page" on desktop. | "On this page" on both. |
| 41 | The Full text / Cards switch was 44 px tall beside a 40 px Share button. | Both 40 px. |
| 42 | Owner: "For interview questions and real systems we don't want the animation to be sticked, rather there should be no animation." | Those two section pages are plain lists, full width, no 3D preview. |

## Third pass (2026-11-19): the two items that had been left

| # | Was | Now |
|---|---|---|
| 29 | The Dashboard's 3D parts were not keyboard-reachable (only the list below them was). | Hovering or focusing a part's row in the list lifts that part in the 3D and fades the rest, so the keyboard path drives the figure too. The simulator's 3D scene also has an accessible name. |
| 31 | The shared scale was a final block that beat older rules with `!important`. | The old rules were corrected at the source (29 label rules now 12 px, no capitals, no wide tracking) and the final block has no `!important`. Checked by comparing the computed style of every element on 8 pages at two widths before and after: identical except the preview captions, which are now correctly 12 px (they were 11 px). |

Also swept all pages for duplicate ids, buttons and links without a name, heading-level skips, more than one h1, a missing main
landmark and focus rings on every control: only the simulator's canvas needed a label. Nothing left open from this audit.

## Fourth pass (2026-11-19): new angles

Tried screen sizes and behaviours not covered before: 320 px and 360 px phones, landscape phones (800×380), a 1920 px desktop,
page titles, back and forward, links versus history.

| # | Found | Fixed |
|---|---|---|
| 43 | Every page had the same browser-tab and history title, "Redesign 3D". | Each page names itself: "Caching · Concepts · Tech Katta", "Dashboard · Tech Katta", the scenario's name under Practice, "Not found" on the 404. |
| 44 | The back button always landed at the top of a page, so returning from an article to a long list lost your place. | Back and forward restore the scroll position; links, Mark complete and tab swipes still open pages at the top (checked: list at 700 px, article opens at 0, back returns to 700, Mark complete opens the next article at 0). |
| 45 | At 320 px the top bar's "Start preparing" ran off the right edge (the hero has the same button). | Hidden below 380 px. |
| 46 | In landscape phones the bottom bar covered the words. | It shrinks to icons only and sits lower. |
| 47 | At 1920 px the Dashboard headline touched the 3D. | The figure moves right on very wide screens. |
| 48 | Part labels on the 320 px Dashboard overlapped ("API gateway" under "App servers"), because the label layout always reserved 76 px at the top for the landing's top bar. | That margin is now a setting: 10 px on the Dashboard, section previews, Practice and article figures. Counts are left off the 3D pills on 320 px phones (they are in the list). |
| 49 | The simulator's parts strip scrolls sideways on phones with no hint. | A fade on the right edge. |
