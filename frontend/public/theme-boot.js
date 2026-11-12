// Runs before the page draws (a plain script in <head>): light or dark from the visitor's choice (tk-theme),
// otherwise the device's setting. The rest lives in src/theme/mode.js.
(function(){var t=null;try{t=localStorage.getItem("tk-theme")}catch(e){}if(t!=="light"&&t!=="dark")t=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)})();
