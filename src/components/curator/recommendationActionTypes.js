/**
 * Curator Recommendation Action Types
 *
 * Defines the three recommendation classes used by the Optimize panel.
 * Every recommendation card must declare its class so the UI can render
 * the appropriate set of action buttons.
 */

// ─── Recommendation Classes ───────────────────────────────────────────────────

export const RECOMMENDATION_CLASS = {
  /**
   * Safe, deterministic structured data fix.
   * Examples: missing spirit type, missing metadata, obvious category cleanup.
   * Buttons: Apply Fix | Review Details | Ask Curator
   */
  AUTO_FIX: 'auto_fix',

  /**
   * Advisory insight — surfaces awareness without changing data directly.
   * Examples: rotation opportunity, underused items, balance awareness.
   * Buttons: Acknowledge | View Items | Ask Curator
   */
  ADVISORY: 'advisory',

  /**
   * Multi-path decision that requires user judgment.
   * Examples: pipe specialization, nuanced reclassification, batch suggestions.
   * Buttons: Acknowledge | Ask for More Info | Treat Individually
   */
  MULTI_PATH: 'multi_path',
};

// ─── Label helpers ────────────────────────────────────────────────────────────

export function getRecommendationClassLabel(cls) {
  switch (cls) {
    case RECOMMENDATION_CLASS.AUTO_FIX:   return 'Auto Fix';
    case RECOMMENDATION_CLASS.ADVISORY:   return 'Advisory';
    case RECOMMENDATION_CLASS.MULTI_PATH: return 'Needs Your Input';
    default:                              return '';
  }
}

export function getRecommendationClassColor(cls) {
  switch (cls) {
    case RECOMMENDATION_CLASS.AUTO_FIX:   return 'rgba(74,124,92,0.85)';
    case RECOMMENDATION_CLASS.ADVISORY:   return 'rgba(74,124,156,0.85)';
    case RECOMMENDATION_CLASS.MULTI_PATH: return 'rgba(139,94,58,0.85)';
    default:                              return 'rgba(180,140,75,0.7)';
  }
}

export function getRecommendationClassBg(cls) {
  switch (cls) {
    case RECOMMENDATION_CLASS.AUTO_FIX:   return 'rgba(74,124,92,0.12)';
    case RECOMMENDATION_CLASS.ADVISORY:   return 'rgba(74,124,156,0.12)';
    case RECOMMENDATION_CLASS.MULTI_PATH: return 'rgba(139,94,58,0.12)';
    default:                              return 'rgba(180,140,75,0.07)';
  }
}
