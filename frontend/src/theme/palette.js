// The design tokens (tokens.css) as JavaScript values, for the places that need a colour in code: SVG figures
// (fill and stroke attributes, SMIL animation values), the landing and library diagrams, and the canvas.
// Figure files import colours from here (or parts.jsx, which re-exports the short names) and never write a
// colour code of their own; a test (theme.test.js) keeps it that way and keeps these values equal to tokens.css.
//
// The bindings are live (`export let`): readTokens() reads the current values from the page's CSS variables, so
// when the theme changes, figures drawn afterwards get the new colours. The defaults below are the light theme,
// used before the page is ready and in tests.
export const TOKENS={page:"#faf7f0",bg:"#fff",surface:"#f3efe5","surface-2":"#fcfaf5",hover:"#efeadd",inverse:"#1d1b16","on-inverse":"#faf7f0",ink:"#1d1b16","ink-2":"#3a372f","ink-3":"#4d493f",muted:"#625c4f","muted-2":"#6b6557",faint:"#736d5d",disabled:"#cdc7b6","line-strong":"#b9b2a0",line:"#e6e0d1","line-soft":"#ddd6c4",grid:"#f0ebde",brand:"#ffc233","brand-strong":"#f2ac00","brand-edge":"#d79a00","brand-ink":"#6e4a00","brand-line":"#f0d388","brand-tint":"#fff3cf","on-brand":"#1d1b16",mark:"#ffd866",accent:"#94600a","accent-strong":"#754a00","accent-mid":"#e9b949","accent-line":"#f0d388","accent-soft":"#ffe08a","accent-tint-2":"#ffedb8","accent-tint":"#fff6dc","on-accent":"#fff",danger:"#b3261e",red:"#d23b30","danger-line":"#f3c6c1","danger-soft":"#fce1de","danger-tint":"#fff4f2",success:"#17794a","success-line":"#b5e0c6","success-tint":"#ecf8f0",warn:"#9c4a00","warn-strong":"#7a3900","warn-mid":"#e8700c","warn-line":"#f5cfa9","warn-tint":"#fff3e6",star:"#e8a308","cat-green":"#1f8a5b","cat-amber":"#b7791f","cat-violet":"#7c3aed","cat-teal":"#0e7490","cat-pink":"#be185d"};
export let BG,SURFACE,SURFACE_2,INK,INK_2,INK_3,MUTED,MUTED_2,FAINT,DISABLED,LINE_STRONG,LINE,LINE_SOFT,GRID,ACCENT,ACCENT_STRONG,
ACCENT_MID,ACCENT_LINE,ACCENT_SOFT,ACCENT_TINT_2,ACCENT_TINT,ON_ACCENT,DANGER,RED,DANGER_LINE,DANGER_SOFT,DANGER_TINT,SUCCESS,SUCCESS_LINE,
SUCCESS_TINT,WARN,WARN_STRONG,WARN_MID,WARN_LINE,WARN_TINT,STAR,CAT_GREEN,CAT_AMBER,CAT_VIOLET,CAT_TEAL,CAT_PINK,BRAND,BRAND_EDGE,ON_BRAND;
// The short names the figures were written with: ink, grey outlines, red for trouble, blue for the path that works,
// light blue (LB) and light red (LR) box fills, and the filled blue (FB).
export{LINE_STRONG as GREY,ACCENT as BLUE,ACCENT_TINT as LB,DANGER_TINT as LR,ACCENT_SOFT as FB};
function set(t){({bg:BG,surface:SURFACE,"surface-2":SURFACE_2,ink:INK,"ink-2":INK_2,"ink-3":INK_3,muted:MUTED,"muted-2":MUTED_2,
faint:FAINT,disabled:DISABLED,"line-strong":LINE_STRONG,line:LINE,"line-soft":LINE_SOFT,grid:GRID,accent:ACCENT,
"accent-strong":ACCENT_STRONG,"accent-mid":ACCENT_MID,"accent-line":ACCENT_LINE,"accent-soft":ACCENT_SOFT,"accent-tint-2":ACCENT_TINT_2,
"accent-tint":ACCENT_TINT,"on-accent":ON_ACCENT,danger:DANGER,red:RED,"danger-line":DANGER_LINE,"danger-soft":DANGER_SOFT,
"danger-tint":DANGER_TINT,success:SUCCESS,"success-line":SUCCESS_LINE,"success-tint":SUCCESS_TINT,warn:WARN,"warn-strong":WARN_STRONG,"warn-mid":WARN_MID,
"warn-line":WARN_LINE,"warn-tint":WARN_TINT,star:STAR,"cat-green":CAT_GREEN,"cat-amber":CAT_AMBER,"cat-violet":CAT_VIOLET,
"cat-teal":CAT_TEAL,"cat-pink":CAT_PINK,brand:BRAND,"brand-edge":BRAND_EDGE,"on-brand":ON_BRAND}=t)}
set(TOKENS);
// Read the current values of every token from the page (call after the theme changes). Missing ones keep the default.
export function readTokens(el=typeof document!=="undefined"?document.documentElement:null){
  if(!el||typeof getComputedStyle!=="function")return;const cs=getComputedStyle(el),t={};
  for(const k in TOKENS)t[k]=cs.getPropertyValue("--"+k).trim()||TOKENS[k];set(t);
}
