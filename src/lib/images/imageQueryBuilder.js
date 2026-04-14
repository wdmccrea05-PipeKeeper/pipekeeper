/**
 * imageQueryBuilder.js
 *
 * Builds multiple query variants per entity type for use in image search.
 *
 * Each entity type gets 6 primary queries plus domain-constrained variants
 * for Tier 1 (official) and Tier 2 (trusted retailer) sources.
 */

import { BOTTLE_TIER2_DOMAINS, BLEND_TIER2_DOMAINS, PIPE_TIER2_DOMAINS } from './trustedImageSources.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function compact(...parts) {
  return parts.filter(Boolean).join(' ').trim();
}

function domainSiteFilter(domains) {
  return domains.map((d) => `site:${d}`).join(' OR ');
}

// ── Bottle queries ────────────────────────────────────────────────────────────

/**
 * Generate all query variants for a spirits bottle.
 *
 * @param {string} name       - Bottle / expression name
 * @param {string} distillery - Distillery or brand
 * @param {string} [type]     - Whiskey type (single malt, bourbon, etc.)
 * @param {string} [region]   - Region (Islay, Speyside, etc.)
 * @param {string} [country]  - Country of origin
 * @returns {{ primary: string[], tier2: string }}
 */
export function buildBottleImageQueries(name, distillery, type, region, country) {
  const base = compact(distillery, name);
  if (!base) return { primary: [], tier2: '' };

  const primary = [
    `${base} bottle front`,
    `${base} whisky bottle`,
    `${base} official`,
    `${base} product image`,
    `${base} label`,
    `${base} retailer`,
  ];

  if (region)  primary.push(`${base} ${region}`);
  if (country) primary.push(`${base} ${country}`);
  if (type)    primary.push(`${base} ${type}`);

  const tier2 = `${base} (${domainSiteFilter(BOTTLE_TIER2_DOMAINS)})`;

  return { primary: [...new Set(primary.filter(Boolean))], tier2 };
}

// ── Blend queries ─────────────────────────────────────────────────────────────

/**
 * Generate all query variants for a tobacco blend.
 *
 * @param {string} name         - Blend name
 * @param {string} manufacturer - Manufacturer / brand
 * @returns {{ primary: string[], tier2: string }}
 */
export function buildBlendImageQueries(name, manufacturer) {
  const base = compact(manufacturer, name);
  if (!base) return { primary: [], tier2: '' };

  const primary = [
    `${base} tin label`,
    `${base} tobacco tin`,
    `${base} official`,
    `${base} product image`,
    `${base} smokingpipes`,
    `${base} pouch label`,
  ];

  const tier2 = `${base} (${domainSiteFilter(BLEND_TIER2_DOMAINS)})`;

  return { primary: [...new Set(primary.filter(Boolean))], tier2 };
}

// ── Pipe queries ──────────────────────────────────────────────────────────────

/**
 * Generate all query variants for a tobacco pipe.
 *
 * @param {string} maker  - Pipe maker / artisan
 * @param {string} model  - Model name
 * @param {string} shape  - Shape (billiard, dublin, etc.)
 * @returns {{ primary: string[], tier2: string }}
 */
export function buildPipeImageQueries(maker, model, shape) {
  if (!maker && !model && !shape) return { primary: [], tier2: '' };

  const primary = [
    compact(maker, model, shape, 'pipe'),
    compact(maker, model, 'pipe'),
    compact(maker, shape, 'pipe'),
    compact(maker, 'pipe official'),
    compact(maker, 'pipe retailer'),
    compact(maker, 'stamping pipe'),
  ];

  if (model && shape) {
    primary.push(compact(maker, model, shape));
  }

  const tier2 = `${compact(maker, model || shape)} pipe (${domainSiteFilter(PIPE_TIER2_DOMAINS)})`;

  return { primary: [...new Set(primary.filter(Boolean))], tier2 };
}

// ── Generic dispatcher ────────────────────────────────────────────────────────

/**
 * Build image query variants for any supported entity type.
 *
 * @param {'bottle'|'blend'|'pipe'} entityType
 * @param {Object} fields
 * @param {string} [fields.name]
 * @param {string} [fields.distillery]
 * @param {string} [fields.maker]
 * @param {string} [fields.manufacturer]
 * @param {string} [fields.region]
 * @param {string} [fields.country]
 * @param {string} [fields.shape]
 * @returns {{ primary: string[], tier2: string }}
 */
export function buildImageQueries(entityType, fields = {}) {
  const { name, distillery, maker, manufacturer, region, country, shape } = fields;

  if (entityType === 'bottle') {
    return buildBottleImageQueries(name, distillery, null, region, country);
  }

  if (entityType === 'blend') {
    return buildBlendImageQueries(name, manufacturer);
  }

  if (entityType === 'pipe') {
    return buildPipeImageQueries(maker, name, shape);
  }

  // Generic fallback
  const base = compact(name);
  return { primary: base ? [base, `${base} product image`] : [], tier2: '' };
}
