import React, { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { deriveWineValuationPatch } from '@/lib/valuation/wineValuation';
import { deriveCigarValuationPatch, shouldRefreshCigarValuation } from '@/lib/valuation/cigarValuation';

// Keep flavor tags concise so detail cards stay readable while still being useful.
const MAX_FLAVOR_NOTES = 8;

function cleanText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanArray(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((v) => cleanText(v)).filter(Boolean))];
}

function toPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeIntensityLevel(value) {
  const normalized = cleanText(value)?.toLowerCase().replace(/[\s-]+/g, '_');
  const allowed = new Set(['mild', 'mild_medium', 'medium', 'medium_full', 'full']);
  return normalized && allowed.has(normalized) ? normalized : null;
}

function normalizeProductionStatus(value) {
  const normalized = cleanText(value)?.toLowerCase().replace(/[\s-]+/g, '_');
  const allowed = new Set(['regular_production', 'limited', 'discontinued', 'seasonal', 'unknown']);
  return normalized && allowed.has(normalized) ? normalized : null;
}

function getRemainingSticks(record) {
  const singles = toPositiveNumber(record?.singles_equivalent);
  if (singles) return singles;
  const qty = toPositiveNumber(record?.quantity);
  const cpp = toPositiveNumber(record?.cigars_per_package);
  if (qty && cpp) return qty * cpp;
  return qty || 1;
}

function arraysDifferCaseInsensitive(a = [], b = []) {
  const left = a.map((v) => String(v).trim().toLowerCase()).filter(Boolean).sort();
  const right = b.map((v) => String(v).trim().toLowerCase()).filter(Boolean).sort();
  if (left.length !== right.length) return true;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return true;
  }
  return false;
}

function mergeUniqueCaseInsensitive(existing = [], incoming = []) {
  const map = new Map();
  [...existing, ...incoming].forEach((value) => {
    const cleaned = cleanText(value);
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (!map.has(key)) map.set(key, cleaned);
  });
  return [...map.values()];
}

async function enrichPipe(record) {
  const missingFields = [];
  if (!record.country_of_origin) missingFields.push('country_of_origin');
  if (!record.shape) missingFields.push('shape');
  if (!record.bowl_material) missingFields.push('bowl_material');
  if (!record.finish) missingFields.push('finish');
  if (!record.year_made) missingFields.push('year_made');
  if (!record.condition) missingFields.push('condition');

  if (missingFields.length === 0) return {};

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a pipe expert. Given this pipe record, fill in only the clearly identifiable missing fields.
Return null for any field you are not confident about.

Pipe: "${record.name}"${record.maker ? ` by ${record.maker}` : ''}${record.shape ? `, shape: ${record.shape}` : ''}

Missing fields to fill: ${missingFields.join(', ')}

Field guidelines:
- country_of_origin: country name (e.g. "England", "Denmark", "Italy", "United States")
- shape: canonical pipe shape (e.g. "Billiard", "Bent Billiard", "Dublin", "Rhodesian", "Churchwarden")
- bowl_material: "Briar", "Meerschaum", "Corn Cob", "Clay", or other material
- finish: "Smooth", "Sandblasted", "Rusticated", "Carved", or other finish
- year_made: 4-digit year as a string, or null if unknown
- condition: one of "Mint", "Excellent", "Very Good", "Good", "Fair", "Poor"`,
    response_json_schema: {
      type: 'object',
      properties: {
        country_of_origin: { type: ['string', 'null'] },
        shape: { type: ['string', 'null'] },
        bowl_material: { type: ['string', 'null'] },
        finish: { type: ['string', 'null'] },
        year_made: { type: ['string', 'null'] },
        condition: { type: ['string', 'null'] },
      },
    },
  });

  const updates = {};
  for (const field of missingFields) {
    if (result?.[field]) updates[field] = result[field];
  }
  return updates;
}

async function enrichBottle(record) {
  const missingFields = [];
  if (!record.distillery) missingFields.push('distillery');
  if (!record.region) missingFields.push('region');
  if (!record.type) missingFields.push('type');
  if (!record.age) missingFields.push('age');
  if (!record.abv) missingFields.push('abv');
  if (!record.country) missingFields.push('country');

  if (missingFields.length === 0) return {};

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a whiskey expert. Given this bottle record, fill in only the clearly identifiable missing fields.
Return null for any field you are not confident about.

Bottle: "${record.name}"${record.distillery ? ` by ${record.distillery}` : ''}${record.region ? ` (${record.region})` : ''}

Missing fields to fill: ${missingFields.join(', ')}

Field guidelines:
- distillery: the distillery or producer name
- region: whiskey region (e.g. "Speyside", "Islay", "Highland", "Kentucky", "Tennessee")
- type: one of "Single Malt", "Blended Malt", "Bourbon", "Rye", "Irish Whiskey", "Blended Whiskey", "Tennessee Whiskey"
- age: numeric age in years (number), or null if NAS
- abv: alcohol by volume as a number (e.g. 46.0), or null if unknown
- country: country of origin (e.g. "Scotland", "United States", "Ireland", "Japan")`,
    add_context_from_internet: true,
    response_json_schema: {
      type: 'object',
      properties: {
        distillery: { type: ['string', 'null'] },
        region: { type: ['string', 'null'] },
        type: { type: ['string', 'null'] },
        age: { type: ['number', 'null'] },
        abv: { type: ['number', 'null'] },
        country: { type: ['string', 'null'] },
      },
    },
  });

  const updates = {};
  for (const field of missingFields) {
    if (result?.[field] !== null && result?.[field] !== undefined) {
      updates[field] = result[field];
    }
  }
  return updates;
}

