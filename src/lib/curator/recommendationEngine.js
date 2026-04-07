/**
 * Recommendation Engine
 *
 * Main entry point for generating structured Curator recommendations.
 * Uses local collection analysis only — no LLM calls.
 *
 * Covers:
 *   1. Data & Metadata   — missing fields, non-canonical values
 *   2. Collection Balance — blend type distribution, pipe diversity
 *   3. Utilization        — underused items, rotation gaps
 *   4. Purchase & Restock — low stock, discontinued at risk
 *   5. Specialization     — delegated to specializationEngine
 *   6. Pairing            — delegated to pairingEngine
 */

import {
  createRecommendation,
  CATEGORY,
  ACTION_TYPE,
  MODULE_KEY,
  OWNERSHIP_CONTEXT,
  PRIORITY,
} from './recommendationSchema.js';
import { generateSpecializationRecommendations } from './specializationEngine.js';
import { generatePairingRecommendations } from './pairingEngine.js';
import { generatePurchaseRestockRecommendations } from './purchaseRestockEngine.js';

// ─── Thresholds ───────────────────────────────────────────────────────────────

const UNDERUSED_BLEND_DAYS    = 60;   // blend not used in 60+ days
const UNDERUSED_PIPE_DAYS     = 45;   // pipe not used in 45+ days
const IMBALANCE_THRESHOLD     = 0.70; // 70%+ of one type = imbalance

const MAX_ITEMS_PER_REC = 30;        // hard cap on items per recommendation

// ─── Date helpers ─────────────────────────────────────────────────────────────

function daysSince(dateStr, now = Date.now()) {
  if (!dateStr) return Infinity;
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return Infinity;
  return Math.floor((now - ts) / 86_400_000);
}

function nowMs() {
  return Date.now();
}

// ─── Strength inference by blend type ────────────────────────────────────────

const BLEND_TYPE_STRENGTH_INFERENCE = {
  'Aromatic':          'Mild',
  'Virginia':          'Mild',
  'Virginia/Perique':  'Medium',
  'Virginia/Burley':   'Medium',
  'Virginia/Oriental': 'Medium',
  'Oriental':          'Medium',
  'Burley':            'Medium-Full',
  'English':           'Full',
  'English/Balkan':    'Full',
  'Balkan':            'Full',
};

// ─── Category 1: Data & Metadata ─────────────────────────────────────────────

