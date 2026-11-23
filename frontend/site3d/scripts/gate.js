// Who may open what (a port of next/src/content/gate.ts; site3d/test/gate.test.js has its cases). Signed out, lists are
// open, a lesson shows its opening then a sign-in card, and the workspace and challenges ask to sign in first. Home,
// the landing, You, Privacy and Terms are always open. When sign-in is not available (the API cannot be reached or does
// not accept this site), or the site copy could not be fetched, nothing is locked: there would be no way in.
// Pure: pages/gating.js holds the account and the copy.

/** "open" | "wait" (the account is not known yet) | "preview" | "locked" */
export function gateFor(kind, acc, copy) {
  if (kind === 'open' || !copy?.pageLock) return 'open';
  if (kind === 'list' && copy.previewLock) return 'open';
  if (!acc.ready) return 'wait';
  if (!acc.enabled || acc.user) return 'open';
  if (kind === 'article' && copy.previewLock) return 'preview';
  return 'locked';
}
