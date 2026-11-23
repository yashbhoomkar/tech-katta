// The production build's flag (VITE_SITE3D=1): the 3D site (frontend/site3d) answers at the landing, /home, Learn and
// /simulator, and this app keeps the rest (app/router.tsx). Its navigation then uses the 3D site's names: the page at
// /home is the "Dashboard", and the 3D Simulator is listed beside the Problems.
export const SITE3D = import.meta.env.VITE_SITE3D === "1";
/** the name of the page at /home */
export const HOME_NAME = SITE3D ? "Dashboard" : "Home";
