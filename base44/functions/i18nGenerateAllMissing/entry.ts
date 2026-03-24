import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const MISSING_KEYS_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/cf7882bca_pk32_missing_keys.json";

const LOCALES = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  "pt-BR": "Brazilian Portuguese",
  nl: "Dutch",
  pl: "Polish",
  ja: "Japanese",
  "zh-Hans": "Simplified Chinese"
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Fetch missing keys report
    const response = await fetch(MISSING_KEYS_URL);
    const report = await response.json();

    const allTranslations = {};

    // Process each locale
    for (const [locale, langName] of Object.entries(LOCALES)) {
      const missingKeys = report.missingByLang[locale] || [];
      
      if (missingKeys.length === 0) {
        allTranslations[locale] = {};
        continue;
      }

      // Batch translate in chunks of 100 keys
      const chunkSize = 100;
      const chunks = [];
      for (let i = 0; i < missingKeys.length; i += chunkSize) {
        chunks.push(missingKeys.slice(i, i + chunkSize));
      }

      const localeTranslations = {};

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        const prompt = `You are translating UI strings for a pipe smoking collection management app called PipeKeeper.

Target language: ${langName} (${locale})

Generate JSON translations for these keys. Use the key structure to understand context:
${chunk.join('\n')}

CRITICAL RULES:
1. Return ONLY valid JSON object mapping each key to its translation
2. NO placeholders, NO "TODO", NO English fallbacks
3. Use proper terminology for pipe smoking (bowl, chamber, stem, blend, cellar, aging)
4. Keep interpolation variables intact: {{variable}} must remain in translation
5. For units.bowl/bowlPlural: translate "bowl" as smoking unit (e.g., ES: "cazoleta", FR: "fournée", DE: "Pfeifenfüllung", IT: "fumata", PT-BR: "tigela", NL: "kom", PL: "miska", JA: "ボウル", ZH: "烟斗")
6. For help content sections: maintain data structure for accordions
7. Short keys = short translations, long keys = longer descriptive text

Examples:
- common.next → "Next" (EN), "Siguiente" (ES), "Suivant" (FR)
- units.bowl → "bowl" (EN), "cazoleta" (ES), "fournée" (FR)
- pipes.search → "Search" (EN), "Buscar" (ES), "Rechercher" (FR)
- tobacconist.versatilePattern → "Versatile - suitable for multiple blend types"

Return format:
{
  "key.name": "translation",
  "another.key": "another translation"
}`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            additionalProperties: { type: "string" }
          }
        });

        Object.assign(localeTranslations, result);
      }

      allTranslations[locale] = localeTranslations;
    }

    return Response.json({
      success: true,
      locales: Object.keys(allTranslations),
      totalKeys: Object.values(allTranslations).reduce((sum, t) => sum + Object.keys(t).length, 0),
      translations: allTranslations
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});