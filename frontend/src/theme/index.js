// The site's look: typefaces, design tokens (colours, type, radius, shadows, motion), the base rules every page
// shares, and light or dark. Each page (main.jsx, dashboard.jsx, admin.jsx) imports this first, then its own
// stylesheet. To change the look, edit tokens.css; README.md in this folder says where everything else lives.
import"./fonts.js";import"./tokens.css";import"./base.css";import"./motion.css";import"./premium.css";import{startTheme}from"./mode.js";import{startReveal}from"./reveal.js";
startTheme();startReveal();
