import type { ReactNode } from "react";
import { CommandPaletteProvider } from "@/components/CommandPalette";
import { ContentProvider } from "@/content/ContentProvider";

/** Everything app-wide, in dependency order (the palette searches the content). Inside the router, because the
 *  palette navigates. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ContentProvider>
      <CommandPaletteProvider>{children}</CommandPaletteProvider>
    </ContentProvider>
  );
}
