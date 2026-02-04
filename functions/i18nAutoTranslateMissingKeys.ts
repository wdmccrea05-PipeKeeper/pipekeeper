import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Automated i18n backfill function
 * Reads missing keys, generates translations for all 10 locales, persists results
 * Run repeatedly until pk32_missing_keys.json report is fully satisfied
 */

const CHECKPOINT_FILE = '/tmp/i18n_checkpoint.json';
const BATCH_SIZE = 25;
const LOCALES = ['es', 'fr', 'de', 'it', 'pt-BR', 'nl', 'pl', 'ja', 'zh-Hans'];

function loadCheckpoint() {
  try {
    const data = Deno.readTextFileSync(CHECKPOINT_FILE);
    return JSON.parse(data);
  } catch {
    return { lastProcessedIndex: 0, results: {} };
  }
}

function saveCheckpoint(checkpoint) {
  Deno.writeTextFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

async function generateTranslations(base44, keys, locale, enTranslations) {
  const prompt = `You are a professional translator. Translate the following keys from English to ${locale} (locale code: ${locale}).
Return ONLY valid JSON with no markdown, no comments.
Preserve all interpolation tokens exactly ({{key}}, etc).
Preserve punctuation and formatting.
If a value is an object/array, translate only the leaf strings.

Keys to translate:
${JSON.stringify(keys.reduce((acc, key) => {
  const enValue = getNestedValue(enTranslations, key);
  acc[key] = enValue;
  return acc;
}, {}), null, 2)}

Return format: { "key.path": "translated value", ... }`;

  try {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        additionalProperties: { type: 'string' }
      }
    });
    return response || {};
  } catch (error) {
    console.error(`Translation failed for locale ${locale}:`, error.message);
    return {};
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, part) => current?.[part], obj);
}

function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // TODO: Load pk32_missing_keys.json from storage/request
    // For now, read from environment or request body
    const missingKeysReport = await req.json().catch(() => ({}));
    const missingKeys = missingKeysReport.keys || [];

    if (!missingKeys.length) {
      return Response.json({ success: true, message: 'No missing keys' });
    }

    const checkpoint = loadCheckpoint();
    const startIdx = checkpoint.lastProcessedIndex || 0;
    const batch = missingKeys.slice(startIdx, startIdx + BATCH_SIZE);

    if (!batch.length) {
      return Response.json({ 
        success: true, 
        message: 'All keys translated', 
        results: checkpoint.results 
      });
    }

    // Load EN translations as reference
    const enTranslations = missingKeysReport.enTranslations || {};

    // Generate translations for each locale
    const allResults = { ...checkpoint.results };
    for (const locale of LOCALES) {
      const translations = await generateTranslations(base44, batch, locale, enTranslations);
      allResults[locale] = { ...allResults[locale], ...translations };
    }

    // Save checkpoint
    checkpoint.lastProcessedIndex = startIdx + batch.length;
    checkpoint.results = allResults;
    saveCheckpoint(checkpoint);

    return Response.json({
      success: true,
      processed: batch.length,
      totalProcessed: checkpoint.lastProcessedIndex,
      totalKeys: missingKeys.length,
      nextBatch: missingKeys.slice(startIdx + BATCH_SIZE, startIdx + BATCH_SIZE * 2).length > 0
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});