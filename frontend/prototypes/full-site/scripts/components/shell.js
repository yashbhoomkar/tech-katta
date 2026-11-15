// The app chrome around every page: picks the layout, highlights where you are in the sidebar and the tabs,
// fills the top bar and sets the window title. The router calls update() on every route change.
import { initSidebar } from "./sidebar.js";
import { initTopbar } from "./topbar.js";
import { initTabbar } from "./tabbar.js";

export function initShell() {
  const side = initSidebar(), top = initTopbar(), tabs = initTabbar();
  return {
    update(ctx, page) {
      document.body.dataset.layout = ctx.layout;
      side.setActive(ctx.nav);
      tabs.setActive(ctx.tab);
      top.update(ctx, page);
      const t = page.title?.(ctx);
      document.title = t ? `${t} · Tech Katta` : "Tech Katta · System design, explained";
    },
  };
}
