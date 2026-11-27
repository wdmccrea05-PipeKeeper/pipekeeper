/**
 * src/lib/collection/boundaries.js
 *
 * Canonical product-boundary policy for CollectionKeeper.
 *
 * CollectionKeeper is a collection management, documentation, education,
 * preservation and analytical platform. It does not promote or facilitate the
 * use, sale or acquisition of tobacco or alcohol products.
 *
 * Every surface that can generate language about items — Curator, reports,
 * interfaces, marketing copy, notifications — must be able to ask this module
 * whether a capability or a piece of copy is inside the product boundary,
 * instead of each surface carrying its own opinion.
 *
 * This module is intentionally dependency-free so it can be imported from
 * client components, shared libraries and tests without side effects.
 */

export const COLLECTION_INTELLIGENCE_VERSION = '2.0.0';

/**
 * Capabilities CollectionKeeper is allowed to provide.
 * These are the only lanes new work may extend.
 */
export const PERMITTED_CAPABILITIES = Object.freeze([
  'historical_acquisition_record',
  'provenance',
  'collection_valuation',
  'condition_documentation',
  'inventory_analytics',
  'educational_information',
  'insurance_documentation',
  'estate_planning',
  'storage_and_preservation',
  'usage_and_session_history',
  'sharing_and_reporting',
]);

/**
 * Capabilities CollectionKeeper must never provide.
 *
 * `patterns` are matched against generated or authored copy. They are kept
 * narrow on purpose: a false positive blocks legitimate documentation, so each
 * pattern targets the commercial behaviour rather than a single loaded word.
 */
export const EXCLUDED_CAPABILITIES = Object.freeze([
  {
    key: 'live_retailer_price_comparison',
    label: 'Live retailer price comparison',
    patterns: [
      /\bprice comparison\b/i,
      /\bcompare (?:the )?prices?\b/i,
      /\bcheapest (?:price|option|place)\b/i,
      /\blowest price (?:today|right now|available)\b/i,
      /\bbest price (?:today|right now|online)\b/i,
      /\bprice match(?:ing)?\b/i,
    ],
  },
  {
    key: 'retailer_availability_monitoring',
    label: 'Retailer availability monitoring',
    patterns: [
      /\bin stock at\b/i,
      /\bback in stock at\b/i,
      /\bavailability at (?:a |the )?(?:retailer|shop|store)\b/i,
      /\bstock checker\b/i,
      /\bsold out at\b/i,
    ],
  },
  {
    key: 'purchasing_recommendation',
    label: 'Purchasing recommendations',
    patterns: [
      /\byou should buy\b/i,
      /\bwhere to buy\b/i,
      /\bbest place to buy\b/i,
      /\bbuy it (?:from|at|here)\b/i,
      /\bpurchase now\b/i,
      /\badd to (?:cart|basket)\b/i,
      /\bcheckout\b/i,
      /\bbuying (?:advice|guide|recommendation)\b/i,
    ],
  },
  {
    key: 'shopping_links',
    label: 'Shopping links',
    patterns: [
      /\baffiliate\b/i,
      /\bbuy now link\b/i,
      /\bshopping link\b/i,
      /\bshop now\b/i,
      /\bsponsored (?:link|listing)\b/i,
    ],
  },
  {
    key: 'discount_alerts',
    label: 'Discount alerts',
    patterns: [
      /\bdiscount alert\b/i,
      /\bprice drop alert\b/i,
      /\bsale alert\b/i,
      /\bdeal alert\b/i,
      /\bpromo code\b/i,
      /\bcoupon\b/i,
    ],
  },
  {
    key: 'marketplace_or_trading',
    label: 'Marketplaces, trading platforms',
    patterns: [
      /\bmarketplace\b/i,
      /\bfor sale\b/i,
      /\bsell your\b/i,
      /\blist it for sale\b/i,
      /\bplace a bid\b/i,
      /\btrading platform\b/i,
    ],
  },
  {
    key: 'purchasing_optimization',
    label: 'Purchasing optimization',
    patterns: [
      /\bpurchase optimization\b/i,
      /\bbest time to buy\b/i,
      /\bwhen to buy\b/i,
      /\bbuy timing\b/i,
    ],
  },
]);

