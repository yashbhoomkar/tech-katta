import React from"react";
// Line icons drawn on a 20×20 grid (stand-ins for the Stitch mock's Material Symbols).
const ICON={problems:"M3.5 5.5l1.5 1.5 2.5-2.5M10 6h6.5M3.5 10.5l1.5 1.5 2.5-2.5M10 11h6.5M3.5 15.5h4M10 16h6.5","real-systems":"M3.5 3.5h13v5h-13zM3.5 11.5h13v5h-13zM6.5 6h2.5M6.5 14h2.5M13 6h.5M13 14h.5",concepts:"M3 4.5h5.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 0-1.5-1.5H3zM17 4.5h-5.5A1.5 1.5 0 0 0 10 6v10a1.5 1.5 0 0 1 1.5-1.5H17z",components:"M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z","interview-questions":"M5 3.5h10v13H5zM7.5 7h5M7.5 10h5M7.5 13h3","quick-notes":"M4 5h9M4 9h7M4 13h4M15.5 8.5l2 2-6 6H9.5v-2z",menu:"M3 5h14M3 10h14M3 15h14",collapse:"M3 4h14v12H3zM8 4v12M14 8l-2 2 2 2",close:"M5 5l10 10M15 5L5 15",back:"M12 5l-5 5 5 5"};
// Section marks (tech-katta-context 24, G4), drawn from the figures' parts: boxes, a line, and the request dot, which
// turns marigold on the current section (shell.css). Concepts: a box sending a request; Components: stacked parts;
// Interview Questions: a box and a question; Quick Notes: a page with a folded corner; Real systems: a request between
// two boxes; Problems: a tick in a box.
const MARK={concepts:{d:"M2.5 6.5h7v7h-7zM9.5 10h7.5M14.5 7.5l2.5 2.5-2.5 2.5",dot:[13,10]},components:{d:"M4 3h12v3.5H4zM4 8.25h12v3.5H4zM4 13.5h12V17H4z",dot:[6.5,10]},
"interview-questions":{d:"M3 3.5h14v13H3zM8 8a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9V12",dot:[10,14]},"quick-notes":{d:"M5 2.5h7l3 3v12H5zM12 2.5v3h3M7.5 9.5h5M7.5 12.5h3",dot:[12.5,15]},
"real-systems":{d:"M1.5 7h6v6h-6zM12.5 7h6v6h-6zM7.5 10h5",dot:[10,10]},problems:{d:"M3 3h14v14H3zM6.5 10.5l2.5 2.5 4.5-5"}};
export const Icon=({name})=>{const m=MARK[name];return <svg className={"ico"+(m?" ico-mark":"")} viewBox="0 0 20 20" aria-hidden="true"><path d={m?m.d:ICON[name]}/>{m?.dot&&<circle className="ico-dot" cx={m.dot[0]} cy={m.dot[1]} r="1.9"/>}</svg>};
