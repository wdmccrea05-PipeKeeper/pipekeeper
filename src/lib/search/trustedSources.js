/**
 * trustedSources.js
 *
 * Defines the trust hierarchy for search sources used across Quick Add and
 * image suggestion flows for bottles (whiskey), tobacco blends, and pipes.
 *
 * Tier 1 — official / authoritative (distillery, brand, manufacturer pages)
 * Tier 2 — trusted specialty databases and retailers
 * Tier 3 — broader retail / discovery
 * Tier 4 — generic fallback
 *
 * isInternational: true when the source is non-US-centric and serves global
 * inventory well (Scotch, Japanese, Irish, Indian, Australian whiskies, etc.).
 */

export const TRUSTED_DOMAINS = {
  // ── Whiskey — Tier 2: trusted international databases & specialty retailers ──
  'whiskybase.com':          { tier: 2, type: 'database',  entityTypes: ['bottle'], isInternational: true },
  'masterofmalt.com':        { tier: 2, type: 'retailer',  entityTypes: ['bottle'], isInternational: true },
  'thewhiskyexchange.com':   { tier: 2, type: 'retailer',  entityTypes: ['bottle'], isInternational: true },
  'whiskyauctioneer.com':    { tier: 2, type: 'retailer',  entityTypes: ['bottle'], isInternational: true },
  'dekanta.com':             { tier: 2, type: 'retailer',  entityTypes: ['bottle'], isInternational: true },
  'finedrams.com':           { tier: 2, type: 'retailer',  entityTypes: ['bottle'], isInternational: true },
  'nickollsandperks.co.uk':  { tier: 2, type: 'retailer',  entityTypes: ['bottle'], isInternational: true },
  'royalmilewhiskies.com':   { tier: 2, type: 'retailer',  entityTypes: ['bottle'], isInternational: true },
  'hardtofindwhisky.com':    { tier: 2, type: 'retailer',  entityTypes: ['bottle'], isInternational: true },
  'totalwine.com':           { tier: 2, type: 'retailer',  entityTypes: ['bottle'], isInternational: false },
  'reservebar.com':          { tier: 2, type: 'retailer',  entityTypes: ['bottle'], isInternational: false },
  'klwines.com':             { tier: 2, type: 'retailer',  entityTypes: ['bottle'], isInternational: false },
  'astorwines.com':          { tier: 2, type: 'retailer',  entityTypes: ['bottle'], isInternational: false },

  // ── Whiskey — Tier 3: broader retail / discovery ─────────────────────────────
  'wine-searcher.com':       { tier: 3, type: 'database',  entityTypes: ['bottle'], isInternational: true },
  'drizly.com':              { tier: 3, type: 'retailer',  entityTypes: ['bottle'], isInternational: false },
  'binnys.com':              { tier: 3, type: 'retailer',  entityTypes: ['bottle'], isInternational: false },

  // ── Tobacco blends — Tier 1: manufacturer/official ────────────────────────────
  'cornellanddiehl.com':     { tier: 1, type: 'official',  entityTypes: ['blend'], isInternational: false },
  'samualgawith.com':        { tier: 1, type: 'official',  entityTypes: ['blend'], isInternational: true },
  'gawith-hoggarth.co.uk':   { tier: 1, type: 'official',  entityTypes: ['blend'], isInternational: true },
  'petersontobacco.com':     { tier: 1, type: 'official',  entityTypes: ['blend'], isInternational: true },
  'glpease.com':             { tier: 1, type: 'official',  entityTypes: ['blend'], isInternational: false },
  'sutliff.com':             { tier: 1, type: 'official',  entityTypes: ['blend'], isInternational: false },
  'stg-tobacco.com':         { tier: 1, type: 'official',  entityTypes: ['blend'], isInternational: true },
  'macbaren.com':            { tier: 1, type: 'official',  entityTypes: ['blend'], isInternational: true },

  // ── Tobacco blends — Tier 2: trusted retailers / databases ───────────────────
  'smokingpipes.com':        { tier: 2, type: 'retailer',  entityTypes: ['blend', 'pipe'], isInternational: false },
  'pipesandcigars.com':      { tier: 2, type: 'retailer',  entityTypes: ['blend', 'pipe'], isInternational: false },
  'cupojoes.com':            { tier: 2, type: 'retailer',  entityTypes: ['blend', 'pipe'], isInternational: false },
  'tobaccopipes.com':        { tier: 2, type: 'retailer',  entityTypes: ['blend', 'pipe'], isInternational: false },
  'tobaccoreviews.com':      { tier: 2, type: 'database',  entityTypes: ['blend'],          isInternational: false },
  '4noggins.com':            { tier: 2, type: 'retailer',  entityTypes: ['blend'],          isInternational: false },
  'iwan-ries.com':           { tier: 2, type: 'retailer',  entityTypes: ['blend', 'pipe'], isInternational: false },

  // ── Pipes — Tier 2: trusted retailers / archives ─────────────────────────────
  'pipedia.org':             { tier: 2, type: 'database',  entityTypes: ['pipe'], isInternational: true },
  'savinelli.com':           { tier: 1, type: 'official',  entityTypes: ['pipe'], isInternational: true },
  'petersonsmoking.com':     { tier: 1, type: 'official',  entityTypes: ['pipe'], isInternational: true },
  'dunhillpipes.com':        { tier: 1, type: 'official',  entityTypes: ['pipe'], isInternational: true },
  'castello.it':             { tier: 1, type: 'official',  entityTypes: ['pipe'], isInternational: true },
  'charatanpipes.com':       { tier: 1, type: 'official',  entityTypes: ['pipe'], isInternational: true },
};

