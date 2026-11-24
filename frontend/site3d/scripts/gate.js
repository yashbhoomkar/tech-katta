// Who may open what (tech-katta-context 52; site3d/test/gate.test.js has its cases). Pure: gating.js holds the account.
//
//   "open"    the page needs no sign-in (the landing, lists, Terms, Privacy, not found), or the reader is signed in
//   "wait"    the account is not known yet (nothing locked is drawn until it is)
//   "preview" signed out: the page's public part (an article's opening, a problem's title and brief) and a sign-in card
//   "locked"  signed out: nothing personal; a sign-in card in place of the content (the Dashboard, You, a sandbox)
//
// Signing in being unavailable (the API cannot be reached or does not take sign-ins) never opens anything: the pages stay as
// they are signed out and their card says sign-in is unavailable. Only a local-development flag (devOpen) opens the pages.
//
// kind: "open" | "list" | "article" | "workspace" | "problem" | "personal"
export function gateFor(kind, acc, { devOpen = false } = {}) {
  if (kind === 'open' || kind === 'list') return 'open';
  if (devOpen) return 'open';
  if (!acc.ready) return 'wait';
  if (acc.user) return 'open';
  if (kind === 'article' || kind === 'problem') return 'preview';
  return 'locked'; // "personal" and "workspace" (the sandbox, a shared design)
}
