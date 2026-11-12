// The design tokens (tokens.css) as JavaScript values, for the places that need a colour in code: SVG figures
// (fill and stroke attributes, SMIL animation values), the landing and library diagrams, and the canvas.
// Figure files import colours from here (or parts.jsx, which re-exports the short names) and never write a
// colour code of their own; a test (theme.test.js) keeps it that way and keeps these values equal to tokens.css.
//
// The bindings are live (`export let`): readTokens() reads the current values from the page's CSS variables, so
// when the theme changes, figures drawn afterwards get the new colours. The defaults below are the light theme,
// used before the page is ready and in tests.
export const TOKENS={bg:"#fff",surface:"#f5f7fa","surface-2":"#fbfcfd",ink:"#1c2733","ink-2":"#36424f","ink-3":"#536174",
muted:"#586575","muted-2":"#647184",faint:"#8a94a3",disabled:"#c7cfdb","line-strong":"#9aa5b4",line:"#d9dee7","line-soft":"#e6eaf0",
grid:"#eef1f5",accent:"#2855d9","accent-strong":"#1f46b8","accent-mid":"#9db3ef","accent-line":"#b9c9ff","accent-soft":"#dfe6fb",
"accent-tint-2":"#eef3ff","accent-tint":"#f8faff","on-accent":"#fff",danger:"#b42318",red:"#c8372d","danger-line":"#f4c7c3",
"danger-soft":"#fde3e1","danger-tint":"#fff5f4",success:"#1a7f37","success-line":"#b7e1c1","success-tint":"#eefaf2",warn:"#9a6700",
"warn-strong":"#7a4b00","warn-mid":"#d4a72c","warn-line":"#f0d58a","warn-tint":"#fff8eb",star:"#e3a008",
"cat-green":"#1f8a5b","cat-amber":"#b7791f","cat-violet":"#7c3aed","cat-teal":"#0e7490","cat-pink":"#be185d"};
export let BG,SURFACE,SURFACE_2,INK,INK_2,INK_3,MUTED,MUTED_2,FAINT,DISABLED,LINE_STRONG,LINE,LINE_SOFT,GRID,ACCENT,ACCENT_STRONG,
ACCENT_MID,ACCENT_LINE,ACCENT_SOFT,ACCENT_TINT_2,ACCENT_TINT,ON_ACCENT,DANGER,RED,DANGER_LINE,DANGER_SOFT,DANGER_TINT,SUCCESS,SUCCESS_LINE,
SUCCESS_TINT,WARN,WARN_STRONG,WARN_MID,WARN_LINE,WARN_TINT,STAR,CAT_GREEN,CAT_AMBER,CAT_VIOLET,CAT_TEAL,CAT_PINK;
// The short names the figures were written with: ink, grey outlines, red for trouble, blue for the path that works,
// light blue (LB) and light red (LR) box fills, and the filled blue (FB).
export{LINE_STRONG as GREY,ACCENT as BLUE,ACCENT_TINT as LB,DANGER_TINT as LR,ACCENT_SOFT as FB};
function set(t){({bg:BG,surface:SURFACE,"surface-2":SURFACE_2,ink:INK,"ink-2":INK_2,"ink-3":INK_3,muted:MUTED,"muted-2":MUTED_2,
faint:FAINT,disabled:DISABLED,"line-strong":LINE_STRONG,line:LINE,"line-soft":LINE_SOFT,grid:GRID,accent:ACCENT,
"accent-strong":ACCENT_STRONG,"accent-mid":ACCENT_MID,"accent-line":ACCENT_LINE,"accent-soft":ACCENT_SOFT,"accent-tint-2":ACCENT_TINT_2,
"accent-tint":ACCENT_TINT,"on-accent":ON_ACCENT,danger:DANGER,red:RED,"danger-line":DANGER_LINE,"danger-soft":DANGER_SOFT,
"danger-tint":DANGER_TINT,success:SUCCESS,"success-line":SUCCESS_LINE,"success-tint":SUCCESS_TINT,warn:WARN,"warn-strong":WARN_STRONG,"warn-mid":WARN_MID,
"warn-line":WARN_LINE,"warn-tint":WARN_TINT,star:STAR,"cat-green":CAT_GREEN,"cat-amber":CAT_AMBER,"cat-violet":CAT_VIOLET,
"cat-teal":CAT_TEAL,"cat-pink":CAT_PINK}=t)}
set(TOKENS);
// Read the current values of every token from the page (call after the theme changes). Missing ones keep the default.
export function readTokens(el=typeof document!=="undefined"?document.documentElement:null){
  if(!el||typeof getComputedStyle!=="function")return;const cs=getComputedStyle(el),t={};
  for(const k in TOKENS)t[k]=cs.getPropertyValue("--"+k).trim()||TOKENS[k];set(t);
}
