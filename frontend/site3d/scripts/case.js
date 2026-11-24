// Normal case for a label whose source text is in capitals (the API's eyebrows and statuses: "QUICK NOTES", "TERMS", "DRAFT"):
// "Quick Notes", "Terms", "Draft". Articles and problems already use normal case ("Concept 01 · Core"), so the labels match.
/** "QUICK NOTES" → "Quick Notes"; text that is not all capitals is left as it is */
export const normalCase = (s = '') => (s && s === s.toUpperCase() && /[A-Z]/.test(s) ? s.toLowerCase().replace(/(^|[\s—–-])([a-z])/g, (m, a, b) => a + b.toUpperCase()) : s);