/**
 * Look up domain metadata from a URL or bare domain string.
 * Falls back to a tier 4 generic entry when the domain is unknown.
 */
export function getDomainInfo(urlOrDomain) {
  if (!urlOrDomain) return { tier: 4, type: 'generic', isInternational: false };

  const cleaned = urlOrDomain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .toLowerCase();

  if (TRUSTED_DOMAINS[cleaned]) return TRUSTED_DOMAINS[cleaned];

  // Partial suffix match (e.g. 'shop.masterofmalt.com' → 'masterofmalt.com')
  for (const [domain, info] of Object.entries(TRUSTED_DOMAINS)) {
    if (cleaned.endsWith(domain)) return info;
  }

  return { tier: 4, type: 'generic', isInternational: false };
}

/**
 * Source trust bonus points used in confidence scoring.
 * These map to the spec: tier1=+25, tier2=+18, tier3=+10, tier4=+3.
 */
export const TIER_WEIGHTS = { 1: 25, 2: 18, 3: 10, 4: 3 };

/**
 * Known non-US country/region keywords that trigger the international-relevance
 * bonus in confidence scoring.
 */
export const INTERNATIONAL_REGION_KEYWORDS = [
  // Scotch
  'scotch', 'scotland', 'scottish', 'islay', 'speyside', 'highland', 'lowland',
  'campbeltown', 'orkney',
  // Irish
  'irish', 'ireland',
  // Japanese
  'japanese', 'japan', 'nikka', 'suntory', 'mars', 'chichibu', 'kavalan', 'taiwan',
  // Indian / other Asian
  'india', 'indian', 'amrut', 'paul john', 'rampur',
  // Australian
  'australia', 'australian', 'lark', 'sullivans cove',
  // European whisky
  'swedish', 'sweden', 'mackmyra', 'english', 'welsh', 'france', 'french',
  // World blends / tobacco
  'danish', 'germany', 'german', 'dutch',
];

/**
 * Given a result object, detect whether it describes a non-US product based
 * on known region/country fields or keywords in the title/name.
 */
export function isInternationalProduct(result) {
  const haystack = [
    result.country,
    result.countryHint,
    result.region,
    result.regionHint,
    result.title,
    result.name,
    result.subtitle,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return INTERNATIONAL_REGION_KEYWORDS.some((kw) => haystack.includes(kw));
}
