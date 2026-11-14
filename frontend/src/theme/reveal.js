// Scroll reveals (tech-katta-context 32 §5, from the design skills): blocks below the fold rise 32 px and fade in over
// 700 ms on the site's one curve the first time they come into view, then stay put (scrolling back up never replays
// them). One IntersectionObserver for the whole page, no scroll listener, no library.
//
// What reveals: anything with [data-reveal], plus the long lists named in AUTO below. Siblings that arrive together
// follow each other 60 ms apart (at most 400 ms in all).
//
// Safety: the hidden state only exists under <html class="tk-reveal">, which this file adds only when the browser has
// IntersectionObserver and the visitor has not asked for reduced motion. Without JavaScript, without the observer, or
// with reduced motion, everything is simply shown. Anything already on screen or above it when found is shown at once.
export const AUTO=[
  "[data-reveal]",
  // the dashboard's long lists: cards past the first eight (the first eight arrive with the page, theme/motion.css)
  ":is(.d-list,.cards)>:nth-child(n+9)",
  ".d-group>h2",".d-group>p",
].join(",");
const STEP=60,CAP=400;
export function startReveal(doc=typeof document!=="undefined"?document:null){
  if(!doc||typeof IntersectionObserver!=="function"||typeof MutationObserver!=="function")return()=>{};
  if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)return()=>{};
  const root=doc.documentElement;root.classList.add("tk-reveal");
  const seen=new WeakSet();let batch=[],timer=0;
  const show=el=>{el.classList.add("is-in");io.unobserve(el)};
  // Items arriving in the same frame stagger in reading order.
  const flush=()=>{timer=0;batch.sort((a,b)=>a.top-b.top||a.left-b.left).forEach(({el},i)=>{el.style.setProperty("--reveal-delay",Math.min(i*STEP,CAP)+"ms");show(el)});batch=[]};
  const io=new IntersectionObserver(entries=>{for(const e of entries){
    if(e.isIntersecting){batch.push({el:e.target,top:e.boundingClientRect.top,left:e.boundingClientRect.left})}
    else if(e.boundingClientRect.bottom<0)show(e.target)}  // already scrolled past (an anchor link, a reload mid-page)
    if(batch.length&&!timer)timer=requestAnimationFrame(flush)},{rootMargin:"0px 0px -8% 0px",threshold:0});
  const scan=()=>{for(const el of doc.querySelectorAll(AUTO))if(!seen.has(el)){seen.add(el);io.observe(el)}};
  scan();
  // React draws after this runs and pages change without a reload: watch for new blocks (batched to one scan a frame).
  let queued=0;const mo=new MutationObserver(()=>{if(!queued)queued=requestAnimationFrame(()=>{queued=0;scan()})});
  mo.observe(doc.body,{childList:true,subtree:true});
  return()=>{mo.disconnect();io.disconnect();root.classList.remove("tk-reveal")};
}
