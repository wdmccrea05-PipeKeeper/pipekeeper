import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BATCH_SIZE = 50;
const CHECKPOINT_PATH = '/tmp/i18n_generation_checkpoint.json';

function loadCheckpoint() {
  try {
    const content = Deno.readTextFileSync(CHECKPOINT_PATH);
    return JSON.parse(content);
  } catch {
    return { processed: {}, completed: false };
  }
}

function saveCheckpoint(checkpoint) {
  try {
    Deno.writeTextFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2));
  } catch (e) {
    console.error('[Checkpoint] Failed to save:', e.message);
  }
}

async function translateBatch(enKeys, locale, enValues) {
  const enContext = enKeys.slice(0, 3).map(k => `${k}: "${enValues[k]}"`).join('\n');
  
  const prompt = `Translate these keys for locale "${locale}" (keep keys unchanged, only translate values).
${enContext}
...and ${enKeys.length - 3} more keys.

Input JSON (${enKeys.length} keys):
${JSON.stringify(
  Object.fromEntries(enKeys.map(k => [k, enValues[k] || ''])),
  null,
  2
)}

Output only valid JSON, no commentary, keys unchanged, values in "${locale}" language.`;

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: enKeys.reduce((acc, k) => {
          acc[k] = { type: 'string' };
          return acc;
        }, {}),
      },
    });

    return result || {};
  } catch (error) {
    console.error(`[Translate] Batch for ${locale} failed:`, error.message);
    return {};
  }
}

function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current[part] = typeof current[part] === 'object' ? current[part] : {};
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

async function generateTranslations(payload) {
  const { missingKeys = [], enResources = {}, targetLocales = ['es', 'fr', 'de', 'it', 'pt-BR', 'nl', 'pl', 'ja', 'zh-Hans'] } = payload;

  if (!missingKeys.length) {
    return { success: true, message: 'No missing keys to generate' };
  }

  const checkpoint = loadCheckpoint();
  const generated = { en: {}, es: {}, fr: {}, de: {}, it: {}, 'pt-BR': {}, nl: {}, pl: {}, ja: {}, 'zh-Hans': {} };

  // For EN, just use the source values
  for (const key of missingKeys) {
    const val = getNestedValue(enResources, key);
    if (val && typeof val === 'string') {
      setNestedValue(generated.en, key, val);
    }
  }

  // For other locales, batch-translate
  for (const locale of targetLocales) {
    console.log(`[Generate] Starting locale: ${locale}`);
    const keysToProcess = missingKeys.filter(k => !(checkpoint.processed[locale] || []).includes(k));

    if (!keysToProcess.length) {
      console.log(`[Generate] ${locale} already complete`);
      continue;
    }

    for (let i = 0; i < keysToProcess.length; i += BATCH_SIZE) {
      const batch = keysToProcess.slice(i, i + BATCH_SIZE);
      const batchValues = Object.fromEntries(batch.map(k => [k, getNestedValue(enResources, k) || '']));

      console.log(`[Generate] ${locale} batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(keysToProcess.length / BATCH_SIZE)}`);

      const translated = await translateBatch(batch, locale, batchValues);

      for (const [key, value] of Object.entries(translated)) {
        if (typeof value === 'string' && value.trim()) {
          setNestedValue(generated[locale], key, value);
        }
      }

      // Save checkpoint after each batch
      checkpoint.processed[locale] = [...(checkpoint.processed[locale] || []), ...batch];
      saveCheckpoint(checkpoint);
    }
  }

  checkpoint.completed = true;
  saveCheckpoint(checkpoint);

  return { success: true, generated, message: 'Generation complete' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const result = await generateTranslations(payload);

    return Response.json(result);
  } catch (error) {
    console.error('[i18nGenerator] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});