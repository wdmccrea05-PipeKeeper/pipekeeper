// Base44-compatible URL builder
// IMPORTANT: Does NOT lowercase page names - must match exact filename casing

export function createPageUrl(pageName) {
  const [page, query] = pageName.split('?');
  return query ? `/${page}?${query}` : `/${page}`;
}