function analyzeMetadata(context) {
  const { blends = [], pipes = [], bottles = [] } = context;
  const recommendations = [];

  // Blends missing blend_type
  const blendsNoType = blends.filter((b) => !b.blend_type || b.blend_type === '' || b.blend_type === 'Unknown');
  if (blendsNoType.length > 0) {
    const items = blendsNoType.slice(0, MAX_ITEMS_PER_REC).map((b) => ({
      id: b.id,
      recordId: b.id,
      recordType: 'blend',
      recordName: b.name,
      itemName: b.name,
      manufacturer: b.manufacturer || null,
      ownershipStatus: 'owned',
      proposedChange: null,
    }));
    recommendations.push(createRecommendation({
      category:           CATEGORY.METADATA,
      goal:               'blend_missing_type',
      actionType:         ACTION_TYPE.REVIEW_REQUIRED,
      title:              'Blends Missing Classification',
      summary:            `${items.length} blend${items.length > 1 ? 's are' : ' is'} missing a blend type classification`,
      whyItMatters:       'Blend type drives rotation balance calculations, recommendations, and collection analytics',
      recommendationText: 'Review each blend and assign the correct type (Virginia, English, Aromatic, etc.)',
      moduleKey:          MODULE_KEY.TOBACCO,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           items.length >= 5 ? PRIORITY.HIGH : PRIORITY.MEDIUM,
      confidence:         'high',
      items,
      actionPayload: { type: 'open_blend_edit', field: 'blend_type' },
    }));
  }

  // Blends missing strength — infer from blend_type where possible
  const blendsNoStrength = blends.filter((b) => b.blend_type && (!b.strength || b.strength === ''));
  if (blendsNoStrength.length > 0) {
    const items = blendsNoStrength.slice(0, MAX_ITEMS_PER_REC).map((b) => {
      const inferred = BLEND_TYPE_STRENGTH_INFERENCE[b.blend_type] || null;
      return {
        id: b.id,
        recordId: b.id,
        recordType: 'blend',
        recordName: b.name,
        itemName: b.name,
        manufacturer: b.manufacturer || null,
        ownershipStatus: 'owned',
        proposedChange: inferred
          ? { field: 'strength', displayValue: inferred, payload: { strength: inferred } }
          : null,
      };
    });
    const inferredCount = items.filter((i) => i.proposedChange).length;

    // Use AUTO_FIX when we have deterministic inferences — apply_fix skips items without proposals.
    // Fall back to REVIEW_REQUIRED when nothing can be inferred (all blend types are unmapped).
    const actionType = inferredCount > 0 ? ACTION_TYPE.AUTO_FIX : ACTION_TYPE.REVIEW_REQUIRED;

    recommendations.push(createRecommendation({
      category:           CATEGORY.METADATA,
      goal:               'blend_missing_strength',
      actionType,
      title:              'Blends Missing Strength',
      summary:            inferredCount > 0
        ? `${inferredCount} of ${items.length} blend${items.length > 1 ? 's' : ''} can have strength auto-filled from blend type`
        : `${items.length} blend${items.length > 1 ? 's are' : ' is'} missing a strength rating`,
      whyItMatters:       'Strength data helps with session planning, rotation, and pairing suggestions',
      recommendationText: inferredCount > 0
        ? `Apply Fix to auto-fill ${inferredCount} inferred strength value${inferredCount > 1 ? 's' : ''}${items.length - inferredCount > 0 ? ` (${items.length - inferredCount} remain manual)` : ''}`
        : 'Open each blend to add a strength rating manually',
      moduleKey:          MODULE_KEY.TOBACCO,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.LOW,
      confidence:         'high',
      items,
      actionPayload: { type: 'open_blend_edit', field: 'strength' },
    }));
  }

  // Bottles missing core metadata
  const bottlesMissingMeta = bottles.filter(
    (b) => !b.distillery || !b.region || !b.age || !b.abv || !(b.type || b.whiskey_type)
  );
  if (bottlesMissingMeta.length > 0) {
    const items = bottlesMissingMeta.slice(0, MAX_ITEMS_PER_REC).map((b) => {
      const missing = [];
      if (!b.distillery) missing.push('distillery');
      if (!b.region) missing.push('region');
      if (!b.age) missing.push('age');
      if (!b.abv) missing.push('ABV');
      if (!(b.type || b.whiskey_type)) missing.push('spirit type');
      return {
        id: b.id,
        recordId: b.id,
        recordType: 'bottle',
        recordName: b.name,
        itemName: b.name,
        missingFields: missing,
        ownershipStatus: 'owned',
      };
    });
    recommendations.push(createRecommendation({
      category:           CATEGORY.METADATA,
      goal:               'bottle_missing_core_metadata',
      actionType:         ACTION_TYPE.REVIEW_REQUIRED,
      title:              'Bottles Missing Core Metadata',
      summary:            `${items.length} bottle${items.length > 1 ? 's are' : ' is'} missing distillery, region, age, ABV, or spirit type`,
      whyItMatters:       'Core metadata enables accurate pairing recommendations and collection analytics',
      recommendationText: 'Open each bottle in WhiskeyKeeper to complete the missing fields',
      moduleKey:          MODULE_KEY.WHISKEY,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           items.length >= 5 ? PRIORITY.MEDIUM : PRIORITY.LOW,
      confidence:         'high',
      items,
      actionPayload: { type: 'open_bottle_edit' },
    }));
  }

  // Bottles missing valuation
  const bottlesMissingValue = bottles.filter(
    (b) => !b.retail_price && !b.aftermarket_price && !b.collector_value
  );
  if (bottlesMissingValue.length > 0) {
    const items = bottlesMissingValue.slice(0, MAX_ITEMS_PER_REC).map((b) => ({
      id: b.id,
      recordId: b.id,
      recordType: 'bottle',
      recordName: b.name,
      itemName: b.name,
      ownershipStatus: 'owned',
    }));
    recommendations.push(createRecommendation({
      category:           CATEGORY.METADATA,
      goal:               'bottle_missing_valuation',
      actionType:         ACTION_TYPE.REVIEW_REQUIRED,
      title:              'Bottles Without Valuation Data',
      summary:            `${items.length} bottle${items.length > 1 ? 's have' : ' has'} no pricing or valuation data`,
      whyItMatters:       'Valuation data helps track collection worth and supports purchase decisions',
      recommendationText: 'Open each bottle in WhiskeyKeeper to add retail, aftermarket, or collector values',
      moduleKey:          MODULE_KEY.WHISKEY,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.LOW,
      confidence:         'high',
      items,
      actionPayload: { type: 'open_bottle_edit', fields: ['retail_price', 'aftermarket_price', 'collector_value'] },
    }));
  }

  // Pipes missing basic classification (no shape or bowl_style)
  const pipesMissingClass = pipes.filter((p) => !p.shape && !p.bowl_style);
  if (pipesMissingClass.length >= 3) {
    const items = pipesMissingClass.slice(0, MAX_ITEMS_PER_REC).map((p) => ({
      id: p.id,
      recordId: p.id,
      recordType: 'pipe',
      recordName: p.name,
      itemName: p.name,
      maker: p.maker || null,
      ownershipStatus: 'owned',
    }));
    recommendations.push(createRecommendation({
      category:           CATEGORY.METADATA,
      goal:               'pipe_missing_shape',
      actionType:         ACTION_TYPE.REVIEW_REQUIRED,
      title:              'Pipes Missing Shape Classification',
      summary:            `${items.length} pipe${items.length > 1 ? 's are' : ' is'} missing shape or bowl style`,
      whyItMatters:       'Shape data helps identify pipe characteristics and supports collection diversity analysis',
      recommendationText: 'Open each pipe to add shape and bowl style classification',
      moduleKey:          MODULE_KEY.PIPE,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.LOW,
      confidence:         'high',
      items,
      actionPayload: { type: 'open_pipe_edit', fields: ['shape', 'bowl_style'] },
    }));
  }

  return recommendations;
}

