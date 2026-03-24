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

async function generateTranslations(base44, keys, locale) {
  if (!keys.length) return {};
  
  const prompt = `You are an expert translator for a pipe smoking collection management app.
Translate these English strings to **${locale}** (${locale}).

**CRITICAL RULES:**
1. Return ONLY valid JSON, no markdown/comments
2. Preserve all {{interpolation}} tokens exactly
3. Preserve punctuation, line breaks, formatting
4. Preserve field names like "Q:" and "A:"
5. Translate UI text naturally, not literally
6. Keep translations concise and professional
7. If already translated correctly, return as-is

**Keys to translate (${keys.length}):**
${keys.slice(0, 30).join(', ')}${keys.length > 30 ? '... (and ' + (keys.length - 30) + ' more)' : ''}

**Output format:** { "key1": "translated value 1", "key2": "translated value 2", ... }`;

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

    const payload = await req.json().catch(() => ({}));
    const { missingByLang } = payload;

    if (!missingByLang || !Object.keys(missingByLang).length) {
      return Response.json({ error: 'missingByLang required', status: 400 });
    }

    const checkpoint = loadCheckpoint();
    const allLocales = Object.keys(missingByLang);
    
    // Process first batch for each locale
    const results = { ...checkpoint.results };
    let totalProcessed = 0;

    for (const locale of allLocales) {
      const missingKeysForLocale = Array.isArray(missingByLang[locale]) 
        ? missingByLang[locale] 
        : [];
      
      if (!missingKeysForLocale.length) continue;

      const startIdx = checkpoint.results[locale]?.processed || 0;
      const batch = missingKeysForLocale.slice(startIdx, startIdx + BATCH_SIZE);

      if (!batch.length) continue;

      console.log(`[i18n] Translating ${batch.length} keys for ${locale}...`);
      const translations = await generateTranslations(base44, batch, locale);
      
      if (!results[locale]) results[locale] = {};
      results[locale].data = { ...results[locale].data, ...translations };
      results[locale].processed = startIdx + batch.length;
      totalProcessed += batch.length;
    }

    checkpoint.results = results;
    checkpoint.lastUpdated = new Date().toISOString();
    saveCheckpoint(checkpoint);

    return Response.json({
      success: true,
      processed: totalProcessed,
      locales: allLocales.length,
      message: `Processed ${totalProcessed} keys. Re-run to continue.`,
      checkpoint
    });
  } catch (error) {
    console.error('[i18n] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});