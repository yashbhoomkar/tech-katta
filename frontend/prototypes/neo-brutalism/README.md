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

## Notes

None.