// ─── Category 2: Collection Balance ──────────────────────────────────────────

function analyzeBalance(context) {
  const { blends = [], pipes = [] } = context;
  const recommendations = [];

  // Tobacco type distribution
  if (blends.length >= 5) {
    const typeCounts = {};
    for (const b of blends) {
      if (!b.blend_type || b.blend_type === 'Unknown') continue;
      typeCounts[b.blend_type] = (typeCounts[b.blend_type] || 0) + 1;
    }
    const classified = Object.values(typeCounts).reduce((s, n) => s + n, 0);
    const dominant = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    if (dominant.length > 0 && classified > 0) {
      const [topType, topCount] = dominant[0];
      const ratio = topCount / classified;
      if (ratio >= IMBALANCE_THRESHOLD && classified >= 5) {
        recommendations.push(createRecommendation({
          category:           CATEGORY.BALANCE,
          goal:               'tobacco_type_imbalance',
          actionType:         ACTION_TYPE.ADVISORY,
          title:              'Blend Collection Heavily Weighted Toward One Type',
          summary:            `${Math.round(ratio * 100)}% of your classified blends are ${topType} — consider exploring other families`,
          whyItMatters:       'Diverse blend types enable more varied sessions, pairing opportunities, and pipe rotation',
          recommendationText: `Explore blends outside ${topType} to broaden your palate and collection versatility`,
          moduleKey:          MODULE_KEY.TOBACCO,
          ownershipContext:   OWNERSHIP_CONTEXT.MIXED,
          priority:           PRIORITY.LOW,
          confidence:         'high',
          items:              blends.filter((b) => b.blend_type === topType).slice(0, MAX_ITEMS_PER_REC).map((b) => ({
            id: b.id,
            recordId: b.id,
            recordType: 'blend',
            recordName: b.name,
            itemName: b.name,
            ownershipStatus: 'owned',
          })),
          actionPayload: {
            type:        'balance_insight',
            topType,
            ratio:       Math.round(ratio * 100),
            totalTyped:  classified,
          },
        }));
      }
    }
  }

  return recommendations;
}

