export const STALE_TIME = {
  COLLECTION: 30_000,
  SESSION_HISTORY: 60_000,
  HOMEPAGE: 30_000,
};

export const QUERY_KEYS = {
  wines: (email) => ['wines', email],
  wine: (id) => ['wine', id],
  wineTastings: (wineId) => ['wine-tastings', wineId],
  wineTastingsSummary: (email) => ['wine-tastings-summary', email],
  bottles: (email) => ['bottles', email],
  whiskeyInventory: (email) => ['whiskey-inventory', email],
  cigars: (email) => ['cigars', email],
  cigarSessions: (email) => ['cigar-sessions', email],
  cigarSessionsById: (id, email) => ['cigar-sessions', id, email],
  humidors: (email) => ['humidors', email],
};
