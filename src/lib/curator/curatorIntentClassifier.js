/**
 * curatorIntentClassifier.js
 *
 * Pre-LLM diagnostic intent classification for Curator chat.
 *
 * Diagnostic/report phrases (e.g., "Wines Without a Drinking Window") are
 * classified HERE — before any LLM call — so that collection issue labels
 * are never misinterpreted as product or blend names.
 *
 * Priority order:
 *   1. Structured issue context (from issue card "Ask Curator" button)
 *   2. Text-based pattern matching
 *   3. null → not a diagnostic query
 */

// ─── Diagnostic intent IDs ────────────────────────────────────────────────────

export const DIAGNOSTIC_INTENT = {
  WINE_MISSING_DRINKING_WINDOW: 'missing_drinking_window',
  WINE_MISSING_VALUATION:       'missing_valuation',
  WINE_STALE_VALUATION:         'stale_valuation',
  WINE_MISSING_METADATA:        'missing_core_metadata',
  WINE_MISSING_RARITY:          'missing_rarity',
  WINE_EVALUATE_ISSUES:         'wine_evaluate_issues',
  PIPE_MISSING_PHOTOS:          'pipe_missing_photos',
  WHISKEY_MISSING_NOTES:        'whiskey_missing_notes',
  CIGAR_MISSING_METADATA:       'cigar_missing_metadata',
  COLLECTION_EVALUATION:        'collection_evaluation',
};

// ─── Text pattern table ───────────────────────────────────────────────────────
//
// Each entry maps one or more regex patterns to a diagnostic intent + module.
// Patterns are tested in order — first match wins.

