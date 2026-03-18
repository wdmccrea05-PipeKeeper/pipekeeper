import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * A2) Missing Translation Key Validator
 * Validates that every key in EN exists in all 9 other languages
 * Output: i18n_missing_keys_report.json
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    return Response.json({
      message: "This audit must run client-side with access to translations. Use components/i18n/translationValidator.jsx instead.",
      structure: {
        format: "i18n_missing_keys_report.json",
        schema: {
          missing_keys: {
            es: ["array of missing key paths"],
            fr: ["array of missing key paths"],
            de: [],
            it: [],
            "pt-BR": [],
            nl: [],
            pl: [],
            ja: [],
            "zh-Hans": []
          },
          summary: {
            total_missing: "number",
            by_locale: "object with counts per locale"
          }
        }
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});