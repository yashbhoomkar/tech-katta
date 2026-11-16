// The new frontend's copies on prototype.katta.cc: /p/<name>/ → the look it is built in (VITE_STYLE; "" = default).
export const COPIES = { next: "", "neo-brutalism": "neo-brutalism" };

/** Why next/dist cannot be copied to /p/<name>/, or null when it can: it must be built for that address
 *  (BASE_PATH=/p/<name>/) and in that copy's look. */
export function copyProblem(html, name) {
  if (!(name in COPIES)) return `unknown copy "${name}" (known: ${Object.keys(COPIES).join(", ")})`;
  if (!html.includes(`/p/${name}/assets/`)) return `next/dist was not built with BASE_PATH=/p/${name}/`;
  const look = COPIES[name];
  if (look ? !html.includes(`data-style="${look}"`) : html.includes("data-style=")) return `next/dist was built with the wrong VITE_STYLE for /p/${name}/`;
  return null;
}