const DIAGNOSTIC_PATTERNS = [
  // ── Wine drinking window ───────────────────────────────────────────────────
  {
    patterns: [
      /wines?\s+without\s+a?\s*drinking\s+window/i,
      /wines?\s+missing\s+drinking\s+window/i,
      /missing\s+drinking\s+window/i,
      /drinking\s+window\s+missing/i,
      /wines?\s+without\s+drink\s*(from|by|window)/i,
    ],
    intent: DIAGNOSTIC_INTENT.WINE_MISSING_DRINKING_WINDOW,
    module: 'winekeeper',
  },

  // ── Wine valuation ─────────────────────────────────────────────────────────
  {
    patterns: [
      /wines?\s+without\s+valuation/i,
      /wines?\s+missing\s+valuation/i,
      /wines?\s+needing\s+valuation/i,
      /unvalued\s+wines?/i,
    ],
    intent: DIAGNOSTIC_INTENT.WINE_MISSING_VALUATION,
    module: 'winekeeper',
  },

  // ── Stale valuation ────────────────────────────────────────────────────────
  {
    patterns: [
      /stale\s+valuation/i,
      /wines?\s+with\s+stale\s+valuation/i,
      /outdated\s+wine\s+valuation/i,
    ],
    intent: DIAGNOSTIC_INTENT.WINE_STALE_VALUATION,
    module: 'winekeeper',
  },

  // ── Wine metadata ──────────────────────────────────────────────────────────
  {
    patterns: [
      /missing\s+wine\s+metadata/i,
      /wines?\s+missing\s+metadata/i,
      /wines?\s+with\s+incomplete\s+(metadata|records?)/i,
      /incomplete\s+wine\s+records?/i,
      /wines?\s+missing\s+core\s+metadata/i,
    ],
    intent: DIAGNOSTIC_INTENT.WINE_MISSING_METADATA,
    module: 'winekeeper',
  },

  // ── Wine rarity ────────────────────────────────────────────────────────────
  {
    patterns: [
      /wines?\s+without\s+rarity/i,
      /wines?\s+missing\s+rarity/i,
      /wines?\s+without\s+collectibility/i,
    ],
    intent: DIAGNOSTIC_INTENT.WINE_MISSING_RARITY,
    module: 'winekeeper',
  },

  // ── Wine general evaluation ────────────────────────────────────────────────
  {
    patterns: [
      /optimize\s+wine\s+records?/i,
      /evaluate\s+wine\s+issues?/i,
      /wine\s+collection\s+evaluation/i,
      /wine\s+records?\s+needing\s+review/i,
    ],
    intent: DIAGNOSTIC_INTENT.WINE_EVALUATE_ISSUES,
    module: 'winekeeper',
  },

  // ── Pipe photos ────────────────────────────────────────────────────────────
  {
    patterns: [
      /pipes?\s+missing\s+photos?/i,
      /pipes?\s+without\s+photos?/i,
    ],
    intent: DIAGNOSTIC_INTENT.PIPE_MISSING_PHOTOS,
    module: 'pipekeeper',
  },

  // ── Whiskey tasting notes ──────────────────────────────────────────────────
  {
    patterns: [
      /whiskey\s+without\s+tasting\s+notes/i,
      /whiskey\s+missing\s+tasting\s+notes/i,
      /whiskeys?\s+without\s+tasting\s+notes/i,
      /whiskeys?\s+missing\s+tasting\s+notes/i,
    ],
    intent: DIAGNOSTIC_INTENT.WHISKEY_MISSING_NOTES,
    module: 'whiskeykeeper',
  },

  // ── Generic collection evaluation ──────────────────────────────────────────
  {
    patterns: [
      /collection\s+evaluation/i,
      /collection\s+diagnostics?/i,
      /records?\s+needing\s+review/i,
      /incomplete\s+records?/i,
    ],
    intent: DIAGNOSTIC_INTENT.COLLECTION_EVALUATION,
    module: 'all',
  },
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Classify a user message as a collection diagnostic request.
 *
 * Priority:
 *   1. Structured issue context from an issue-card "Ask Curator" button.
 *   2. Text pattern matching against DIAGNOSTIC_PATTERNS.
 *   3. null — not a diagnostic query.
 *
 * @param {string} message                    — Raw user message
 * @param {object|null} structuredIssueContext — Structured context from issue card:
 *   { source: 'optimization_issue', module, issue_type, record_ids, title }
 * @returns {{ intent: string, module: string } | null}
 */
export function classifyDiagnosticIntent(message, structuredIssueContext = null) {
  // 1. Structured context wins — do not re-classify from text
  if (structuredIssueContext?.source === 'optimization_issue') {
    const issueType = structuredIssueContext.issue_type;
    const issueModule = structuredIssueContext.module || 'winekeeper';
    if (issueType) {
      return { intent: issueType, module: issueModule };
    }
  }

  // 2. Text pattern matching
  const text = String(message || '').trim();
  if (!text) return null;

  for (const entry of DIAGNOSTIC_PATTERNS) {
    if (entry.patterns.some((p) => p.test(text))) {
      return { intent: entry.intent, module: entry.module };
    }
  }

  return null;
}

/**
 * Guard that prevents diagnostic phrases from being treated as product names.
 *
 * Returns true when the text contains a known collection-issue label
 * (e.g., "Wines Without a Drinking Window") even if it also contains
 * product-like words.
 *
 * @param {string} message
 * @returns {boolean}
 */
export function isDiagnosticPhrase(message) {
  return classifyDiagnosticIntent(message) !== null;
}

/**
 * Returns true only when the user is EXPLICITLY asking about an external
 * product by name — not a collection issue, diagnostic category, or
 * anything referencing "my collection" / "my records".
 *
 * Used to ensure true product queries still reach the LLM correctly.
 *
 * @param {string} message
 * @returns {boolean}
 */
export function isExplicitProductQuery(message) {
  const text = String(message || '');

  // Must contain explicit lookup intent
  const hasLookupIntent = /\b(tell me about|what is|what's|describe|find me|search for|look up|info on|information about)\b/i.test(text);
  if (!hasLookupIntent) return false;

  // Must NOT contain collection-diagnostic markers
  const hasCollectionMarker = /\b(my collection|my wines?|my records?|my cellar|my pipes?|missing|without|incomplete|diagnostic|issue|needing)\b/i.test(text);
  if (hasCollectionMarker) return false;

  // Must contain a product-type term
  return /\b(blend|wine|tobacco|cigar|whiskey|bourbon|scotch|pipe)\b/i.test(text);
}
