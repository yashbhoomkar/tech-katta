// Stands in for src/theme/mode.js in the 3D bridge build: account.js only asks which theme is showing (to colour the
// Google button), and the real module would pull React into a page that has none. The 3D shell sets <html data-theme>.
export const current = () => (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