// ─── Category 3: Utilization & Rotation ──────────────────────────────────────

function analyzeUtilization(context) {
  const { blends = [], pipes = [], smokingLogs = [] } = context;
  const recommendations = [];
  const now = nowMs();

  // Build last-used maps
  const blendLastUsed = {};
  const pipeLastUsed  = {};
  for (const log of smokingLogs) {
    if (log.blend_id && log.date) {
      const ts = new Date(log.date).getTime();
      if (!blendLastUsed[log.blend_id] || ts > blendLastUsed[log.blend_id]) {
        blendLastUsed[log.blend_id] = ts;
      }
    }
    if (log.pipe_id && log.date) {
      const ts = new Date(log.date).getTime();
      if (!pipeLastUsed[log.pipe_id] || ts > pipeLastUsed[log.pipe_id]) {
        pipeLastUsed[log.pipe_id] = ts;
      }
    }
  }

  // Underused blends
  const blendsWithStock = blends.filter((b) => (b.tin_total_quantity_oz || 0) > 0);
  const underusedBlends = blendsWithStock.filter((b) => {
    const lastUsedTs = blendLastUsed[b.id];
    if (!lastUsedTs) return smokingLogs.length > 0; // never used when logs exist
    return (now - lastUsedTs) / 86_400_000 > UNDERUSED_BLEND_DAYS;
  }).sort((a, b) => {
    const aTs = blendLastUsed[a.id] || 0;
    const bTs = blendLastUsed[b.id] || 0;
    return aTs - bTs; // oldest first
  });

  if (underusedBlends.length >= 2) {
    const items = underusedBlends.slice(0, MAX_ITEMS_PER_REC).map((b) => {
      const lastUsedTs = blendLastUsed[b.id];
      const daysAgo = lastUsedTs ? Math.floor((now - lastUsedTs) / 86_400_000) : null;
      return {
        id: b.id,
        recordId: b.id,
        recordType: 'blend',
        recordName: b.name,
        itemName: b.name,
        manufacturer: b.manufacturer || null,
        qty: b.tin_total_quantity_oz,
        lastUsedDaysAgo: daysAgo,
        ownershipStatus: 'owned',
      };
    });

    recommendations.push(createRecommendation({
      category:           CATEGORY.UTILIZATION,
      goal:               'underused_blends',
      actionType:         ACTION_TYPE.ADVISORY,
      title:              'Underused Blends to Revisit',
      summary:            `${items.length} blend${items.length > 1 ? 's' : ''} in your cellar haven't been smoked in ${UNDERUSED_BLEND_DAYS}+ days`,
      whyItMatters:       'Rotating through your cellar keeps blends fresh in your memory and prevents stock sitting untouched',
      recommendationText: 'Pick one of these blends for your next session',
      moduleKey:          MODULE_KEY.TOBACCO,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.MEDIUM,
      confidence:         'high',
      items,
      actionPayload: { type: 'view_blends', filter: 'underused' },
    }));
  }

  // Never-used blends (stock present, zero log entries)
  if (smokingLogs.length > 0) {
    const neverUsedBlends = blends.filter(
      (b) => (b.tin_total_quantity_oz || 0) > 0 && !blendLastUsed[b.id]
    );
    if (neverUsedBlends.length >= 2) {
      const items = neverUsedBlends.slice(0, MAX_ITEMS_PER_REC).map((b) => ({
        id: b.id,
        recordId: b.id,
        recordType: 'blend',
        recordName: b.name,
        itemName: b.name,
        manufacturer: b.manufacturer || null,
        qty: b.tin_total_quantity_oz,
        ownershipStatus: 'owned',
      }));
      recommendations.push(createRecommendation({
        category:           CATEGORY.UTILIZATION,
        goal:               'never_smoked_blends',
        actionType:         ACTION_TYPE.ADVISORY,
        title:              'Blends Never Logged',
        summary:            `${items.length} blend${items.length > 1 ? 's have' : ' has'} stock but no smoking sessions recorded`,
        whyItMatters:       'These blends are aging but not being tracked — log a session to build your usage history',
        recommendationText: 'Try one and log your first session',
        moduleKey:          MODULE_KEY.TOBACCO,
        ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
        priority:           PRIORITY.LOW,
        confidence:         'high',
        items,
        actionPayload: { type: 'view_blends', filter: 'never_used' },
      }));
    }
  }

  // Underused pipes
  if (smokingLogs.length > 0) {
    const underusedPipes = pipes.filter((p) => {
      const lastUsedTs = pipeLastUsed[p.id];
      if (!lastUsedTs) return true; // never used
      return (now - lastUsedTs) / 86_400_000 > UNDERUSED_PIPE_DAYS;
    }).sort((a, b) => {
      const aTs = pipeLastUsed[a.id] || 0;
      const bTs = pipeLastUsed[b.id] || 0;
      return aTs - bTs;
    });

    if (underusedPipes.length >= 2) {
      const items = underusedPipes.slice(0, MAX_ITEMS_PER_REC).map((p) => {
        const lastUsedTs = pipeLastUsed[p.id];
        const daysAgo = lastUsedTs ? Math.floor((now - lastUsedTs) / 86_400_000) : null;
        return {
          id: p.id,
          recordId: p.id,
          recordType: 'pipe',
          recordName: p.name,
          itemName: p.name,
          maker: p.maker || null,
          lastUsedDaysAgo: daysAgo,
          ownershipStatus: 'owned',
        };
      });
      recommendations.push(createRecommendation({
        category:           CATEGORY.UTILIZATION,
        goal:               'underused_pipes',
        actionType:         ACTION_TYPE.ADVISORY,
        title:              'Pipes to Bring Back Into Rotation',
        summary:            `${items.length} pipe${items.length > 1 ? 's haven\'t' : ' hasn\'t'} been used in ${UNDERUSED_PIPE_DAYS}+ days`,
        whyItMatters:       'Regular rotation prevents pipes from sitting unused and helps you remember each pipe\'s character',
        recommendationText: 'Pick one of these pipes for your next session',
        moduleKey:          MODULE_KEY.PIPE,
        ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
        priority:           PRIORITY.MEDIUM,
        confidence:         'high',
        items,
        actionPayload: { type: 'view_pipes', filter: 'underused' },
      }));
    }
  }

  return recommendations;
}

// ─── Main Engine Entry Point ──────────────────────────────────────────────────

/**
 * Generate all structured recommendations for a collection.
 *
 * @param {object} context - { pipes, blends, bottles, cigars, smokingLogs, tastingLogs, cigarSessions, wantListItems, cigarModuleActive }
 * @returns {import('./recommendationSchema.js').Recommendation[]}
 */
export function generateRecommendations(context = {}) {
  const allRecommendations = [
    ...analyzeMetadata(context),
    ...analyzeBalance(context),
    ...analyzeUtilization(context),
    ...generatePurchaseRestockRecommendations({
      blends:             context.blends || [],
      bottles:            context.bottles || [],
      cigars:             context.cigars || [],
      wantListItems:      context.wantListItems || [],
      cigarModuleActive:  context.cigarModuleActive || false,
    }),
    ...generateSpecializationRecommendations(
      context.pipes || [],
      context.blends || [],
      context.smokingLogs || []
    ),
    ...generatePairingRecommendations(context),
  ];

  // Deduplicate by goal (keep first occurrence per goal)
  const seen = new Set();
  return allRecommendations.filter((rec) => {
    if (seen.has(rec.goal)) return false;
    seen.add(rec.goal);
    return true;
  });
}
