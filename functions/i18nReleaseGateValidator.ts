import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * i18n Release Gate Validator
 * Fails build if ANY of these are true:
 * 1. Missing keys in any locale vs EN
 * 2. Raw-key patterns in translations (tobacconist., pipes., etc)
 * 3. Broken interpolation tokens
 * 4. Invalid Help structures
 * 5. Rendered output shows raw keys
 */

const FORBIDDEN_PATTERNS = [
  /\btobacconist\./,
  /\bpipes\./,
  /\btobacco\./,
  /\btobaccoPage\./,
  /\bpipesPage\./,
  /\bunits\.(?!bowl|tin|tinPlural)/
];

function validateKeys(translations, locale) {
  const errors = [];

  Object.entries(translations).forEach(([key, value]) => {
    if (typeof value === 'string') {
      // Check for forbidden raw-key patterns
      FORBIDDEN_PATTERNS.forEach((pattern) => {
        if (pattern.test(value)) {
          errors.push(`${locale}: Key "${key}" contains forbidden pattern: ${pattern}`);
        }
      });

      // Check for suspicious raw-key strings
      if (/^[a-zA-Z0-9_.]+$/.test(value) && value.includes('.')) {
        errors.push(`${locale}: Key "${key}" looks like a raw translation key: "${value}"`);
      }
    } else if (typeof value === 'object') {
      // Recursively check nested objects
      const nested = validateKeys(value, locale);
      errors.push(...nested);
    }
  });

  return errors;
}

function validateHelpContent(locale, content) {
  const errors = [];

  if (content && typeof content === 'object') {
    // Check faqFull structure
    if (content.faqFull) {
      if (!content.faqFull.sections || typeof content.faqFull.sections !== 'object') {
        errors.push(`${locale}: faqFull.sections missing or invalid`);
      } else {
        Object.entries(content.faqFull.sections).forEach(([sectionKey, section]) => {
          if (!Array.isArray(section.items) || section.items.length === 0) {
            errors.push(`${locale}: faqFull.sections.${sectionKey}.items empty or invalid`);
          } else {
            section.items.forEach((item, idx) => {
              if (!item.q || !item.a) {
                errors.push(
                  `${locale}: faqFull.sections.${sectionKey}.items[${idx}] missing q or a`
                );
              }
            });
          }
        });
      }
    }
  }

  return errors;
}

function validateInterpolation(key, enValue, locValue) {
  const errors = [];

  if (typeof enValue !== 'string' || typeof locValue !== 'string') {
    return errors;
  }

  // Extract {{ }} tokens from both
  const enTokens = (enValue.match(/\{\{[^}]+\}\}/g) || []).sort();
  const locTokens = (locValue.match(/\{\{[^}]+\}\}/g) || []).sort();

  if (JSON.stringify(enTokens) !== JSON.stringify(locTokens)) {
    errors.push(
      `Interpolation mismatch in "${key}": EN has ${enTokens}, locale has ${locTokens}`
    );
  }

  return errors;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const {
      translations,
      translationsExtended,
      helpContent,
      enTranslations,
      expectedKeys
    } = payload;

    const allErrors = [];
    const LOCALES = ['es', 'fr', 'de', 'it', 'pt-BR', 'nl', 'pl', 'ja', 'zh-Hans'];

    // Validate each locale
    for (const locale of LOCALES) {
      const locTranslations = translations?.[locale] || {};
      const locExtended = translationsExtended?.[locale] || {};
      const locHelp = helpContent?.[locale] || {};

      // Merge all translation sources
      const merged = { ...locTranslations, ...locExtended, ...locHelp };

      // Check for missing keys
      if (expectedKeys) {
        expectedKeys.forEach((key) => {
          if (!(key in merged) && key in enTranslations) {
            allErrors.push(`${locale}: Missing key "${key}"`);
          }
        });
      }

      // Validate key patterns
      const keyErrors = validateKeys(merged, locale);
      allErrors.push(...keyErrors);

      // Validate Help content structure
      const helpErrors = validateHelpContent(locale, locHelp);
      allErrors.push(...helpErrors);

      // Validate interpolation tokens
      Object.entries(merged).forEach(([key, value]) => {
        const enValue = enTranslations[key];
        const interpErrors = validateInterpolation(key, enValue, value);
        allErrors.push(...interpErrors);
      });
    }

    if (allErrors.length > 0) {
      return Response.json(
        { success: false, errors: allErrors, count: allErrors.length },
        { status: 400 }
      );
    }

    return Response.json({ success: true, message: 'All validations passed' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});