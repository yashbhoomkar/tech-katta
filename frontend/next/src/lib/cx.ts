/** Joins class names, skipping empty ones. Also turns CSS-module lookups (typed string | undefined) into a string. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
