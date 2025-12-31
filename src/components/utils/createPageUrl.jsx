// Canonical createPageUrl that:
// 1. Lowercases the page name to match Base44's file-based routing
// 2. Preserves case in query parameters (for IDs, tokens, etc.)

export function createPageUrl(pageName) {
  const [rawPath, rawQuery] = pageName.split('?');
  const path = '/' + rawPath.toLowerCase().replace(/ /g, '-');
  return rawQuery ? `${path}?${rawQuery}` : path;
}