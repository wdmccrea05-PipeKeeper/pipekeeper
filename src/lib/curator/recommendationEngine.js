/**
 * Recommendation Engine
 *
 * Main entry point for generating structured Curator recommendations.
 * Uses local collection analysis only — no LLM calls.
 *
 * Covers:
 *   A. Record Optimization   — missing fields, non-canonical values, valuation
 *   B. Collection Optimization — blend balance, utilization, rotation gaps
 *   C. Purchase & Restock    — delegated to purchaseRestockEngine
 *   D. Pairings              — delegated to pairingEngine
 *   E. Grow & Expand         — delegated to growExpandEngine
 *   + Specialization         — delegated to specializationEngine
 */

import {
  createRecommendation,
  computeConfidence,
  CATEGORY,
  ACTION_TYPE,
  MODULE_KEY,
  OWNERSHIP_CONTEXT,
  PRIORITY,
} from './recommendationSchema.js';
import { generateSpecializationRecommendations } from './specializationEngine.js';
import { generatePairingRecommendations } from './pairingEngine.js';
import { generatePurchaseRestockRecommendations } from './purchaseRestockEngine.js';
import { generateGrowExpandRecommendations } from './growExpandEngine.js';

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

// ─── Category A: Record Optimization ─────────────────────────────────────────

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
      missingFields: ['blend type'], // always missing since this item is in the blendsNoType list
      proposedChange: null,
    }));
    const summary = items.length === 1
      ? `${items[0].itemName} has no blend type set — without it, this blend can't contribute to balance calculations or pairing logic.`
      : `${items.length} blends are unclassified. The Curator's rotation and pairing engines are blind to any blend without a type.`;

    recommendations.push(createRecommendation({
      category:           CATEGORY.RECORD_OPTIMIZATION,
      goal:               'blend_missing_type',
      actionType:         ACTION_TYPE.REVIEW_REQUIRED,
      title:              'Blends Missing Classification',
      summary,
      whyItMatters:       'Blend type is the foundation of every recommendation this system makes. ' +
                          'Without it, a blend can\'t be matched to a pipe, placed in a pairing, or factored into collection balance. ' +
                          'These blends are invisible to the intelligence layer.',
      recommendationText: 'Open each blend and assign Virginia, English, Aromatic, Burley, or whichever family applies. ' +
                          'If you\'re unsure, the Curator\'s chat can help identify it from the blend\'s components.',
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

    const summary = inferredCount > 0
      ? `${inferredCount} of ${items.length} blend${items.length > 1 ? 's' : ''} can have strength auto-filled from their blend type — ` +
        `the Curator has inferred the values and is ready to apply them.`
      : `${items.length} blend${items.length > 1 ? 's are' : ' is'} missing a strength rating that can\'t be inferred automatically.`;

    recommendations.push(createRecommendation({
      category:           CATEGORY.RECORD_OPTIMIZATION,
      goal:               'blend_missing_strength',
      actionType,
      title:              'Blends Missing Strength',
      summary,
      whyItMatters:       'Strength rating determines how blends are sequenced in a session, which pipes suit them, ' +
                          'and which whiskeys create a balanced pairing. Missing strength data produces generic advice — not expert advice.',
      recommendationText: inferredCount > 0
        ? `Apply Fix to auto-fill ${inferredCount} inferred value${inferredCount > 1 ? 's' : ''}. ` +
          `${items.length - inferredCount > 0 ? `The remaining ${items.length - inferredCount} need manual entry.` : ''}`
        : 'Open each blend and set the strength manually — check the manufacturer\'s tasting notes or the Curator\'s chat for guidance.',
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

    const criticalField = items.some((i) => i.missingFields.includes('spirit type'));
    const summary = items.length === 1
      ? `${items[0].itemName} is missing ${items[0].missingFields.join(', ')} — the pairing engine can't use it without this data.`
      : `${items.length} bottles have incomplete records. ${criticalField ? 'Spirit type is missing on some — without it, no pairing logic applies.' : 'Missing fields reduce pairing accuracy.'}`;

    recommendations.push(createRecommendation({
      category:           CATEGORY.RECORD_OPTIMIZATION,
      goal:               'bottle_missing_core_metadata',
      actionType:         ACTION_TYPE.REVIEW_REQUIRED,
      title:              'Bottles Missing Core Metadata',
      summary,
      whyItMatters:       'Spirit type, region, and ABV aren\'t just descriptive — they determine which blends and cigars this bottle can be paired with. ' +
                          'An unclassified bottle is pairing-dead to the Curator.',
      recommendationText: 'Open each bottle in WhiskeyKeeper and complete the missing fields. Spirit type is the priority — it unlocks all pairing logic.',
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
    const items = bottlesMissingValue.slice(0, MAX_ITEMS_PER_REC).map((b) => {
      const VALUATION_FIELDS = {
        'retail price':      'retail_price',
        'aftermarket price': 'aftermarket_price',
        'collector value':   'collector_value',
      };
      const missingFields = Object.entries(VALUATION_FIELDS)
        .filter(([, key]) => !b[key])
        .map(([label]) => label);
      return {
        id: b.id,
        recordId: b.id,
        recordType: 'bottle',
        recordName: b.name,
        itemName: b.name,
        ownershipStatus: 'owned',
        missingFields,
      };
    });
    recommendations.push(createRecommendation({
      category:           CATEGORY.RECORD_OPTIMIZATION,
      goal:               'bottle_missing_valuation',
      actionType:         ACTION_TYPE.REVIEW_REQUIRED,
      title:              'Bottles Without Valuation Data',
      summary:            `${items.length} bottle${items.length > 1 ? 's have' : ' has'} no pricing or valuation data — your collection\'s total value is understated.`,
      whyItMatters:       'Valuation data shows you what the collection is actually worth and informs purchase priority. ' +
                          'For collector-grade bottles, aftermarket values can change significantly over time.',
      recommendationText: 'Open each bottle in WhiskeyKeeper to add retail, aftermarket, or collector values. ' +
                          'Even a rough retail estimate is more useful than nothing.',
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
      category:           CATEGORY.RECORD_OPTIMIZATION,
      goal:               'pipe_missing_shape',
      actionType:         ACTION_TYPE.REVIEW_REQUIRED,
      title:              'Pipes Missing Shape Classification',
      summary:            `${items.length} pipe${items.length > 1 ? 's are' : ' is'} missing shape or bowl style — collection diversity analysis is incomplete.`,
      whyItMatters:       'Shape drives bowl volume and smoking characteristics. ' +
                          'Without it, the Curator can\'t assess whether your collection has the right shape diversity for your blend rotation.',
      recommendationText: 'Open each pipe and add the shape. Billiard, Dublin, Bent, Pot — even a rough classification helps.',
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

// ─── Category B: Collection Optimization — Balance ────────────────────────────

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
        const pct = Math.round(ratio * 100);
        const secondType = dominant[1]?.[0];
        const summary = secondType
          ? `${pct}% of your classified blends are ${topType}. The next largest family — ${secondType} — makes up ${Math.round((dominant[1][1] / classified) * 100)}%.`
          : `${pct}% of your classified blends are ${topType}, with no other significant family represented.`;

        const whyItMatters = topType === 'Aromatic'
          ? `An aromatic-only cellar limits pipe rotation and pairing options significantly. Aromatics need dedicated pipes, ` +
            `and their sweetness can clash with the whiskey profiles that suit Virginia and English blends better.`
          : topType === 'English'
          ? `English blends are excellent but demanding — a collection this skewed toward one family ` +
            `may leave you without the right session for every mood or occasion. Variety reduces palate fatigue.`
          : `Heavy concentration in one blend family creates pairing blind spots and limits the session variety ` +
            `that makes a collection genuinely interesting over time.`;

        recommendations.push(createRecommendation({
          category:           CATEGORY.COLLECTION_OPTIMIZATION,
          goal:               'tobacco_type_imbalance',
          actionType:         ACTION_TYPE.ADVISORY,
          title:              'Collection Weighted Heavily Toward One Blend Family',
          summary,
          whyItMatters,
          recommendationText: `Your Grow & Expand recommendations include specific suggestions for which blend family to explore next, ` +
                              `based on your existing ${topType} collection.`,
          moduleKey:          MODULE_KEY.TOBACCO,
          ownershipContext:   OWNERSHIP_CONTEXT.MIXED,
          priority:           PRIORITY.LOW,
          confidence:         computeConfidence({
            preferenceAlignment:   0.6,
            usageHistoryRelevance: 0.5,
            dataCompleteness:      classified >= 8 ? 0.9 : 0.6,
            diversityContribution: 0.8,
          }),
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

// ─── Category B: Collection Optimization — Utilization & Rotation ─────────────

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

    const longestGap = items[0]?.lastUsedDaysAgo;
    const longestBlend = items[0]?.itemName;
    const summary = longestGap
      ? `${longestBlend} hasn't been smoked in ${longestGap} days. ` +
        `${items.length > 1 ? `${items.length - 1} other blend${items.length > 2 ? 's' : ''} are also sitting idle in your cellar.` : ''}`
      : `${items.length} blend${items.length > 1 ? 's' : ''} have stock but haven't been smoked in ${UNDERUSED_BLEND_DAYS}+ days.`;

    recommendations.push(createRecommendation({
      category:           CATEGORY.COLLECTION_OPTIMIZATION,
      goal:               'underused_blends',
      actionType:         ACTION_TYPE.ADVISORY,
      title:              'Cellar Blends to Bring Back',
      summary,
      whyItMatters:       'Virginia and pressed blends in particular change character as they age. ' +
                          'A blend that was too green three months ago may be considerably more interesting today. ' +
                          'Letting stock sit without periodic revisits means you\'re missing the development.',
      recommendationText: 'The oldest-sitting blend in your cellar is listed first. ' +
                          'Pick it for your next session — you may be surprised what time has done.',
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
        category:           CATEGORY.COLLECTION_OPTIMIZATION,
        goal:               'never_smoked_blends',
        actionType:         ACTION_TYPE.ADVISORY,
        title:              'Blends With Stock But No Session History',
        summary:            `${items.length} blend${items.length > 1 ? 's have' : ' has'} stock but no session logged — they're aging without any record.`,
        whyItMatters:       'Blends age whether or not you track them. Logging even one session gives you a reference point ' +
                            'and starts building the data the Curator needs to make pairing and rotation suggestions.',
        recommendationText: 'Pick one and smoke it. Log the session with a few tasting notes and it becomes useful data immediately.',
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

      const longestPipeGap = items[0]?.lastUsedDaysAgo;
      const longestPipeName = items[0]?.itemName;
      const pipeSummary = longestPipeGap
        ? `${longestPipeName} hasn't been lit in ${longestPipeGap} days. ` +
          `${items.length > 1 ? `${items.length - 1} other pipe${items.length > 2 ? 's' : ''} are also sitting unused.` : ''}`
        : `${items.length} pipe${items.length > 1 ? 's haven\'t' : ' hasn\'t'} been used in ${UNDERUSED_PIPE_DAYS}+ days.`;

      recommendations.push(createRecommendation({
        category:           CATEGORY.COLLECTION_OPTIMIZATION,
        goal:               'underused_pipes',
        actionType:         ACTION_TYPE.ADVISORY,
        title:              'Pipes to Reintroduce to Your Rotation',
        summary:            pipeSummary,
        whyItMatters:       'Pipes that sit unused for long periods can dry out and lose cake moisture. ' +
                            'More practically: a pipe you\'ve forgotten the character of isn\'t contributing anything. ' +
                            'Reintroducing it refreshes your rotation and often surfaces unexpected favorites.',
        recommendationText: 'Start with the pipe that\'s been sitting longest. ' +
                            'Give it the blend it performed best with previously — check the smoking log if you\'re not sure.',
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
 * @param {object} context - { pipes, blends, bottles, cigars, smokingLogs, tastingLogs,
 *                             cigarSessions, wantListItems, cigarModuleActive, preferences }
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
      context.smokingLogs || [],
      context.preferences || {}
    ),
    ...generatePairingRecommendations(context),
    ...generateGrowExpandRecommendations({
      pipes:       context.pipes || [],
      blends:      context.blends || [],
      bottles:     context.bottles || [],
      smokingLogs: context.smokingLogs || [],
      preferences: context.preferences || {},
    }),
  ];

  // Deduplicate by goal (keep first occurrence per goal)
  const seen = new Set();
  return allRecommendations.filter((rec) => {
    if (seen.has(rec.goal)) return false;
    seen.add(rec.goal);
    return true;
  });
}
