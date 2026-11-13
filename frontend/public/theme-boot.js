// Runs before the page draws (a plain script in <head>): light or dark from the visitor's choice (tk-theme),
// otherwise dark: the site is dark first (owner, 2026-11-13, spec 26), and light is a choice made with the theme button. The rest lives in src/theme/mode.js.
(function(){var t=null;try{t=localStorage.getItem("tk-theme")}catch(e){}if(t!=="light"&&t!=="dark")t="dark";document.documentElement.setAttribute("data-theme",t)})();
