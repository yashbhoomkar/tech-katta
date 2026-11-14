// The light/dark switch in the page headers. It shows what a press changes to (a moon in light, a sun in dark).
import React from"react";import{toggleTheme,useTheme}from"./mode.js";import"./toggle.css";
export default function ThemeToggle({className=""}){const t=useTheme(),to=t==="dark"?"light":"dark";
return <button type="button" className={"theme-btn "+className} onClick={toggleTheme} aria-label={`Switch to ${to} mode`} title={`Switch to ${to} mode`}>
<svg viewBox="0 0 20 20" aria-hidden="true">{to==="dark"?<path d="M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8z"/>:<><circle cx="10" cy="10" r="3.5"/><path d="M10 1.5v2.5M10 16v2.5M1.5 10H4M16 10h2.5M4 4l1.8 1.8M14.2 14.2L16 16M4 16l1.8-1.8M14.2 5.8L16 4"/></>}</svg></button>}
