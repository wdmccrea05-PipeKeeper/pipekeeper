/**
 * trustedImageSources.js
 *
 * Defines trusted source groups by entity type (bottle / blend / pipe).
 *
 * Tier 1 — official brand / distillery / manufacturer sites.
 *           These are domain-agnostic because they vary per product; the LLM
 *           prompt includes a note to prioritise official pages.
 *
 * Tier 2 — trusted specialty retailers, databases, and reference archives
 *           that reliably host product images.
 *
 * The TRUSTED_IMAGE_DOMAINS map mirrors the quick-add trustedSources.js
 * format but is extended with the richer metadata required by the image
 * pipeline (entityType, imageUrlPattern, referenceOnly).
 */

// ── Bottle (whiskey / spirits) ────────────────────────────────────────────────

export const BOTTLE_TIER2_DOMAINS = [
  'whiskybase.com',
  'masterofmalt.com',
  'thewhiskyexchange.com',
  'finedrams.com',
  'dekanta.com',
  'nickollsandperks.co.uk',
  'royalmilewhiskies.com',
  'hardtofindwhisky.com',
  'totalwine.com',
  'reservebar.com',
  'astorwines.com',
];

// ── Blend (tobacco) ───────────────────────────────────────────────────────────

export const BLEND_TIER2_DOMAINS = [
  'smokingpipes.com',
  'pipesandcigars.com',
  'tobaccopipes.com',
  'cupojoes.com',
  '4noggins.com',
  'tobaccoreviews.com',
  'iwan-ries.com',
];

// ── Pipe ──────────────────────────────────────────────────────────────────────

export const PIPE_TIER2_DOMAINS = [
  'smokingpipes.com',
  'alpascia.com',
  'danpipe.de',
  'pipedia.org',
  'pipesandcigars.com',
  'tobaccopipes.com',
  'iwan-ries.com',
];

// ── Combined domain metadata map ──────────────────────────────────────────────

/**
 * Full metadata for all known trusted image source domains.
 *
 * referenceOnly: true → results from this domain are labeled "Reference Image"
 *                       even when other confidence signals are high.
 */