async function enrichCigar(record) {
  const missingFields = [
    !record.brand && 'brand',
    !record.line && 'line',
    !record.vitola && 'vitola',
    !record.country_of_origin && 'country_of_origin',
    !record.wrapper && 'wrapper',
    !record.binder && 'binder',
    !record.filler && 'filler',
    !record.strength && 'strength',
    !record.body && 'body',
    !record.production_status && 'production_status',
  ].filter(Boolean);
  const shouldImproveAliases = !Array.isArray(record.aliases) || record.aliases.length < 2;
  const shouldImproveFlavor = !Array.isArray(record.flavor_notes) || record.flavor_notes.length < 3;
  const hasPhoto = Array.isArray(record.photos) && record.photos.length > 0;
  const willRefreshValuation = shouldRefreshCigarValuation(record);

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a cigar expert doing production data enrichment for a collector app.
Return only high-confidence metadata. Use null when uncertain.

Record:
- name: "${record.name || ''}"
- brand: "${record.brand || ''}"
- line: "${record.line || ''}"
- vitola: "${record.vitola || ''}"
- wrapper: "${record.wrapper || ''}"
- binder: "${record.binder || ''}"
- filler: "${record.filler || ''}"
- country_of_origin: "${record.country_of_origin || ''}"
- strength: "${record.strength || ''}"
- body: "${record.body || ''}"
- production_status: "${record.production_status || ''}"
- aliases: ${JSON.stringify(record.aliases || [])}
- flavor_notes: ${JSON.stringify(record.flavor_notes || [])}

Improve missing fields: ${missingFields.join(', ') || 'none'}
Also provide useful canonicalization:
- normalize aliases
- seed flavor notes if sparse
- production status
- current MSRP or retail estimate per stick (msrp_per_stick)
- secondary/market estimate if relevant (estimated_unit_value)
- replacement cost per stick
- comparable count (number of price references used)
- production/availability status
- valuation_source / confidence / notes
- image_url if a trustworthy product image is known

Valuation rules:
- Per-stick market value is required when available.
- Use production status, limited/discontinued status, vitola, wrapper, brand/line, and source confidence.
- Do not fake precision. Low confidence is acceptable, blank valuation is not when purchase price or comparable data exists.

Enums:
- strength/body: mild | mild_medium | medium | medium_full | full
- production_status: regular_production | limited | discontinued | seasonal | unknown`,
    add_context_from_internet: true,
    response_json_schema: {
      type: 'object',
      properties: {
        brand: { type: ['string', 'null'] },
        line: { type: ['string', 'null'] },
        vitola: { type: ['string', 'null'] },
        country_of_origin: { type: ['string', 'null'] },
        wrapper: { type: ['string', 'null'] },
        binder: { type: ['string', 'null'] },
        filler: { type: ['string', 'null'] },
        strength: { type: ['string', 'null'] },
        body: { type: ['string', 'null'] },
        production_status: { type: ['string', 'null'] },
        flavor_notes: { type: ['array', 'null'], items: { type: 'string' } },
        aliases: { type: ['array', 'null'], items: { type: 'string' } },
        image_url: { type: ['string', 'null'] },
        msrp_per_stick: { type: ['number', 'null'] },
        estimated_unit_value: { type: ['number', 'null'] },
        comparable_count: { type: ['number', 'null'] },
        valuation_source: { type: ['string', 'null'] },
        valuation_confidence: { type: ['string', 'null'] },
        valuation_notes: { type: ['string', 'null'] },
      },
    },
  });

  const updates = {};

  ['brand', 'line', 'vitola', 'country_of_origin', 'wrapper', 'binder', 'filler'].forEach((field) => {
    const next = cleanText(result?.[field]);
    if (next && !cleanText(record?.[field])) updates[field] = next;
  });

  const strength = normalizeIntensityLevel(result?.strength);
  if (strength && !record?.strength) updates.strength = strength;

  const body = normalizeIntensityLevel(result?.body);
  if (body && !record?.body) updates.body = body;

  const productionStatus = normalizeProductionStatus(result?.production_status);
  if (productionStatus && !record?.production_status) updates.production_status = productionStatus;

  const mergedAliases = mergeUniqueCaseInsensitive(record?.aliases || [], cleanArray(result?.aliases));
  if (shouldImproveAliases && mergedAliases.length > 0 && arraysDifferCaseInsensitive(record?.aliases || [], mergedAliases)) {
    updates.aliases = mergedAliases;
  }

  const mergedFlavor = mergeUniqueCaseInsensitive(record?.flavor_notes || [], cleanArray(result?.flavor_notes)).slice(0, MAX_FLAVOR_NOTES);
  if (shouldImproveFlavor && mergedFlavor.length > 0 && arraysDifferCaseInsensitive(record?.flavor_notes || [], mergedFlavor)) {
    updates.flavor_notes = mergedFlavor;
  }

  const imageUrl = cleanText(result?.image_url);
  if (!hasPhoto && imageUrl) {
    updates.photos = [imageUrl];
  }

  if (willRefreshValuation) {
    const valuationPatch = deriveCigarValuationPatch(record, result);
    Object.assign(updates, valuationPatch);
  }

  return updates;
}

async function enrichWine(record) {
  // Skip if manual override is active — never auto-overwrite user's manual valuation.
  if (record?.manual_valuation_enabled) {
    return {};
  }

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a fine wine expert doing data enrichment for a collector app.
Return only high-confidence metadata. Use null when uncertain.

Record:
- name: "${record.name || ''}"
- producer: "${record.producer || ''}"
- vintage: "${record.vintage || ''}"
- varietal: "${record.varietal || ''}"
- region: "${record.region || ''}"
- appellation: "${record.appellation || ''}"
- country_of_origin: "${record.country_of_origin || ''}"
- style: "${record.style || ''}"
- bottle_size: "${record.bottle_size || '750ml'}"
- abv: "${record.abv || ''}"
- purchase_price: "${record.purchase_price || ''}"

Tasks:
1. Fill any missing fields (varietal, region, appellation, country, style, abv) if you know them with high confidence.
2. Estimate current retail/market value per bottle for this vintage/producer/wine.
3. Estimate replacement cost (cost to replace a bottle at current market).
4. Provide comparable_count (number of comparable listings or data points used).
5. Provide valuation_source (e.g. "Wine-Searcher market reference"), valuation_confidence (high/medium/low), and brief valuation_notes.

Rules:
- If vintage is known, use it in valuation — vintage matters significantly.
- If bottle_size is not 750ml, adjust accordingly.
- If only purchase_price is available and you cannot find market data, return estimated_unit_value = purchase_price and valuation_confidence = "low".
- Do not fabricate precision. Low confidence is acceptable, blank valuation is not when purchase price or comparable data exists.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: 'object',
      properties: {
        varietal: { type: ['string', 'null'] },
        region: { type: ['string', 'null'] },
        appellation: { type: ['string', 'null'] },
        country_of_origin: { type: ['string', 'null'] },
        style: { type: ['string', 'null'] },
        abv: { type: ['number', 'null'] },
        drink_window_start: { type: ['string', 'null'] },
        drink_window_end: { type: ['string', 'null'] },
        estimated_unit_value: { type: ['number', 'null'] },
        replacement_cost_estimate: { type: ['number', 'null'] },
        comparable_count: { type: ['number', 'null'] },
        valuation_source: { type: ['string', 'null'] },
        valuation_confidence: { type: ['string', 'null'] },
        valuation_notes: { type: ['string', 'null'] },
      },
    },
  });

  const updates = {};

  ['varietal', 'region', 'appellation', 'country_of_origin', 'style'].forEach((field) => {
    const next = cleanText(result?.[field]);
    if (next && !cleanText(record?.[field])) updates[field] = next;
  });

  if (result?.abv && !record?.abv) updates.abv = result.abv;
  if (result?.drink_window_start && !record?.drink_window_start) updates.drink_window_start = result.drink_window_start;
  if (result?.drink_window_end && !record?.drink_window_end) updates.drink_window_end = result.drink_window_end;

  const valuationPatch = deriveWineValuationPatch(record, result);
  Object.assign(updates, valuationPatch);

  return updates;
}

export default function EnrichButton({ itemType, record, onEnriched }) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleEnrich = async () => {
    setLoading(true);
    try {
      if (itemType === 'blend') {
        const updateData = {};

        // 1. Get Cut from public enrichment data
        const enriched = await base44.functions.invoke('enrichTobaccoBlend', {
          name: record.name,
          manufacturer: record.manufacturer,
          blend_type: record.blend_type,
          strength: record.strength,
          description: record.notes,
        });
        if (enriched?.cut) updateData.cut = enriched.cut;
        if (enriched?.rating) updateData.rating = enriched.rating;

        // 2. Calculate Status from inventory
        const hasOpen = (record.tin_tins_open || 0) > 0 || (record.bulk_open || 0) > 0 || (record.pouch_pouches_open || 0) > 0;
        const hasCellared = (record.tin_tins_cellared || 0) > 0 || (record.bulk_cellared || 0) > 0 || (record.pouch_pouches_cellared || 0) > 0;
        if (hasOpen && hasCellared) updateData.production_status = 'Both';
        else if (hasCellared) updateData.production_status = 'Cellared';
        else if (hasOpen) updateData.production_status = 'Open';

        // 3. Determine Aging from cellar logs
        const cellarLogs = await base44.entities.CellarLog.filter({ blend_id: record.id }, '-date', 100).catch(() => []);
        const hasAgedItems = (cellarLogs || []).some(log => log.transaction_type === 'added' && log.date);
        if (hasAgedItems) updateData.aging_potential = 'Aging';

        if (Object.keys(updateData).length > 0) {
          await base44.entities.TobaccoBlend.update(record.id, updateData);
          toast.success(t('enrichButton.blendSuccess'));
          onEnriched?.({ ...record, ...updateData });
        } else {
          toast.info(t('enrichButton.noUpdates'));
        }
      } else if (itemType === 'pipe') {
        const updates = await enrichPipe(record);
        if (Object.keys(updates).length > 0) {
          await base44.entities.Pipe.update(record.id, updates);
          toast.success(t('enrichButton.fieldsUpdated', { type: t('enrichButton.pipeLabel'), count: Object.keys(updates).length }));
          onEnriched?.({ ...record, ...updates });
        } else {
          toast.info(t('enrichButton.pipeNoUpdates'));
        }
      } else if (itemType === 'bottle') {
        const updates = await enrichBottle(record);
        if (Object.keys(updates).length > 0) {
          await base44.entities.Bottle.update(record.id, updates);
          toast.success(t('enrichButton.fieldsUpdated', { type: t('enrichButton.bottleLabel'), count: Object.keys(updates).length }));
          onEnriched?.({ ...record, ...updates });
        } else {
          toast.info(t('enrichButton.bottleNoUpdates'));
        }
      } else if (itemType === 'cigar') {
        const updates = await enrichCigar(record);
        if (Object.keys(updates).length > 0) {
          await base44.entities.Cigar.update(record.id, updates);
          toast.success(t('enrichButton.fieldsUpdated', { type: t('enrichButton.cigarLabel'), count: Object.keys(updates).length }));
          await Promise.resolve(onEnriched?.({ ...record, ...updates }));
        } else {
          toast.info(t('enrichButton.cigarNoUpdates'));
        }
      } else if (itemType === 'wine') {
        const updates = await enrichWine(record);
        if (Object.keys(updates).length > 0) {
          await base44.entities.Wine.update(record.id, updates);
          const valuationUpdated = updates.market_estimated_unit_value || updates.estimated_unit_value;
          if (valuationUpdated) {
            toast.success(`Wine enriched with valuation — ${Object.keys(updates).length} fields updated`);
          } else {
            toast.success(`Wine enriched — ${Object.keys(updates).length} fields updated`);
          }
          await Promise.resolve(onEnriched?.({ ...record, ...updates }));
        } else {
          toast.info(t("auto.components_shared_EnrichButton.wine_metadata_is_already_complete_try_10nz6g"));
        }
      }
    } catch (e) {
      toast.error(e?.message || t('enrichButton.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleEnrich}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
      {t('enrichButton.action')}
    </Button>
  );
}