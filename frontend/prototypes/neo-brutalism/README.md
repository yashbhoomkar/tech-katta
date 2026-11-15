# Neo-brutalism prototype (prototype.katta.cc/p/neo-brutalism/)

The whole of /p/full-site/ in a neo-brutalist style: flat bold colour, 2 px black outlines, hard 4 px shadows,
Archivo Black headlines, Space Mono labels, sticker chips, and keys that press into their own shadow. Cream
"chai-stall" page in light; near-black with cream outlines in dark. Same pages, routes, navigation, interactions
and phone layout as full-site. Lesson text and the canvas stay calm.

## How it is built

A style layer, not a new app. index.html loads full-site's scripts (/p/full-site/scripts/boot-theme.js and
main.js) and all of full-site's stylesheets, then three of its own:

- styles/tokens.css: the colours, fonts, outline and shadow sizes, for light and dark
- styles/brutal.css: the component restyle (selectors are full-site's class names)
- styles/details.css: round 2 details (sticker labels, halftone, ticker, shadow = pressable, quiet structure in dark)
- styles/motion.css: round 2 motion (highlighter wipe, sticker slap, ticker, stepped bars, stamps, shutter theme change)
- styles/phone.css: smaller shadows and hero on phones; no floating shapes

Nothing in full-site/ is changed. The body of index.html is identical to full-site's, because the scripts look
up its element ids.

## Principles

1. Loud chrome, calm reader (no hard shadows behind lesson text).
2. Text on colour is always #111111, in both themes.
3. Colour is a flat fill or a line: no gradients, glows or dark washes.
4. One outline (2 px) and one shadow (4 px); 3 px for dialogs and the sidebar edge.
5. No section colour matches a status colour or the brand (Problems teal vs "Passed" green; Quick Notes lime vs
   marigold).
6. Marigold means the key or active thing.
7. Motion: keys press into their shadow (100 ms), cards lift 2 px on mouse hover, cards land with a short stamp;
   reduced motion keeps fades only.

Spec and the reasons for every value: tech-katta-context/ui-prototypes/neo-brutalism-spec.md.

## Open questions for the owner

- Loud everywhere, or calm reader (current)?
- Headline face: Archivo Black (current) or Space Grotesk?

## Round 2 (owner, 2026-11-15: "think more … add more details, add more animations; the dark theme especially is not up to the mark")

Why the first dark failed: every line was cream (cards, dividers, table rows, bars, the sidebar edge), and static cards cast cream shadows that read as a second border, so the page looked like a glowing wireframe with almost no colour.

- Cream (dark) / black (light) outlines now mark objects only; structure uses `--rule`, a quiet warm grey `#3B3934` in dark. The dark page is warmer (`#121110`).
- A hard shadow means "you can press this": keys and link cards keep 4 px; static cards get 2 px in light and none in dark, where their outline is also a step quieter.
- Details: colour sticker labels on cards ("Continue where you left off", "Streak", "Problem of the day", "Say this in the interview"), halftone texture on big colour blocks, a running ticker under the landing hero, boxed lesson numbers, coloured offset shadows on the big numbers and page titles (light only), a "DONE" stamp on a completed lesson, and a marigold edge on hovered problem rows.
- Motion: the highlighter wipes in behind "explained.", stickers slap on, the ticker runs (pauses on hover), progress bars fill in 8 chunky steps, the chosen sidebar item and filter stamp down, the hero shapes turn a quarter under the mouse, and the theme change wipes down like a shutter. Reduced motion keeps fades only.

## Round 3: calmer colours (owner, 2026-11-15: "Calmer colours for neo-brutalism please on both light and dark")

Same hues, about half the saturation, even lightness (OKLCH L .82, chroma ~.085; lemon and marigold L .86). Concepts `#8FCDF5`, components `#EFB78E`, interview `#CBB9F5`, problems `#8CD6BA`, real `#F7AFAB`, notes `#DCE29E`, keys `#F3C766`. Softer cream page `#F8F2E5`, warm-white surfaces `#FFFDF8`, ink `#1C1B1A`; in dark, softer cream outlines `#D9D1C0` and text `#EDE6D6`. Outlines, shadows, stickers and motion are unchanged. Text on every colour block is at least 9.7:1; the lowest pair on the site is 5.3:1 ("Passed" green on white).

## Round 4: dark candidates (owner, 2026-11-15: "Start implementing it", from neo-brutalism-dark-thinking.md)

`styles/dark-candidates.css` and `scripts/nbdark.js` add three dark palettes beside the current one, chosen with `?nbdark=b|d|e` (or `now`) or the small "Dark" switch at the bottom right in dark mode: **B chalkboard**, **D inverted blocks**, **E dim paper**. Side by side at `/p/nb-dark/`. Once the owner picks, the winner moves into `tokens.css` and these two files go.

## Notes

None.
