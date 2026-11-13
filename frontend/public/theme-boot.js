// Runs before the page draws (a plain script in <head>): light or dark from the visitor's choice (tk-theme),
// otherwise light, the warm white paper (owner, 2026-11-13, spec 28: Katta Paper colours back); dark is a choice made with the theme button. The rest lives in src/theme/mode.js.
(function(){var t=null;try{t=localStorage.getItem("tk-theme")}catch(e){}if(t!=="light"&&t!=="dark")t="light";document.documentElement.setAttribute("data-theme",t)})();
