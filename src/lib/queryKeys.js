export const STALE_TIME = {
  COLLECTION: 30_000,
  SESSION_HISTORY: 60_000,
  HOMEPAGE: 30_000,
  INSIGHTS: 30_000,
};

export const QUERY_KEYS = {
  pipes: (email) => ['pipes', email],
  pipe: (id) => ['pipe', id],
  pipeSummary: (email) => ['pipes-summary', email],
  blends: (email, sortBy) => sortBy ? ['blends', email, sortBy] : ['blends', email],
  blendSummary: (email) => ['blends-summary', email],
  smokingLogs: (email) => ['smoking-logs', email],
  smokingLogsSummary: (email) => ['smoking-logs-summary', email],
  cellarLogs: (email) => ['cellar-logs-all', email],
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
