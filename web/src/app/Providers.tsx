import type { ReactNode } from "react";
import { CommandPaletteProvider } from "@/components/CommandPalette";
import { ContentProvider } from "@/content/ContentProvider";
import { SignInProvider } from "@/components/SignIn";
import { ToastProvider } from "@/components/Toast";
import { Shortcuts } from "@/components/Shortcuts";

/** Everything app-wide, in dependency order (the palette searches the content). Inside the router, because the
 *  palette navigates. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ContentProvider>
      <ToastProvider>
        <SignInProvider>
          <CommandPaletteProvider>
            {children}
            <Shortcuts />
          </CommandPaletteProvider>
        </SignInProvider>
      </ToastProvider>
    </ContentProvider>
  );
}