const EXCLUDED_KEYS = EXCLUDED_CAPABILITIES.map((entry) => entry.key);

/**
 * Test a block of generated or authored copy against the excluded lanes.
 *
 * @param {string} text
 * @returns {{ allowed: boolean, violations: Array<{ key: string, label: string, match: string }> }}
 */
export function classifyText(text) {
  const value = typeof text === 'string' ? text : '';
  const violations = [];

  if (!value.trim()) return { allowed: true, violations };

  for (const lane of EXCLUDED_CAPABILITIES) {
    for (const pattern of lane.patterns) {
      const match = value.match(pattern);
      if (match) {
        violations.push({ key: lane.key, label: lane.label, match: match[0] });
        break;
      }
    }
  }

  return { allowed: violations.length === 0, violations };
}

/** Convenience boolean form of {@link classifyText}. */
export function isWithinBoundaries(text) {
  return classifyText(text).allowed;
}

/**
 * Throw when copy crosses a product boundary.
 * Use at generation and publish boundaries, not in render paths.
 */
export function assertWithinBoundaries(text, context = 'copy') {
  const result = classifyText(text);
  if (!result.allowed) {
    const labels = result.violations.map((v) => v.label).join(', ');
    throw new Error(`${context} is outside CollectionKeeper product boundaries: ${labels}`);
  }
  return text;
}

const POLICY_MARKER = 'PRODUCT BOUNDARY (NON-NEGOTIABLE)';

/**
 * True when the text is the policy statement itself rather than generated copy.
 * Policy text has to name the excluded lanes, so it is exempt from its own scan.
 */
export function isPolicyText(text) {
  return String(text || '').includes(POLICY_MARKER);
}

/**
 * Scan copy a model or template produced. Policy text is exempt, so a composed
 * Curator prompt can be validated without flagging the rules it contains.
 */
export function classifyGeneratedCopy(text) {
  if (isPolicyText(text)) return { allowed: true, violations: [] };
  return classifyText(text);
}

/**
 * Whether a capability key is permitted. Unknown keys are rejected so new
 * capabilities must be registered here deliberately.
 */
export function isPermittedCapability(key) {
  return PERMITTED_CAPABILITIES.includes(key);
}

/** True when the key belongs to an explicitly excluded lane. */
export function isExcludedCapability(key) {
  return EXCLUDED_KEYS.includes(key);
}

/**
 * Prompt clause appended to every Curator instruction set.
 * Keep this aligned with EXCLUDED_CAPABILITIES when lanes change.
 */
export const CURATOR_BOUNDARY_CLAUSE = `
PRODUCT BOUNDARY (NON-NEGOTIABLE):

CollectionKeeper documents, preserves and analyses collections. It does not promote or facilitate the use, sale or acquisition of tobacco or alcohol.

You may discuss: historical acquisition records, provenance, collection valuation, condition documentation, inventory analytics, educational context, insurance documentation, estate planning, storage and preservation, and the collector's own usage history.

You may not: compare live retailer prices, monitor retailer availability, recommend that the collector purchase a specific item, surface shopping or affiliate links, raise discount or sale alerts, discuss marketplaces or trading platforms, or optimise purchasing decisions.

When a request falls in an excluded lane, do not comply partially and do not offer a workaround. Say plainly that this is outside what CollectionKeeper does, then redirect to the permitted equivalent — for example documenting an existing acquisition, assessing condition, planning storage, reviewing insurance coverage, or analysing the collection the collector already owns.

Never frame an unowned item as something to go and buy. Discuss it only as documentation context: what it is, how it would compare to items already owned, and what would need to be recorded if it were ever added to the collection.
`;