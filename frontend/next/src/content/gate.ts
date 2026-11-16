import { useContent } from "./ContentProvider";
import { useAccount } from "@/components/SignIn";

// Who may open what, as on tech.katta.cc (account.pageLock / previewLock in the site copy): signed out, lists are
// open, a lesson shows its opening (the same cut as the SEO pages) then a sign-in card, and the workspace and
// challenges ask to sign in first. Home, the landing, You, Privacy and Terms are always open. When sign-in is not
// available (the API is unreachable or does not accept this site), nothing is locked: there would be no way in.

export type Gate = "open" | "wait" | "preview" | "locked";
export type GateKind = "open" | "list" | "article" | "workspace";

export function gateFor(kind: GateKind, acc: { ready: boolean; enabled: boolean; user: unknown }, copy: { pageLock?: unknown; previewLock?: unknown } | undefined): Gate {
  if (kind === "open" || !copy?.pageLock) return "open";
  if (kind === "list" && copy.previewLock) return "open";
  if (!acc.ready) return "wait";
  if (!acc.enabled || acc.user) return "open";
  if (kind === "article" && copy.previewLock) return "preview";
  return "locked";
}

export function useGate(kind: GateKind): Gate {
  const { site } = useContent();
  const acc = useAccount();
  return gateFor(kind, acc, site.account);
}
