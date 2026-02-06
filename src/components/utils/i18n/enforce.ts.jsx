export const PLACEHOLDER_EXACT = new Set([
  "Title",
  "Subtitle",
  "Optional",
  "Description",
  "Desc",
  "Placeholder",
  "Label",
  "Page Title",
  "Page Subtitle",
]);

export function isHardcodedCandidate(s: unknown) {
  if (typeof s !== "string") return false;
  const v = s.trim();
  if (!v) return false;
  if (PLACEHOLDER_EXACT.has(v)) return true;
  // looks like UI text (not IDs)
  if (v.length >= 3 && /[A-Za-z]/.test(v) && !/^[A-Z0-9_-]{6,}$/.test(v)) return true;
  return false;
}

export function warnIfPlaceholder(text: any, context?: string) {
  if (typeof text !== "string") return;
  const v = text.trim();
  if (PLACEHOLDER_EXACT.has(v)) {
    console.warn("[i18n] Placeholder leaked to UI:", { text: v, context });
  }
}