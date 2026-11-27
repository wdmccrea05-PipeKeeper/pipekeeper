/**
 * Navigation continuity.
 *
 * A collector who opens Collection Health from a report should come back to the
 * same report, with the same filters, at the same place. The origin travels in
 * the URL, so it survives a refresh, and the scroll position is remembered per
 * route in session storage.
 */

export const RETURN_ORIGINS = {
  hub: { label: 'Collection hub', to: '/CollectionHub' },
  reporting: { label: 'Reporting Center', to: '/ReportingCenter' },
  valuation: { label: 'Valuation Center', to: '/ValuationCenter' },
  curator: { label: 'Curator', to: '/Curator' },
  pipekeeper: { label: 'PipeKeeper', to: '/PipeKeeper' },
  cigarkeeper: { label: 'CigarKeeper', to: '/CigarKeeper' },
  whiskeykeeper: { label: 'WhiskeyKeeper', to: '/WhiskeyKeeper' },
  winekeeper: { label: 'WineKeeper', to: '/WineKeeper' },
};

/** The Collection Health URL, carrying the filters the origin was looking at. */
export function healthUrl({ module, type, origin, report } = {}) {
  const params = new URLSearchParams();
  if (module) params.set('module', module);
  if (type) params.set('type', type);
  if (origin) params.set('origin', origin);
  if (report) params.set('report', report);
  const query = params.toString();
  return query ? `/CollectionHealth?${query}` : '/CollectionHealth';
}

/** Where "Back to …" goes, with the origin's own filters restored. */
export function resolveReturn(origin, params = {}) {
  const entry = RETURN_ORIGINS[origin];
  if (!entry) return null;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, String(value));
  }
  const query = search.toString();
  return { label: entry.label, to: query ? `${entry.to}?${query}` : entry.to };
}

const SCROLL_PREFIX = 'ck:scroll:';

function scroller() {
  if (typeof document === 'undefined') return null;
  return document.querySelector('main') || document.scrollingElement;
}

export function saveScrollPosition(key) {
  if (!key || typeof window === 'undefined') return;
  const element = scroller();
  if (!element) return;
  try {
    window.sessionStorage.setItem(`${SCROLL_PREFIX}${key}`, String(element.scrollTop || 0));
  } catch {
    // Storage can be unavailable; the page still works without it.
  }
}

export function restoreScrollPosition(key) {
  if (!key || typeof window === 'undefined') return;
  let stored = null;
  try {
    stored = window.sessionStorage.getItem(`${SCROLL_PREFIX}${key}`);
  } catch {
    stored = null;
  }
  if (!stored) return;
  const element = scroller();
  if (!element) return;
  requestAnimationFrame(() => {
    element.scrollTop = Number(stored) || 0;
  });
}