// Workaround for createPageUrl bug that lowercases query strings
// This preserves case-sensitive IDs and tokens in query parameters
// BUG REPORTED TO BASE44: Platform's createPageUrl lowercases entire URL including query params

export function createPageUrl(pageName) {
  // Only slugify the path part; keep query string intact (ids/tokens can be case-sensitive)
  const [rawPath, rawQuery] = pageName.split('?');
  const path = '/' + rawPath.toLowerCase().replace(/ /g, '-');
  return rawQuery ? `${path}?${rawQuery}` : path;
}