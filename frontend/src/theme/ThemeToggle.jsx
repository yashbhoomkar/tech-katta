// The light/dark switch in the page headers. It shows what a press changes to (a moon in light, a sun in dark).
// Icons: Phosphor (theme/icons.jsx, spec 32).
import React from"react";import{toggleTheme,useTheme}from"./mode.js";import{Ph}from"./icons.jsx";import"./toggle.css";
export default function ThemeToggle({className=""}){const t=useTheme(),to=t==="dark"?"light":"dark";
return <button type="button" className={"theme-btn "+className} onClick={toggleTheme} aria-label={`Switch to ${to} mode`} title={`Switch to ${to} mode`}><Ph name={to==="dark"?"moon":"sun"}/></button>}
