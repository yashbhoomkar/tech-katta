import type { Page } from "@playwright/test";

/** The lighter 3D the app already has (world.js, quality 2: no shadows, 30 fps; the key is what a slow device saves for itself). The heavy 3D specs check the design canvas, the replay and the
 *  touch targets, not the shadows: on a 2-core runner the full-quality software (swiftshader) drawing ate the CPU the test's own steps need and a crowded browser crashed. */
export const lite3d = (page: Page) => page.addInitScript(() => { try { localStorage.setItem("tk-r3d-q", "2"); } catch { /* blocked */ } });