export const TRUSTED_IMAGE_DOMAINS = {
  // Whiskey — official tier 1 entries (examples; any official brand site is tier 1)
  'whisky.com':              { tier: 1, type: 'official',   entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },
  'ardbeg.com':              { tier: 1, type: 'official',   entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },
  'laphroaig.com':           { tier: 1, type: 'official',   entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },
  'glenfarclas.com':         { tier: 1, type: 'official',   entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },
  'buffalotrace.com':        { tier: 1, type: 'official',   entityTypes: ['bottle'],         isInternational: false, referenceOnly: false },
  'heavenhill.com':          { tier: 1, type: 'official',   entityTypes: ['bottle'],         isInternational: false, referenceOnly: false },
  'sazerac.com':             { tier: 1, type: 'official',   entityTypes: ['bottle'],         isInternational: false, referenceOnly: false },
  'bushmills.com':           { tier: 1, type: 'official',   entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },
  'nikka.com':               { tier: 1, type: 'official',   entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },

  // Whiskey — trusted international retailers/databases (tier 2)
  'whiskybase.com':          { tier: 2, type: 'database',  entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },
  'masterofmalt.com':        { tier: 2, type: 'retailer',  entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },
  'thewhiskyexchange.com':   { tier: 2, type: 'retailer',  entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },
  'finedrams.com':           { tier: 2, type: 'retailer',  entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },
  'dekanta.com':             { tier: 2, type: 'retailer',  entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },
  'nickollsandperks.co.uk':  { tier: 2, type: 'retailer',  entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },
  'royalmilewhiskies.com':   { tier: 2, type: 'retailer',  entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },
  'hardtofindwhisky.com':    { tier: 2, type: 'retailer',  entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },
  'totalwine.com':           { tier: 2, type: 'retailer',  entityTypes: ['bottle'],         isInternational: false, referenceOnly: false },
  'reservebar.com':          { tier: 2, type: 'retailer',  entityTypes: ['bottle'],         isInternational: false, referenceOnly: false },
  'astorwines.com':          { tier: 2, type: 'retailer',  entityTypes: ['bottle'],         isInternational: false, referenceOnly: false },
  'whiskyauctioneer.com':    { tier: 2, type: 'retailer',  entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },
  'wine-searcher.com':       { tier: 3, type: 'database',  entityTypes: ['bottle'],         isInternational: true,  referenceOnly: false },

  // Tobacco blends — official tier 1
  'cornellanddiehl.com':     { tier: 1, type: 'official',  entityTypes: ['blend'],          isInternational: false, referenceOnly: false },
  'samuelgawith.com':        { tier: 1, type: 'official',  entityTypes: ['blend'],          isInternational: true,  referenceOnly: false },
  'gawith-hoggarth.co.uk':   { tier: 1, type: 'official',  entityTypes: ['blend'],          isInternational: true,  referenceOnly: false },
  'petersontobacco.com':     { tier: 1, type: 'official',  entityTypes: ['blend'],          isInternational: true,  referenceOnly: false },
  'glpease.com':             { tier: 1, type: 'official',  entityTypes: ['blend'],          isInternational: false, referenceOnly: false },
  'sutliff.com':             { tier: 1, type: 'official',  entityTypes: ['blend'],          isInternational: false, referenceOnly: false },
  'stg-tobacco.com':         { tier: 1, type: 'official',  entityTypes: ['blend'],          isInternational: true,  referenceOnly: false },
  'macbaren.com':            { tier: 1, type: 'official',  entityTypes: ['blend'],          isInternational: true,  referenceOnly: false },
  'stanleywhiffbog.com':     { tier: 1, type: 'official',  entityTypes: ['blend'],          isInternational: false, referenceOnly: false },
  'jfswatkins.com':          { tier: 1, type: 'official',  entityTypes: ['blend'],          isInternational: false, referenceOnly: false },
  'arangurengroup.com':      { tier: 1, type: 'official',  entityTypes: ['blend'],          isInternational: true,  referenceOnly: false },

  // Tobacco blends — trusted retailers/databases (tier 2)
  'smokingpipes.com':        { tier: 2, type: 'retailer',  entityTypes: ['blend', 'pipe'],  isInternational: false, referenceOnly: false },
  'pipesandcigars.com':      { tier: 2, type: 'retailer',  entityTypes: ['blend', 'pipe'],  isInternational: false, referenceOnly: false },
  'cupojoes.com':            { tier: 2, type: 'retailer',  entityTypes: ['blend', 'pipe'],  isInternational: false, referenceOnly: false },
  'tobaccopipes.com':        { tier: 2, type: 'retailer',  entityTypes: ['blend', 'pipe'],  isInternational: false, referenceOnly: false },
  'tobaccoreviews.com':      { tier: 2, type: 'database',  entityTypes: ['blend'],          isInternational: false, referenceOnly: false },
  '4noggins.com':            { tier: 2, type: 'retailer',  entityTypes: ['blend'],          isInternational: false, referenceOnly: false },
  'iwan-ries.com':           { tier: 2, type: 'retailer',  entityTypes: ['blend', 'pipe'],  isInternational: false, referenceOnly: false },

  // Pipes — official tier 1
  'savinelli.com':           { tier: 1, type: 'official',  entityTypes: ['pipe'],           isInternational: true,  referenceOnly: false },
  'petersonsmoking.com':     { tier: 1, type: 'official',  entityTypes: ['pipe'],           isInternational: true,  referenceOnly: false },
  'dunhillpipes.com':        { tier: 1, type: 'official',  entityTypes: ['pipe'],           isInternational: true,  referenceOnly: false },
  'castello.it':             { tier: 1, type: 'official',  entityTypes: ['pipe'],           isInternational: true,  referenceOnly: false },
  'charatanpipes.com':       { tier: 1, type: 'official',  entityTypes: ['pipe'],           isInternational: true,  referenceOnly: false },
  'bjarne.dk':               { tier: 1, type: 'official',  entityTypes: ['pipe'],           isInternational: true,  referenceOnly: false },

  // Pipes — trusted retailers/reference archives (tier 2)
  'pipedia.org':             { tier: 2, type: 'reference', entityTypes: ['pipe'],           isInternational: true,  referenceOnly: true  },
  'alpascia.com':            { tier: 2, type: 'retailer',  entityTypes: ['pipe'],           isInternational: true,  referenceOnly: false },
  'danpipe.de':              { tier: 2, type: 'retailer',  entityTypes: ['pipe'],           isInternational: true,  referenceOnly: false },
};

/**
 * Tier weights used in confidence scoring.
 * Mirrors the quick-add trustedSources values.
 */
export const TIER_WEIGHTS = { 1: 25, 2: 18, 3: 10, 4: 3 };

/**
 * Return metadata for a given domain string (or URL).
 * Returns a generic tier-4 fallback when domain is unknown.
 *
 * @param {string|null} urlOrDomain
 * @returns {{ tier: number, type: string, isInternational: boolean, referenceOnly: boolean }}
 */
export function getImageDomainInfo(urlOrDomain) {
  if (!urlOrDomain) return { tier: 4, type: 'fallback', isInternational: false, referenceOnly: false };

  const cleaned = urlOrDomain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .toLowerCase();

  if (TRUSTED_IMAGE_DOMAINS[cleaned]) return TRUSTED_IMAGE_DOMAINS[cleaned];

  // Partial suffix match (e.g. 'shop.masterofmalt.com' → 'masterofmalt.com')
  for (const [domain, info] of Object.entries(TRUSTED_IMAGE_DOMAINS)) {
    if (cleaned.endsWith(domain)) return info;
  }

  return { tier: 4, type: 'fallback', isInternational: false, referenceOnly: false };
}

/**
 * Return the tier-2 domain list for a given entity type.
 *
 * @param {'bottle'|'blend'|'pipe'} entityType
 * @returns {string[]}
 */
export function getTier2Domains(entityType) {
  if (entityType === 'bottle') return BOTTLE_TIER2_DOMAINS;
  if (entityType === 'blend')  return BLEND_TIER2_DOMAINS;
  if (entityType === 'pipe')   return PIPE_TIER2_DOMAINS;
  return [];
}
