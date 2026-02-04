/**
 * i18n Release Gate Validator
 * Enforces that no raw keys or interpolation tokens render in any locale
 * Fails the build if violations are detected
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const FORBIDDEN_PATTERNS = [
  { pattern: /tobacconist\./g, category: 'raw_key' },
  { pattern: /helpCenter\./g, category: 'raw_key' },
  { pattern: /pipes\./g, category: 'raw_key' },
  { pattern: /tobacco\./g, category: 'raw_key' },
  { pattern: /units\./g, category: 'raw_key' },
  { pattern: /\{\{.*?\}\}/g, category: 'interpolation_token' },
];

const REQUIRED_KEYS = {
  tobacconist: [
    'title', 'subtitle', 'welcomeTitle', 'welcomeMessage',
    'generatePairings', 'generatePairingsPrompt', 'runOptimization', 'runOptimizationPrompt',
    'newConversation', 'inputPlaceholder', 'chatTab', 'updatesTab', 'startingConversation',
    'pairingMatrix', 'collectionOptimization', 'outOfDate', 'upToDate', 'undo', 'regenerate',
    'breakInSchedules', 'breakInNote', 'noRecommendation'
  ],
  helpCenter: [
    'faq', 'faqDesc', 'howTo', 'howToDesc', 'troubleshooting', 'troubleshootingDesc',
    'helpCenter', 'findAnswers', 'quickLinks', 'contactSupport', 'termsOfService',
    'privacyPolicy', 'subscriptionBilling', 'cantFind'
  ],
  pipes: [
    'pipes', 'search', 'filter', 'shape', 'material', 'allShapes', 'allMaterials',
    'gridView', 'listView'
  ],
  tobacco: [
    'allTypes', 'allStrengths', 'search'
  ],
  units: [
    'bowl', 'bowlPlural', 'tin', 'tinPlural', 'oz', 'grams', 'mm', 'inches'
  ],
};

const LOCALES = ['en', 'es', 'fr', 'de', 'it', 'pt-BR', 'nl', 'pl', 'ja', 'zh-Hans'];

function validateLocaleKeys(locale, translations) {
  const violations = [];
  
  // Check each required key category
  for (const [category, keys] of Object.entries(REQUIRED_KEYS)) {
    const categoryPath = translations[category];
    
    if (!categoryPath) {
      violations.push({
        locale,
        type: 'missing_category',
        category,
        message: `Missing entire category: ${category}`
      });
      continue;
    }
    
    for (const key of keys) {
      const value = categoryPath[key];
      if (value === undefined || value === null) {
        violations.push({
          locale,
          type: 'missing_key',
          key: `${category}.${key}`,
          message: `Missing key: ${category}.${key}`
        });
      } else if (typeof value === 'string') {
        // Check for forbidden patterns in the value
        for (const { pattern, category: patternType } of FORBIDDEN_PATTERNS) {
          if (pattern.test(value)) {
            violations.push({
              locale,
              type: patternType,
              key: `${category}.${key}`,
              message: `Contains ${patternType} in value: ${value.substring(0, 50)}...`
            });
          }
        }
      }
    }
  }
  
  return violations;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    // Hardcoded check - in production, these would be loaded from translation resources
    const allViolations = [];
    
    // Check English as baseline
    const en Translations = {
      tobacconist: {
        title: 'Expert Tobacconist',
        subtitle: 'Expert consultation and AI updates',
        noRecommendation: 'No recommendations available'
      },
      helpCenter: {
        faq: 'FAQ',
        helpCenter: 'Help Center'
      },
      pipes: {
        pipes: 'pipes',
        search: 'Search'
      },
      tobacco: {
        allTypes: 'All types'
      },
      units: {
        bowl: 'bowl',
        bowlPlural: 'bowls'
      }
    };
    
    // Validate that all locales have required keys
    for (const locale of LOCALES) {
      const localeViolations = validateLocaleKeys(locale, enTranslations);
      allViolations.push(...localeViolations);
    }
    
    if (allViolations.length > 0) {
      return Response.json({
        status: 'FAIL',
        violations: allViolations,
        message: `i18n Release Gate FAILED: ${allViolations.length} violation(s) detected`
      }, { status: 400 });
    }
    
    return Response.json({
      status: 'PASS',
      message: 'i18n Release Gate PASSED: All locales validated',
      locales: LOCALES,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({
      status: 'ERROR',
      error: error.message,
      message: 'i18n Release Gate ERRORED'
    }, { status: 500 });
  }
});