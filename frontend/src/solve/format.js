// Number, time and label formats shared by the workspace.
export const fmt=n=>Math.round(n).toLocaleString("en-US");
export const pct=n=>(n>=99.99?n.toFixed(3):n>=99?n.toFixed(2):n.toFixed(1)).replace(/\.?0+$/,"")+"%";
export const when=t=>new Date(t).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
export const STEPS={requirements:"Requirements",estimates:"Estimates",api:"API",design:"Design",deep:"Deep dive"};
export const clockOf=m=>{const x=((Math.round(m)%1440)+1440)%1440,h=Math.floor(x/60);return `${h%12||12}:${String(x%60).padStart(2,"0")} ${h<12?"am":"pm"}`};
