import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const FORBIDDEN_PATTERNS = [
  /tobacconist\./i,
  /pipes\./i,
  /tobacco\./i,
  /tobaccoPage\./i,
  /units\./i,
  /helpContent\./i,
];

const INTERPOLATION_PATTERN = /\{\{([^}]+)\}\}/g;

function checkForForbiddenKeys(obj, path = "") {
  const errors = [];
  for (const [key, val] of Object.entries(obj || {})) {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (typeof val === "string") {
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(val)) {
          errors.push(`Raw key leaked in ${fullPath}: "${val}"`);
        }
      }
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      errors.push(...checkForForbiddenKeys(val, fullPath));
    }
  }
  return errors;
}

function validateHelpIntegrity(helpObj, locale) {
  const errors = [];
  
  if (!helpObj || !helpObj.helpContent) {
    errors.push(`${locale}: Missing helpContent object`);
    return errors;
  }
  
  const hc = helpObj.helpContent;
  
  if (!hc.faqFull || !Array.isArray(hc.faqFull.sections)) {
    errors.push(`${locale}: helpContent.faqFull.sections is missing or not an array`);
    return errors;
  }
  
  for (let i = 0; i < hc.faqFull.sections.length; i++) {
    const sec = hc.faqFull.sections[i];
    if (!sec.items || !Array.isArray(sec.items) || sec.items.length === 0) {
      errors.push(`${locale}: Section ${i} has no items`);
    }
    for (let j = 0; j < (sec.items || []).length; j++) {
      const item = sec.items[j];
      if (!item.q || typeof item.q !== "string" || !item.q.trim()) {
        errors.push(`${locale}: Section ${i}, Item ${j}: missing/empty question`);
      }
      if (!item.a || typeof item.a !== "string" || !item.a.trim()) {
        errors.push(`${locale}: Section ${i}, Item ${j}: missing/empty answer`);
      }
    }
  }
  
  return errors;
}

function validateInterpolations(enVal, locVal, locale, key) {
  const enMatches = [...(enVal || "").matchAll(INTERPOLATION_PATTERN)].map(m => m[1]);
  const locMatches = [...(locVal || "").matchAll(INTERPOLATION_PATTERN)].map(m => m[1]);
  
  const errors = [];
  
  for (const token of enMatches) {
    if (!locMatches.includes(token)) {
      errors.push(`${locale}: Key "${key}" missing interpolation {{${token}}}`);
    }
  }
  
  return errors;
}

async function validateTranslations(payload) {
  const { missingByLang, translationsByLang } = payload;
  const errors = [];
  
  if (!translationsByLang || !Object.keys(translationsByLang).length) {
    errors.push("No translation data provided");
    return errors;
  }
  
  for (const [locale, trans] of Object.entries(translationsByLang)) {
    // Check forbidden patterns
    const forbiddenErrors = checkForForbiddenKeys(trans);
    errors.push(...forbiddenErrors.map(e => `${locale}: ${e}`));
    
    // Check missing keys
    if (missingByLang?.[locale]?.length) {
      errors.push(`${locale}: Still has ${missingByLang[locale].length} missing keys`);
    }
    
    // Validate help structure (only if help content is present)
    if (trans.helpContent) {
      const helpErrors = validateHelpIntegrity(trans, locale);
      errors.push(...helpErrors);
    }
    
    // Validate interpolations vs English
    if (locale !== "en" && translationsByLang.en) {
      const enTrans = translationsByLang.en;
      const checkInterp = (obj, locObj, path) => {
        if (!obj || !locObj) return;
        for (const [key, val] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key;
          const locVal = locObj[key];
          
          if (typeof val === "string" && typeof locVal === "string") {
            const interpErrors = validateInterpolations(val, locVal, locale, fullPath);
            errors.push(...interpErrors);
          } else if (val && typeof val === "object" && !Array.isArray(val)) {
            checkInterp(val, locObj[key], fullPath);
          }
        }
      };
      checkInterp(enTrans, trans, "");
    }
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
    const validationErrors = await validateTranslations(payload);
    
    if (validationErrors.length > 0) {
      return Response.json({
        success: false,
        errors: validationErrors,
        errorCount: validationErrors.length,
        message: `Release gate FAILED with ${validationErrors.length} error(s)`
      }, { status: 400 });
    }
    
    return Response.json({
      success: true,
      errors: [],
      errorCount: 0,
      message: "Release gate PASSED: All translations valid"
    });
  } catch (error) {
    console.error('[i18nValidator] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});