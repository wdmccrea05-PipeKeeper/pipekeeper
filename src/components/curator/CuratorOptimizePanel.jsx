import React, { useMemo, useState } from 'react';
import { useNavigate } from '@/components/utils/navigation';
import { createPageUrl } from '@/components/utils/createPageUrl';
import {
  CheckCircle2,
  X,
  MessageCircle,
  ChevronRight,
  Eye,
  HelpCircle,
  SplitSquareVertical,
  ExternalLink,
} from 'lucide-react';
import {
  generateProactiveInsights,
  INSIGHT_SCOPE,
  INSIGHT_SEVERITY,
  INSIGHT_CATEGORIES,
} from '@/platform/proactiveInsights';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  RECOMMENDATION_CLASS,
  getRecommendationClassLabel,
  getRecommendationClassColor,
  getRecommendationClassBg,
} from './recommendationActionTypes';

// ─── Section definitions ──────────────────────────────────────────────────────

const OPTIMIZE_SECTIONS = [
  {
    key: 'data_metadata',
    emoji: '📊',
    title: 'Data & Metadata',
    desc: 'Missing fields, classification gaps, and valuation data',
  },
  {
    key: 'collection_health',
    emoji: '🏛️',
    title: 'Collection Health',
    desc: 'Diversity, balance, and composition across your collection',
  },
  {
    key: 'utilization',
    emoji: '🔄',
    title: 'Utilization & Rotation',
    desc: 'Underused items, aging opportunities, and rotation gaps',
  },
  {
    key: 'purchase_restock',
    emoji: '🛒',
    title: 'Purchase & Restock',
    desc: 'Low stock, wishlist promotions, and gap-filling next purchases',
  },
  {
    key: 'specialization',
    emoji: '🎯',
    title: 'Specialization & Strategy',
    desc: 'Pipe specialization suggestions and collection strategy',
  },
  {
    key: 'pairing',
    emoji: '🍷',
    title: 'Pairing & Experience',
    desc: 'Pairing coverage, session planning, and cross-module opportunities',
  },
];

const DEFAULT_SECTION = 'collection_health';

// ─── Module filter definitions ────────────────────────────────────────────────

const MODULE_PILLS = [
  { key: 'all', label: 'All' },
  { key: 'pipe', label: 'Pipe' },
  { key: 'tobacco', label: 'Tobacco' },
  { key: 'cigar', label: 'Cigar' },
  { key: 'whiskey', label: 'Whiskey' },
];

// ─── Section-level card ranking priorities ────────────────────────────────────

const RECCLASS_PRIORITY = {
  [RECOMMENDATION_CLASS.AUTO_FIX]: 0,
  [RECOMMENDATION_CLASS.MULTI_PATH]: 1,
  [RECOMMENDATION_CLASS.REVIEW_REQUIRED]: 2,
  [RECOMMENDATION_CLASS.ADVISORY]: 3,
};

const SEVERITY_PRIORITY_MAP = {
  [INSIGHT_SEVERITY.HIGH]: 0,
  [INSIGHT_SEVERITY.MEDIUM]: 1,
  [INSIGHT_SEVERITY.LOW]: 2,
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function plural(count, singular, pluralForm) {
  return count === 1 ? singular : (pluralForm || singular + 's');
}
function has(count) { return count === 1 ? 'has' : 'have'; }
function is(count) { return count === 1 ? 'is' : 'are'; }
function uses(count) { return count === 1 ? 'uses' : 'use'; }

function getModuleKey(card) {
  if (card.module) return card.module;
  if (card.scope === INSIGHT_SCOPE.PIPE) return 'pipe';
  if (card.scope === INSIGHT_SCOPE.TOBACCO) return 'tobacco';
  if (card.scope === 'cigar') return 'cigar';
  if (card.scope === 'whiskey') return 'whiskey';
  return null;
}

function getModuleName(moduleKey) {
  switch (moduleKey) {
    case 'pipekeeper': case 'pipe': return 'PipeKeeper';
    case 'tobacco': return 'your tobacco collection';
    case 'cigarkeeper': case 'cigar': return 'CigarKeeper';
    case 'whiskeykeeper': case 'whiskey': return 'WhiskeyKeeper';
    default: return 'your collection';
  }
}

function getModuleRoute(moduleKey) {
  switch (moduleKey) {
    case 'pipekeeper': case 'pipe': case 'tobacco': return createPageUrl('PipeKeeper');
    case 'cigarkeeper': case 'cigar': return createPageUrl('CigarKeeper');
    case 'whiskeykeeper': case 'whiskey': return createPageUrl('WhiskeyKeeper');
    default: return null;
  }
}

function severityColor(severity) {
  if (severity === INSIGHT_SEVERITY.HIGH) return '#E05252';
  if (severity === INSIGHT_SEVERITY.MEDIUM) return '#C89752';
  return '#4A7C9C';
}

function severityBg(severity) {
  if (severity === INSIGHT_SEVERITY.HIGH) return 'rgba(224,82,82,0.12)';
  if (severity === INSIGHT_SEVERITY.MEDIUM) return 'rgba(200,151,82,0.12)';
  return 'rgba(74,124,156,0.12)';
}

function impactLabel(severity) {
  if (severity === INSIGHT_SEVERITY.HIGH) return 'High';
  if (severity === INSIGHT_SEVERITY.MEDIUM) return 'Medium';
  return 'Low';
}

/** Map a proactive insight category to a section key */
function insightToSectionKey(insight) {
  switch (insight.category) {
    case INSIGHT_CATEGORIES.ROTATION:
    case INSIGHT_CATEGORIES.USAGE_PATTERN:
    case INSIGHT_CATEGORIES.AGING:
      return 'utilization';
    case INSIGHT_CATEGORIES.DIVERSITY:
    case INSIGHT_CATEGORIES.COLLECTION_HEALTH:
      return 'collection_health';
    case INSIGHT_CATEGORIES.PAIRING:
      return 'pairing';
    case INSIGHT_CATEGORIES.INVENTORY:
    case INSIGHT_CATEGORIES.ACQUISITION:
      return 'purchase_restock';
    case INSIGHT_CATEGORIES.VALUE:
    case INSIGHT_CATEGORIES.MAINTENANCE:
      return 'data_metadata';
    default:
      return DEFAULT_SECTION;
  }
}

/** Convert a proactive insight to a card object */
function insightToCard(insight) {
  return {
    id: insight.id,
    title: insight.title,
    whatWeFound: insight.summary,
    whyItMatters: insight.reason,
    recommendedAction: insight.suggested_action,
    severity: insight.severity,
    scope: insight.scope,
    module: null,
    suggestions: insight.suggestions || [],
    recommendationClass: RECOMMENDATION_CLASS.ADVISORY,
    category: insight.category,
    relatedItems: insight.related_items || [],
    section: insightToSectionKey(insight),
  };
}

// ─── Data & Metadata generators ───────────────────────────────────────────────

function buildDataMetadataCards(pipes, blends, cigars, bottles) {
  const cards = [];

  // --- Pipes ---
  const pipesNoPhoto = pipes.filter((p) => !p.photos?.length && !p.photo);
  if (pipesNoPhoto.length > 0) {
    cards.push({
      id: 'qw_pipes_no_photo',
      title: `${pipesNoPhoto.length} ${plural(pipesNoPhoto.length, 'Pipe')} Without Photos`,
      whatWeFound: `${pipesNoPhoto.length} ${plural(pipesNoPhoto.length, 'pipe')} in your collection ${has(pipesNoPhoto.length)} no photos. Review & Apply Fix will open PipeKeeper so you can add them.`,
      whyItMatters: 'Photos improve collection presentation, help the AI identification feature, and make records more useful when reviewing your collection.',
      recommendedAction: 'Open PipeKeeper and add at least one photo per affected pipe. Each pipe benefits from a photo of the bowl and one of the full pipe.',
      severity: INSIGHT_SEVERITY.LOW,
      module: 'pipe',
      section: 'data_metadata',
      suggestions: pipesNoPhoto.slice(0, 5).map((p) => p.name || 'Unnamed Pipe'),
      recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
    });
  }

  const pipesNoShape = pipes.filter((p) => !p.shape && !p.pipe_shape);
  if (pipesNoShape.length > 0) {
    cards.push({
      id: 'rc_pipe_shape',
      title: `${pipesNoShape.length} ${plural(pipesNoShape.length, 'Pipe')} Missing Shape Classification`,
      whatWeFound: `${pipesNoShape.length} ${plural(pipesNoShape.length, 'pipe')} ${is(pipesNoShape.length)} missing a shape classification. Shape affects pairing recommendations and session planning.`,
      whyItMatters: 'Shape classification lets the Curator match pipes to appropriate tobacco types and session lengths. Billiards, bent pipes, and Canadians each have different characteristics.',
      recommendedAction: 'Open PipeKeeper and assign the correct shape (billiard, bent, bulldog, Canadian, etc.) to each pipe. Review & Apply Fix navigates there.',
      severity: INSIGHT_SEVERITY.LOW,
      module: 'pipe',
      section: 'data_metadata',
      suggestions: pipesNoShape.slice(0, 5).map((p) => p.name || 'Unnamed Pipe'),
      recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
    });
  }

  const pipesGeneric = pipes.filter((p) => p.pipe_type === 'Other' || p.material === 'Other');
  if (pipesGeneric.length > 0) {
    cards.push({
      id: 'rc_pipe_generic',
      title: `${pipesGeneric.length} ${plural(pipesGeneric.length, 'Pipe')} Using Generic "Other" Classification`,
      whatWeFound: `${pipesGeneric.length} ${plural(pipesGeneric.length, 'pipe')} ${uses(pipesGeneric.length)} a generic "Other" type or material. This reduces the Curator's ability to make specific recommendations.`,
      whyItMatters: 'Specific material values (briar, meerschaum, clay, morta) enable better pairing and aging advice. "Other" is a placeholder that should be updated.',
      recommendedAction: 'Update these pipes with more specific type or material values. Review & Apply Fix opens PipeKeeper.',
      severity: INSIGHT_SEVERITY.LOW,
      module: 'pipe',
      section: 'data_metadata',
      suggestions: pipesGeneric.slice(0, 5).map((p) => p.name || 'Unnamed Pipe'),
      recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
    });
  }

  // --- Blends ---
  const blendsNoType = blends.filter((b) => !b.blend_type && !b.blend_family);
  if (blendsNoType.length > 0) {
    cards.push({
      id: 'qw_blends_no_type',
      title: `${blendsNoType.length} ${plural(blendsNoType.length, 'Blend')} Without Family Classification`,
      whatWeFound: `${blendsNoType.length} ${plural(blendsNoType.length, 'blend')} ${has(blendsNoType.length)} no blend family assigned. Examples: ${blendsNoType.slice(0, 3).map((b) => b.name || 'Unnamed').join(', ')}${blendsNoType.length > 3 ? ` and ${blendsNoType.length - 3} more` : ''}.`,
      whyItMatters: 'Blend family (Virginia, Burley, English/Latakia, Aromatic, etc.) is required for diversity analysis, pipe pairing suggestions, and rotation planning.',
      recommendedAction: 'Applying this opens PipeKeeper where you can assign blend families to the affected blends. Review Details asks the Curator to help classify them.',
      severity: INSIGHT_SEVERITY.MEDIUM,
      module: 'tobacco',
      section: 'data_metadata',
      suggestions: blendsNoType.slice(0, 5).map((b) => b.name || 'Unnamed Blend'),
      recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
    });
  }

  const blendsUnknown = blends.filter((b) => b.blend_type === 'Unknown' || b.blend_family === 'Unknown');
  if (blendsUnknown.length > 0) {
    cards.push({
      id: 'rc_blend_unknown',
      title: `${blendsUnknown.length} ${plural(blendsUnknown.length, 'Blend')} Classified as "Unknown"`,
      whatWeFound: `${blendsUnknown.length} ${plural(blendsUnknown.length, 'blend')} ${is(blendsUnknown.length)} classified as "Unknown" type. This is a placeholder that weakens diversity calculations and pairing suggestions.`,
      whyItMatters: '"Unknown" classifications are treated as unclassified — excluded from diversity scoring and pairing recommendations, making your collection appear less rich than it is.',
      recommendedAction: 'Research and update the blend family for these blends. Review Details asks the Curator to help identify the correct type for each one.',
      severity: INSIGHT_SEVERITY.MEDIUM,
      module: 'tobacco',
      section: 'data_metadata',
      suggestions: blendsUnknown.slice(0, 5).map((b) => b.name || 'Unnamed Blend'),
      recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
    });
  }

  const blendsNoStrength = blends.filter((b) => !b.strength && !b.nicotine_strength);
  if (blendsNoStrength.length > 0 && blends.length >= 3) {
    cards.push({
      id: 'rc_blend_no_strength',
      title: `${blendsNoStrength.length} ${plural(blendsNoStrength.length, 'Blend')} Missing Strength Rating`,
      whatWeFound: `${blendsNoStrength.length} ${plural(blendsNoStrength.length, 'blend')} ${has(blendsNoStrength.length)} no strength rating. Adding strength data enables better session matching and Curator recommendations.`,
      whyItMatters: 'Strength data (mild, medium, full) lets the Curator suggest appropriate blends for different session types and helps build your preference profile.',
      recommendedAction: 'Open PipeKeeper and add a strength rating to each affected blend. Review & Apply Fix navigates there.',
      severity: INSIGHT_SEVERITY.LOW,
      module: 'tobacco',
      section: 'data_metadata',
      suggestions: blendsNoStrength.slice(0, 5).map((b) => b.name || 'Unnamed Blend'),
      recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
    });
  }

  // --- Cigars ---
  const cigarsNoSize = cigars.filter((c) => !c.vitola && !c.size && !c.ring_gauge);
  if (cigarsNoSize.length > 0) {
    cards.push({
      id: 'qw_cigars_no_size',
      title: `${cigarsNoSize.length} ${plural(cigarsNoSize.length, 'Cigar')} Missing Size Details`,
      whatWeFound: `${cigarsNoSize.length} ${plural(cigarsNoSize.length, 'cigar')} ${is(cigarsNoSize.length)} missing vitola or size information. Vitola and ring gauge are required for proper categorization.`,
      whyItMatters: 'Size details enable better categorization and balance analysis. They also affect smoke time estimates and pairing suggestions for sessions.',
      recommendedAction: 'Add vitola or size data to each affected cigar. Review & Apply Fix opens CigarKeeper.',
      severity: INSIGHT_SEVERITY.LOW,
      module: 'cigar',
      section: 'data_metadata',
      suggestions: cigarsNoSize.slice(0, 5).map((c) => c.name || 'Unnamed Cigar'),
      recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
    });
  }

  const cigarsNoWrapper = cigars.filter((c) => !c.wrapper && !c.wrapper_country);
  if (cigarsNoWrapper.length > 0) {
    cards.push({
      id: 'rc_cigar_wrapper',
      title: `${cigarsNoWrapper.length} ${plural(cigarsNoWrapper.length, 'Cigar')} Missing Wrapper Details`,
      whatWeFound: `${cigarsNoWrapper.length} ${plural(cigarsNoWrapper.length, 'cigar')} ${is(cigarsNoWrapper.length)} missing wrapper leaf or country of origin — key fields for flavor profile analysis.`,
      whyItMatters: 'Wrapper information drives flavor profile analysis, regional pairing suggestions, and diversity scoring. Colorado Claro, Maduro, and Natural wrappers have very different profiles.',
      recommendedAction: 'Add wrapper details to each affected cigar. Review & Apply Fix opens CigarKeeper.',
      severity: INSIGHT_SEVERITY.LOW,
      module: 'cigar',
      section: 'data_metadata',
      suggestions: cigarsNoWrapper.slice(0, 5).map((c) => c.name || 'Unnamed Cigar'),
      recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
    });
  }

  // --- Bottles ---
  const bottlesNoType = bottles.filter(
    (b) => !b.whiskey_type && !b.spirit_type && !b.category && !b.type
  );
  if (bottlesNoType.length > 0) {
    cards.push({
      id: 'qw_bottles_no_type',
      title: `${bottlesNoType.length} ${plural(bottlesNoType.length, 'Bottle')} Without Spirit Type`,
      whatWeFound: `${bottlesNoType.length} ${plural(bottlesNoType.length, 'bottle')} ${is(bottlesNoType.length)} missing spirit type. Examples: ${bottlesNoType.slice(0, 3).map((b) => b.name || 'Unnamed').join(', ')}${bottlesNoType.length > 3 ? ` and ${bottlesNoType.length - 3} more` : ''}.`,
      whyItMatters: 'Spirit type (Scotch, Bourbon, Irish, Japanese, etc.) is essential for collection diversity analysis, flavor profiling, and cross-module pairing with cigars or tobacco.',
      recommendedAction: 'Classify each bottle with its spirit type. Review & Apply Fix opens WhiskeyKeeper.',
      severity: INSIGHT_SEVERITY.LOW,
      module: 'whiskey',
      section: 'data_metadata',
      suggestions: bottlesNoType.slice(0, 5).map((b) => b.name || 'Unnamed Bottle'),
      recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
    });
  }

  const bottlesNoDistillery = bottles.filter((b) => !b.distillery && !b.producer && !b.brand);
  if (bottlesNoDistillery.length > 0) {
    cards.push({
      id: 'rc_bottle_distillery',
      title: `${bottlesNoDistillery.length} ${plural(bottlesNoDistillery.length, 'Bottle')} Missing Producer/Distillery`,
      whatWeFound: `${bottlesNoDistillery.length} ${plural(bottlesNoDistillery.length, 'bottle')} ${is(bottlesNoDistillery.length)} missing distillery or producer details. This weakens your whiskey collection profile.`,
      whyItMatters: 'Distillery data enables regional analysis, helps build a producer-level view of your collection, and improves the accuracy of pairing and acquisition recommendations.',
      recommendedAction: 'Add the distillery or producer name for each bottle. Review & Apply Fix opens WhiskeyKeeper.',
      severity: INSIGHT_SEVERITY.LOW,
      module: 'whiskey',
      section: 'data_metadata',
      suggestions: bottlesNoDistillery.slice(0, 5).map((b) => b.name || 'Unnamed Bottle'),
      recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
    });
  }

  const bottlesNoValue = bottles.filter(
    (b) => !b.purchase_price && !b.retail_price && !b.aftermarket_price && !b.collector_value
  );
  if (bottlesNoValue.length > 0) {
    cards.push({
      id: 'rc_bottle_no_value',
      title: `${bottlesNoValue.length} ${plural(bottlesNoValue.length, 'Bottle')} Missing Valuation Data`,
      whatWeFound: `${bottlesNoValue.length} ${plural(bottlesNoValue.length, 'bottle')} ${has(bottlesNoValue.length)} no price or value data (no purchase price, retail price, or collector value). Portfolio valuation reports are incomplete without this.`,
      whyItMatters: 'Valuation data enables portfolio analysis, insurance estimates, and identification of which bottles represent the highest value in your collection.',
      recommendedAction: 'Open WhiskeyKeeper and add at least a purchase price for each affected bottle. Review & Apply Fix navigates there.',
      severity: INSIGHT_SEVERITY.LOW,
      module: 'whiskey',
      section: 'data_metadata',
      suggestions: bottlesNoValue.slice(0, 5).map((b) => b.name || 'Unnamed Bottle'),
      recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
    });
  }

  return cards;
}

// ─── Restock & low-stock generators ──────────────────────────────────────────

function buildRestockCards(blends, bottles) {
  const cards = [];

  const lowBlends = blends.filter((b) => {
    const totalOz =
      Number(b.tin_total_quantity_oz || 0) +
      Number(b.bulk_total_quantity_oz || 0) +
      Number(b.pouch_total_quantity_oz || 0);
    return totalOz > 0 && totalOz < 2;
  });
  if (lowBlends.length > 0) {
    cards.push({
      id: 'rst_low_blend_stock',
      title: `${lowBlends.length} ${plural(lowBlends.length, 'Blend')} Running Low (Under 2oz)`,
      whatWeFound: `${lowBlends.length} ${plural(lowBlends.length, 'blend')} in your cellar ${has(lowBlends.length)} under 2oz remaining: ${lowBlends.slice(0, 3).map((b) => b.name).join(', ')}${lowBlends.length > 3 ? ` and ${lowBlends.length - 3} more` : ''}.`,
      whyItMatters: 'Running out of preferred blends without a plan breaks your rotation. Early action is especially important for discontinued or seasonal blends.',
      recommendedAction: 'View Items opens PipeKeeper so you can review these blends and add restock reminders or shopping list entries.',
      severity: INSIGHT_SEVERITY.MEDIUM,
      module: 'tobacco',
      section: 'purchase_restock',
      suggestions: lowBlends.slice(0, 5).map((b) => {
        const oz = (
          Number(b.tin_total_quantity_oz || 0) + Number(b.bulk_total_quantity_oz || 0)
        ).toFixed(1);
        return `${b.name} — ${oz}oz remaining`;
      }),
      recommendationClass: RECOMMENDATION_CLASS.ADVISORY,
    });
  }

  const openNoBackup = blends.filter((b) => {
    const hasOpen =
      Number(b.tin_tins_open || 0) > 0 || Number(b.bulk_open || 0) > 0;
    const hasCellared =
      Number(b.tin_tins_cellared || 0) > 0 || Number(b.bulk_cellared || 0) > 0;
    return hasOpen && !hasCellared;
  });
  if (openNoBackup.length > 0) {
    cards.push({
      id: 'rst_open_no_cellar',
      title: `${openNoBackup.length} Open ${plural(openNoBackup.length, 'Blend')} Without Cellar Backup`,
      whatWeFound: `${openNoBackup.length} ${plural(openNoBackup.length, 'blend')} ${has(openNoBackup.length)} an open tin or bulk pouch but no cellared backup. Once this runs out, there is no ready replacement.`,
      whyItMatters: 'Open blends with no cellared reserve are at risk of depleting completely. Cellar depth protects your rotation and provides aging stock for long-term enjoyment.',
      recommendedAction: 'View Items opens PipeKeeper so you can see which blends need backup. Consider adding a tin or bulk supply to the cellar for each.',
      severity: INSIGHT_SEVERITY.MEDIUM,
      module: 'tobacco',
      section: 'purchase_restock',
      suggestions: openNoBackup.slice(0, 5).map((b) => b.name),
      recommendationClass: RECOMMENDATION_CLASS.ADVISORY,
    });
  }

  return cards;
}

// ─── Wishlist promotion generators ───────────────────────────────────────────

function buildWishlistPromotionCards(wantListItems, blends, bottles, pipes) {
  const cards = [];
  const wishlistItems = (wantListItems || []).filter((i) => i.category === 'wishlist');
  if (wishlistItems.length === 0) return cards;

  const blendFamilies = new Set(
    blends.map((b) => b.blend_type || b.blend_family).filter(Boolean)
  );
  const bottleTypes = new Set(
    bottles.map((b) => b.whiskey_type || b.spirit_type || b.type).filter(Boolean)
  );

  const blendWishlist = wishlistItems.filter(
    (i) => i.item_type === 'blend' || i.item_type === 'tobacco_tin' || i.item_type === 'tobacco_bulk'
  );
  const bottleWishlist = wishlistItems.filter((i) => i.item_type === 'bottle');
  const pipeWishlist = wishlistItems.filter((i) => i.item_type === 'pipe');

  if (blendWishlist.length > 0) {
    const hasBlendDiversityGap = blendFamilies.size < 3 && blends.length >= 3;
    const gapNote = hasBlendDiversityGap
      ? ` Your cellar has limited blend diversity (${blendFamilies.size} ${plural(blendFamilies.size, 'family', 'families')} represented) — these wishlist blends could improve coverage.`
      : '';
    cards.push({
      id: 'wl_blend_wishlist',
      title: `${blendWishlist.length} Wishlist ${plural(blendWishlist.length, 'Blend')} Ready to Prioritize`,
      whatWeFound: `You have ${blendWishlist.length} ${plural(blendWishlist.length, 'blend')} on your wishlist.${gapNote} Approve Changes opens your Want List where you can move items to shopping list.`,
      whyItMatters: hasBlendDiversityGap
        ? 'Filling blend diversity gaps improves your rotation variety, pairing options, and the quality of Curator recommendations.'
        : 'Keeping your wishlist and shopping list current ensures your acquisition pipeline reflects your actual priorities.',
      recommendedAction: `Review these ${blendWishlist.length} wishlist ${plural(blendWishlist.length, 'blend')} and move gap-filling or high-priority candidates to your shopping list. Approve Changes opens your Want List.`,
      severity: hasBlendDiversityGap ? INSIGHT_SEVERITY.MEDIUM : INSIGHT_SEVERITY.LOW,
      module: 'tobacco',
      section: 'purchase_restock',
      suggestions: blendWishlist.slice(0, 5).map((i) => i.name),
      recommendationClass: hasBlendDiversityGap
        ? RECOMMENDATION_CLASS.REVIEW_REQUIRED
        : RECOMMENDATION_CLASS.ADVISORY,
      navigateTo: createPageUrl('WantList'),
    });
  }

  if (bottleWishlist.length > 0) {
    const hasBottleTypeGap = bottleTypes.size < 3 && bottles.length >= 3;
    const gapNote = hasBottleTypeGap
      ? ` Your whiskey collection has limited type diversity (${bottleTypes.size} ${plural(bottleTypes.size, 'type')} represented) — these bottles could fill gaps.`
      : '';
    cards.push({
      id: 'wl_bottle_wishlist',
      title: `${bottleWishlist.length} Wishlist ${plural(bottleWishlist.length, 'Bottle')} Ready to Prioritize`,
      whatWeFound: `You have ${bottleWishlist.length} ${plural(bottleWishlist.length, 'whiskey bottle')} on your wishlist.${gapNote} Approve Changes opens your Want List.`,
      whyItMatters: hasBottleTypeGap
        ? 'Filling whiskey type gaps broadens your tasting and pairing options, especially for cross-module sessions with cigars.'
        : 'A current shopping list signals active acquisition intent and helps you plan purchases strategically.',
      recommendedAction: `Review these ${bottleWishlist.length} wishlist ${plural(bottleWishlist.length, 'bottle')} and move appropriate ones to your shopping list. Approve Changes opens your Want List.`,
      severity: hasBottleTypeGap ? INSIGHT_SEVERITY.MEDIUM : INSIGHT_SEVERITY.LOW,
      module: 'whiskey',
      section: 'purchase_restock',
      suggestions: bottleWishlist.slice(0, 5).map((i) => i.name),
      recommendationClass: hasBottleTypeGap
        ? RECOMMENDATION_CLASS.REVIEW_REQUIRED
        : RECOMMENDATION_CLASS.ADVISORY,
      navigateTo: createPageUrl('WantList'),
    });
  }

  if (pipeWishlist.length > 0) {
    cards.push({
      id: 'wl_pipe_wishlist',
      title: `${pipeWishlist.length} Wishlist ${plural(pipeWishlist.length, 'Pipe')} Ready to Review`,
      whatWeFound: `You have ${pipeWishlist.length} ${plural(pipeWishlist.length, 'pipe')} on your wishlist. Acknowledge or Approve Changes opens your Want List to review and promote items.`,
      whyItMatters: 'Reviewing your pipe wishlist periodically keeps your acquisition strategy aligned with your collection goals and budget.',
      recommendedAction: `Review these ${pipeWishlist.length} wishlist ${plural(pipeWishlist.length, 'pipe')} and move high-priority ones to your shopping list. View Items opens your Want List.`,
      severity: INSIGHT_SEVERITY.LOW,
      module: 'pipe',
      section: 'purchase_restock',
      suggestions: pipeWishlist.slice(0, 5).map((i) => i.name),
      recommendationClass: RECOMMENDATION_CLASS.ADVISORY,
      navigateTo: createPageUrl('WantList'),
    });
  }

  return cards;
}

// ─── Next purchase / gap-filler generators ────────────────────────────────────

function buildNextPurchaseCards(blends, bottles) {
  const cards = [];

  const COMMON_BLEND_FAMILIES = [
    { key: 'virginia', label: 'Virginia' },
    { key: 'burley', label: 'Burley' },
    { key: 'english', label: 'English/Latakia' },
    { key: 'aromatic', label: 'Aromatic' },
  ];

  if (blends.length >= 3) {
    const existingFamilies = blends.map((b) =>
      (b.blend_type || b.blend_family || '').toLowerCase()
    );
    const missingFamilies = COMMON_BLEND_FAMILIES.filter(
      (f) => !existingFamilies.some((ef) => ef.includes(f.key))
    );
    if (missingFamilies.length > 0) {
      const familyCount = new Set(blends.map((b) => b.blend_type || b.blend_family).filter(Boolean)).size;
      cards.push({
        id: 'np_blend_family_gaps',
        title: 'Blend Family Gaps in Your Cellar',
        whatWeFound: `Your cellar is missing ${missingFamilies.length} common blend ${plural(missingFamilies.length, 'family', 'families')}: ${missingFamilies.map((f) => f.label).join(', ')}. You currently have ${familyCount} ${plural(familyCount, 'family', 'families')} represented.`,
        whyItMatters: 'A balanced cellar with diverse blend families gives you more pairing options, better rotation variety, and richer Curator recommendations. Each family has a distinct character.',
        recommendedAction: 'Consider adding a blend from each missing family. Ask Curator will suggest specific blends that complement your current collection profile.',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'tobacco',
        section: 'purchase_restock',
        suggestions: missingFamilies.map((f) => `Add a ${f.label} blend to fill this gap`),
        recommendationClass: RECOMMENDATION_CLASS.ADVISORY,
      });
    }
  }

  const COMMON_WHISKEY_TYPES = [
    { key: 'scotch', label: 'Scotch' },
    { key: 'bourbon', label: 'Bourbon' },
    { key: 'irish', label: 'Irish' },
    { key: 'japanese', label: 'Japanese' },
  ];

  if (bottles.length >= 3) {
    const existingTypes = bottles.map((b) =>
      (b.whiskey_type || b.spirit_type || b.type || '').toLowerCase()
    );
    const missingTypes = COMMON_WHISKEY_TYPES.filter(
      (t) => !existingTypes.some((et) => et.includes(t.key))
    );
    if (missingTypes.length > 0 && missingTypes.length < COMMON_WHISKEY_TYPES.length) {
      cards.push({
        id: 'np_whiskey_type_gaps',
        title: 'Whiskey Type Gaps in Your Collection',
        whatWeFound: `Your whiskey collection is missing ${missingTypes.length} common ${plural(missingTypes.length, 'type')}: ${missingTypes.map((t) => t.label).join(', ')}. These types are not currently owned.`,
        whyItMatters: 'Different whiskey types pair differently with cigars and tobacco. Coverage across major regions gives you more options for cross-module pairing sessions.',
        recommendedAction: 'Consider adding a bottle from a missing type. Ask Curator provides specific recommendations based on your collection profile.',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'whiskey',
        section: 'purchase_restock',
        suggestions: missingTypes.map((t) => `Add a ${t.label} bottle (not currently owned)`),
        recommendationClass: RECOMMENDATION_CLASS.ADVISORY,
      });
    }
  }

  return cards;
}

// ─── Specialization helpers ────────────────────────────────────────────────────

/**
 * Build a map of pipe_id → most-common blend type smoked in that pipe.
 * Uses smoking logs joined to blend records.
 */
function computeSuggestedSpecByPipe(smokeLogs, blends) {
  if (!smokeLogs?.length || !blends?.length) return {};
  const blendById = Object.fromEntries(blends.map((b) => [b.id, b]));
  const typeCounts = {};
  for (const log of smokeLogs) {
    if (!log.pipe_id || !log.blend_id) continue;
    const blend = blendById[log.blend_id];
    if (!blend) continue;
    // blend_type is the primary classification field; blend_family is the legacy fallback.
    // Both are used across the app — see buildDataMetadataCards and buildNextPurchaseCards.
    const type = blend.blend_type || blend.blend_family;
    if (!type || type === 'Unknown') continue;
    if (!typeCounts[log.pipe_id]) typeCounts[log.pipe_id] = {};
    typeCounts[log.pipe_id][type] = (typeCounts[log.pipe_id][type] || 0) + 1;
  }
  const result = {};
  for (const [pipeId, counts] of Object.entries(typeCounts)) {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) result[pipeId] = sorted[0][0];
  }
  return result;
}

// ─── Specialization generators ────────────────────────────────────────────────

function buildSpecializationCards(pipes, smokeLogs, blends) {
  const cards = [];
  if (pipes.length === 0) return cards;

  const suggestedByPipe = computeSuggestedSpecByPipe(smokeLogs, blends);

  const pipesWithoutSpecialization = pipes.filter(
    (p) => !p.focus || (Array.isArray(p.focus) && p.focus.length === 0)
  );

  if (pipesWithoutSpecialization.length > 0) {
    const withSuggestion = pipesWithoutSpecialization.filter((p) => !!suggestedByPipe[p.id]);
    const hasSuggestions = withSuggestion.length > 0;

    cards.push({
      id: 'spec_pipes_no_focus',
      title: `${pipesWithoutSpecialization.length} ${plural(pipesWithoutSpecialization.length, 'Pipe')} Without Specialization`,
      whatWeFound: hasSuggestions
        ? `We found ${pipesWithoutSpecialization.length} ${plural(pipesWithoutSpecialization.length, 'pipe')} with no specialization set. Based on your smoking logs, we have a suggested specialization for ${withSuggestion.length} of them. Treat Individually lets you review and apply each suggestion pipe by pipe.`
        : `We found ${pipesWithoutSpecialization.length} ${plural(pipesWithoutSpecialization.length, 'pipe')} with no specialization set. Treat Individually lets you review and assign a focus for each one based on how you use it.`,
      whyItMatters: 'Pipe specialization (Aromatic, English, Virginia, etc.) guides pairing recommendations, session planning, and collection strategy. It significantly improves Curator suggestion quality.',
      recommendedAction: hasSuggestions
        ? `We have specialization suggestions for ${withSuggestion.length} of these pipes based on your smoking logs. Treat Individually shows the suggested type for each pipe so you can confirm or adjust.`
        : 'Review each pipe and assign a specialization that reflects the tobacco types you enjoy in it. Treat Individually reviews each pipe one at a time.',
      severity: pipesWithoutSpecialization.length >= Math.ceil(pipes.length * 0.5) ? INSIGHT_SEVERITY.MEDIUM : INSIGHT_SEVERITY.LOW,
      module: 'pipe',
      section: 'specialization',
      suggestions: hasSuggestions
        ? withSuggestion.slice(0, 5).map((p) => `${p.name || 'Unnamed'} → ${suggestedByPipe[p.id]}`)
        : pipesWithoutSpecialization.slice(0, 5).map((p) => p.name || 'Unnamed Pipe'),
      recommendationClass: RECOMMENDATION_CLASS.MULTI_PATH,
      candidateItems: pipesWithoutSpecialization.map((p) => {
        const suggested = suggestedByPipe[p.id] || null;
        return {
          id: p.id,
          name: p.name || 'Unnamed Pipe',
          type: 'Pipe',
          currentSpecialization:
            Array.isArray(p.focus) ? p.focus.join(', ') : (p.focus || null),
          suggestedSpecialization: suggested,
          rationale: suggested
            ? `Based on your smoking logs, this pipe is most often used with ${suggested} blends. Setting its specialization to ${suggested} will improve pairing and session recommendations.`
            : 'No specialization is currently set. Use the pipe detail page to assign a focus based on the tobacco types you enjoy in this pipe.',
          detailUrl: createPageUrl(`PipeDetail?id=${encodeURIComponent(p.id)}`),
        };
      }),
    });
  }

  return cards;
}

// ─── Utilization generators ───────────────────────────────────────────────────

function buildUtilizationCards(blends, smokeLogs) {
  const cards = [];
  if (blends.length < 3) return cards;

  // Blends with stock that have no smoking log entry in the most recent 50 sessions
  const recentBlendIds = new Set(
    (smokeLogs || [])
      .filter((l) => l.blend_id)
      .slice(0, 50)
      .map((l) => l.blend_id)
  );

  const blendsWithStock = blends.filter((b) => {
    const oz =
      Number(b.tin_total_quantity_oz || 0) +
      Number(b.bulk_total_quantity_oz || 0) +
      Number(b.pouch_total_quantity_oz || 0);
    return oz > 0;
  });

  const underusedBlends = blendsWithStock.filter((b) => !recentBlendIds.has(b.id));

  // Only surface if there are underused blends but not ALL blends are underused
  // (if no smoke logs exist, we don't want to flag everything)
  if (underusedBlends.length > 0 && underusedBlends.length < blendsWithStock.length) {
    const topNames = underusedBlends.slice(0, 3).map((b) => b.name).join(', ');
    const overflowNote = underusedBlends.length > 3 ? ` and ${underusedBlends.length - 3} more` : '';
    cards.push({
      id: 'util_underused_blends',
      title: `${underusedBlends.length} Cellared ${plural(underusedBlends.length, 'Blend')} Not Recently Smoked`,
      whatWeFound: `We found ${underusedBlends.length} ${plural(underusedBlends.length, 'blend')} with stock in your cellar that ${has(underusedBlends.length)} no entry in your recent smoking sessions: ${topNames}${overflowNote}. View Items will open PipeKeeper so you can choose candidates for your next session.`,
      whyItMatters: 'Blends sitting unsmoked can be forgotten cellar gems or candidates for gifting, trading, or prioritized sessions. Reviewing your rotation periodically prevents cellar blindness.',
      recommendedAction: 'Review the listed blends and consider adding one to your next session plan. Ask Curator can suggest which to prioritize based on type, age, and your taste profile.',
      severity: underusedBlends.length >= Math.ceil(blendsWithStock.length * 0.5) ? INSIGHT_SEVERITY.MEDIUM : INSIGHT_SEVERITY.LOW,
      module: 'tobacco',
      section: 'utilization',
      suggestions: underusedBlends.slice(0, 5).map((b) => b.name),
      recommendationClass: RECOMMENDATION_CLASS.ADVISORY,
    });
  }

  return cards;
}

// ─── Confirmation details builder ─────────────────────────────────────────────

function getConfirmationDetails(card) {
  const moduleName = getModuleName(getModuleKey(card));
  let changes = [];

  if (card.navigateTo) {
    changes = [
      'Open your Want List to review and prioritize wishlist items',
      'Move appropriate items from wishlist to shopping list',
    ];
  } else if (card.suggestions?.length > 0) {
    changes = [
      `Navigate to ${moduleName}`,
      `Review the ${card.suggestions.length} specific ${plural(card.suggestions.length, 'item')} listed`,
    ];
  } else {
    changes = [
      `Open ${moduleName}`,
      `Apply the recommended action: ${card.recommendedAction}`,
    ];
  }

  return { changes, affectedModule: card.navigateTo ? 'Want List' : moduleName };
}

// ─── RecommendationCard ───────────────────────────────────────────────────────

const PREVIEW_ITEM_MAX = 4;
const PILL_MAX_CHARS = 38;

function truncatePill(text) {
  return text.length > PILL_MAX_CHARS ? text.slice(0, PILL_MAX_CHARS - 1) + '…' : text;
}

function RecommendationCard({
  card,
  onApplyFix,
  onReviewDetails,
  onAcknowledge,
  onViewItems,
  onAskForMoreInfo,
  onTreatIndividually,
  onAskCurator,
}) {
  const [localAcknowledged, setLocalAcknowledged] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const color = severityColor(card.severity);
  const bg = severityBg(card.severity);
  const impact = impactLabel(card.severity);
  const recClass = card.recommendationClass || RECOMMENDATION_CLASS.AUTO_FIX;
  const classLabel = getRecommendationClassLabel(recClass);
  const classColor = getRecommendationClassColor(recClass);
  const classBg = getRecommendationClassBg(recClass);

  const previewItems = card.suggestions?.slice(0, PREVIEW_ITEM_MAX) || [];
  const overflowCount = Math.max(0, (card.suggestions?.length || 0) - PREVIEW_ITEM_MAX);

  if (localAcknowledged) {
    return (
      <div
        className="rounded-xl px-4 py-2.5 flex items-center justify-between gap-3"
        style={{ background: 'rgba(20,14,10,0.5)', border: '1px solid rgba(140,105,65,0.1)' }}
      >
        <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(224,216,200,0.45)' }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(74,124,92,0.6)' }} />
          <span>{card.title} — acknowledged</span>
        </div>
        <button
          type="button"
          onClick={() => setLocalAcknowledged(false)}
          className="text-xs hover:opacity-80 underline shrink-0"
          style={{ color: 'rgba(180,140,75,0.5)' }}
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(36,24,15,0.9)',
        border: `1px solid ${color}28`,
      }}
    >
      {/* ── Card header: badges + title + rationale ── */}
      <div className="px-4 pt-3.5 pb-2.5">
        {/* Badge row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {classLabel && (
            <span
              className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: classBg, color: classColor, border: `1px solid ${classColor}40` }}
            >
              {classLabel}
            </span>
          )}
          {card.module && (
            <span
              className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
              style={{ background: 'rgba(120,90,65,0.15)', color: 'rgba(212,165,116,0.8)', border: '1px solid rgba(120,90,65,0.22)' }}
            >
              {getModuleName(card.module)}
            </span>
          )}
          <span
            className="ml-auto inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded"
            style={{ background: bg, color, border: `1px solid ${color}40` }}
          >
            {impact}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold leading-snug mb-1" style={{ color: '#F5F1E7' }}>
          {card.title}
        </h3>

        {/* One-liner rationale */}
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(224,216,200,0.58)' }}>
          {card.whyItMatters || card.whatWeFound}
        </p>
      </div>

      {/* ── Item preview pills ── */}
      {previewItems.length > 0 && (
        <div className="px-4 pb-2.5 flex flex-wrap gap-1.5">
          {previewItems.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center text-xs px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(140,105,65,0.15)', color: 'rgba(224,216,200,0.72)' }}
            >
              {truncatePill(s)}
            </span>
          ))}
          {overflowCount > 0 && (
            <span
              className="inline-flex items-center text-xs px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(180,140,75,0.07)', border: '1px solid rgba(180,140,75,0.15)', color: 'rgba(180,140,75,0.65)' }}
            >
              +{overflowCount} more
            </span>
          )}
        </div>
      )}

      {/* ── Expandable detail section ── */}
      {showDetail && (
        <div
          className="px-4 pb-3 pt-3 space-y-2.5"
          style={{ borderTop: '1px solid rgba(140,105,65,0.1)' }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(180,140,75,0.6)' }}>
              What We Found
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(240,230,210,0.82)' }}>
              {card.whatWeFound}
            </p>
          </div>
          {card.recommendedAction && (
            <div
              className="p-3 rounded-lg"
              style={{ background: 'rgba(180,140,75,0.06)', border: '1px solid rgba(180,140,75,0.14)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(180,140,75,0.6)' }}>
                Recommended Action
              </p>
              <p className="text-xs leading-relaxed font-medium" style={{ color: '#F5F1E7' }}>
                {card.recommendedAction}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Action footer ── */}
      <div
        className="px-4 py-2.5 flex items-center gap-2 flex-wrap"
        style={{ borderTop: '1px solid rgba(140,105,65,0.1)', background: 'rgba(0,0,0,0.14)' }}
      >
        {/* AUTO_FIX */}
        {recClass === RECOMMENDATION_CLASS.AUTO_FIX && (
          <>
            <button type="button" onClick={onApplyFix}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(74,124,92,0.28)', border: '1px solid rgba(74,124,92,0.5)', color: '#6aab80' }}
            >
              <CheckCircle2 className="w-3 h-3" /> Review &amp; Apply Fix
            </button>
            <button type="button" onClick={onReviewDetails}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(74,124,156,0.18)', border: '1px solid rgba(74,124,156,0.4)', color: '#6aabc0' }}
            >
              <Eye className="w-3 h-3" /> Review Details
            </button>
            <button type="button" onClick={onAskCurator}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(139,94,58,0.18)', border: '1px solid rgba(139,94,58,0.38)', color: '#D4956A' }}
            >
              <MessageCircle className="w-3 h-3" /> Ask Curator
            </button>
          </>
        )}

        {/* ADVISORY */}
        {recClass === RECOMMENDATION_CLASS.ADVISORY && (
          <>
            <button type="button" onClick={() => { setLocalAcknowledged(true); if (onAcknowledge) onAcknowledge(card); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(74,124,92,0.25)', border: '1px solid rgba(74,124,92,0.45)', color: '#6aab80' }}
            >
              <CheckCircle2 className="w-3 h-3" /> Acknowledge
            </button>
            <button type="button" onClick={onViewItems}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(74,124,156,0.18)', border: '1px solid rgba(74,124,156,0.4)', color: '#6aabc0' }}
            >
              <Eye className="w-3 h-3" /> View Items
            </button>
            <button type="button" onClick={onAskCurator}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(139,94,58,0.18)', border: '1px solid rgba(139,94,58,0.38)', color: '#D4956A' }}
            >
              <MessageCircle className="w-3 h-3" /> Ask Curator
            </button>
          </>
        )}

        {/* MULTI_PATH */}
        {recClass === RECOMMENDATION_CLASS.MULTI_PATH && (
          <>
            <button type="button" onClick={() => { setLocalAcknowledged(true); if (onAcknowledge) onAcknowledge(card); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(80,65,50,0.28)', border: '1px solid rgba(120,90,65,0.42)', color: 'rgba(224,200,170,0.8)' }}
            >
              <CheckCircle2 className="w-3 h-3" /> Acknowledge
            </button>
            <button type="button" onClick={onAskForMoreInfo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(74,124,156,0.18)', border: '1px solid rgba(74,124,156,0.4)', color: '#6aabc0' }}
            >
              <HelpCircle className="w-3 h-3" /> Ask for More Info
            </button>
            <button type="button" onClick={onTreatIndividually}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(139,94,58,0.22)', border: '1px solid rgba(139,94,58,0.42)', color: '#D4956A' }}
            >
              <SplitSquareVertical className="w-3 h-3" /> Treat Individually
            </button>
          </>
        )}

        {/* REVIEW_REQUIRED */}
        {recClass === RECOMMENDATION_CLASS.REVIEW_REQUIRED && (
          <>
            <button type="button" onClick={onReviewDetails}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(74,124,156,0.18)', border: '1px solid rgba(74,124,156,0.4)', color: '#6aabc0' }}
            >
              <Eye className="w-3 h-3" /> Review Details
            </button>
            <button type="button" onClick={onApplyFix}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(180,100,50,0.28)', border: '1px solid rgba(180,100,50,0.48)', color: '#e0a070' }}
            >
              <CheckCircle2 className="w-3 h-3" /> Approve Changes
            </button>
            <button type="button" onClick={onAskCurator}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(139,94,58,0.18)', border: '1px solid rgba(139,94,58,0.38)', color: '#D4956A' }}
            >
              <MessageCircle className="w-3 h-3" /> Ask Curator
            </button>
          </>
        )}

        {/* Details toggle — always rightmost */}
        <button
          type="button"
          onClick={() => setShowDetail((v) => !v)}
          className="ml-auto flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
          style={{ color: 'rgba(180,140,75,0.55)' }}
        >
          <ChevronRight
            className="w-3.5 h-3.5 transition-transform duration-200"
            style={{ transform: showDetail ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
          {showDetail ? 'Less' : 'Details'}
        </button>
      </div>
    </div>
  );
}

// ─── TreatIndividuallyModal ───────────────────────────────────────────────────

function TreatIndividuallyModal({ card, onClose, onAskCurator, navigate }) {
  const items = card?.candidateItems || [];
  const [skipped, setSkipped] = useState({});

  if (!card) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-xl max-h-[85vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(145deg, rgba(38,26,16,0.99), rgba(28,19,12,0.99))',
          border: '1px solid rgba(140,105,65,0.3)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            Treat Individually — {card.title}
          </DialogTitle>
          <DialogDescription className="text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Review each item below and decide individually. No changes are applied until you act on each one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {items.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'rgba(224,216,200,0.5)' }}>
              No individual items available for this recommendation.
            </p>
          ) : (
            items.map((item) => {
              const isSkipped = !!skipped[item.id];
              return (
                <div
                  key={item.id}
                  className="rounded-xl p-4"
                  style={{
                    background: isSkipped ? 'rgba(20,14,10,0.4)' : 'rgba(42,30,20,0.7)',
                    border: `1px solid ${isSkipped ? 'rgba(140,105,65,0.08)' : 'rgba(140,105,65,0.22)'}`,
                    opacity: isSkipped ? 0.5 : 1,
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#F5F1E7' }}>{item.name}</p>
                      {item.currentSpecialization != null && (
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
                          Current specialization: {item.currentSpecialization || 'None set'}
                        </p>
                      )}
                      {item.suggestedSpecialization && (
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(212,165,116,0.85)' }}>
                          Suggested: {item.suggestedSpecialization}
                        </p>
                      )}
                      {item.rationale && (
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(224,216,200,0.6)' }}>
                          {item.rationale}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isSkipped && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.detailUrl && (
                        <button type="button" onClick={() => { onClose(); navigate(item.detailUrl); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                          style={{ background: 'rgba(74,124,92,0.25)', border: '1px solid rgba(74,124,92,0.45)', color: '#6aab80' }}
                        >
                          <ExternalLink className="w-3 h-3" /> Go to {item.type || 'Item'}
                        </button>
                      )}
                      <button type="button"
                        onClick={() => {
                          if (onAskCurator) onAskCurator(`Tell me more about the ${card.title} suggestion for "${item.name}". ${item.rationale || ''}`);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                        style={{ background: 'rgba(139,94,58,0.2)', border: '1px solid rgba(139,94,58,0.4)', color: '#D4956A' }}
                      >
                        <MessageCircle className="w-3 h-3" /> Ask Curator
                      </button>
                      <button type="button"
                        onClick={() => setSkipped((prev) => ({ ...prev, [item.id]: true }))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                        style={{ background: 'rgba(80,60,45,0.18)', border: '1px solid rgba(120,90,65,0.3)', color: 'rgba(224,216,200,0.5)' }}
                      >
                        Skip
                      </button>
                    </div>
                  )}

                  {isSkipped && (
                    <button type="button"
                      onClick={() => setSkipped((prev) => { const n = { ...prev }; delete n[item.id]; return n; })}
                      className="text-xs underline mt-1 hover:opacity-80"
                      style={{ color: 'rgba(180,140,75,0.5)' }}
                    >
                      Undo skip
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(120,90,65,0.2)', border: '1px solid rgba(120,90,65,0.35)', color: 'rgba(224,216,200,0.75)' }}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── SectionGroup ─────────────────────────────────────────────────────────────

function SectionGroup({
  section,
  cards,
  onApplyFix,
  onReviewDetails,
  onAskCurator,
  onAcknowledge,
  onViewItems,
  onAskForMoreInfo,
  onTreatIndividually,
}) {
  if (!cards.length) return null;
  return (
    <div className="space-y-3">
      <div
        className="flex items-center gap-2 pb-2"
        style={{ borderBottom: '1px solid rgba(140,105,65,0.14)' }}
      >
        <span className="text-base leading-none">{section.emoji}</span>
        <h2 className="text-sm font-bold" style={{ color: '#F5F1E7' }}>
          {section.title}
        </h2>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(180,140,75,0.12)', color: 'rgba(180,140,75,0.75)', border: '1px solid rgba(180,140,75,0.18)' }}
        >
          {cards.length}
        </span>
        <span className="text-xs hidden sm:inline" style={{ color: 'rgba(224,216,200,0.32)' }}>
          {section.desc}
        </span>
      </div>
      <div className="space-y-2.5">
        {cards.map((card) => (
          <RecommendationCard
            key={card.id}
            card={card}
            onApplyFix={() => onApplyFix(card)}
            onReviewDetails={() => onReviewDetails(card)}
            onAskCurator={() => onAskCurator(card)}
            onAcknowledge={() => onAcknowledge && onAcknowledge(card)}
            onViewItems={() => onViewItems && onViewItems(card)}
            onAskForMoreInfo={() => onAskForMoreInfo && onAskForMoreInfo(card)}
            onTreatIndividually={() => onTreatIndividually && onTreatIndividually(card)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── CuratorOptimizePanel ─────────────────────────────────────────────────────

export default function CuratorOptimizePanel({
  pipes = [],
  blends = [],
  cigars = [],
  bottles = [],
  smokeLogs = [],
  tastingLogs = [],
  cigarSessions = [],
  wantListItems = [],
  onClose,
  onAskCurator,
}) {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState('all');
  const [confirmCard, setConfirmCard] = useState(null);
  const [treatIndividuallyCard, setTreatIndividuallyCard] = useState(null);
  const triggerElementRef = React.useRef(null);

  React.useEffect(() => {
    triggerElementRef.current = document.activeElement;
  }, []);

  function handleClose() {
    if (onClose) {
      onClose();
      if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
        requestAnimationFrame(() => triggerElementRef.current.focus());
      }
    }
  }

  // Latest log map for pipe rotation insights
  const latestLogByPipe = useMemo(() => {
    const map = {};
    for (const log of smokeLogs) {
      if (!log.pipe_id) continue;
      const logDate = log.date || log.created_date;
      if (!logDate) continue;
      const existing = map[log.pipe_id];
      if (!existing || logDate > existing) map[log.pipe_id] = logDate;
    }
    return map;
  }, [smokeLogs]);

  // Core proactive insights (rotation, diversity, aging, pairing, collection health)
  const allInsights = useMemo(
    () => generateProactiveInsights({ pipes, blends, latestLogByPipe }),
    [pipes, blends, latestLogByPipe]
  );

  // Generated card sets per category
  const dataMetadataCards = useMemo(
    () => buildDataMetadataCards(pipes, blends, cigars, bottles),
    [pipes, blends, cigars, bottles]
  );

  const restockCards = useMemo(
    () => buildRestockCards(blends, bottles),
    [blends, bottles]
  );

  const wishlistPromotionCards = useMemo(
    () => buildWishlistPromotionCards(wantListItems, blends, bottles, pipes),
    [wantListItems, blends, bottles, pipes]
  );

  const nextPurchaseCards = useMemo(
    () => buildNextPurchaseCards(blends, bottles),
    [blends, bottles]
  );

  const specializationCards = useMemo(
    () => buildSpecializationCards(pipes, smokeLogs, blends),
    [pipes, smokeLogs, blends]
  );

  const utilizationCards = useMemo(
    () => buildUtilizationCards(blends, smokeLogs),
    [blends, smokeLogs]
  );

  // Aggregate all cards — generated cards take priority over proactive insights.
  // Semantic deduplication suppresses proactive insight IDs when a generated
  // card already covers the same optimization goal.
  const allCards = useMemo(() => {
    const seenIds = new Set();
    const result = [];

    function addCard(card) {
      if (!card?.id || seenIds.has(card.id)) return;
      seenIds.add(card.id);
      result.push(card);
    }

    // Build suppression set: avoid proactive insight cards that duplicate
    // a generated card's optimization goal
    const suppressedInsightIds = new Set();

    // rst_open_no_cellar (open blends without backup) covers the same
    // population as inventory_open_at_risk (open blends 6+ months)
    if (restockCards.some((c) => c.id === 'rst_open_no_cellar')) {
      suppressedInsightIds.add('inventory_open_at_risk');
    }
    // np_blend_family_gaps (actionable gap fill) covers the same issue as
    // diversity_low_blend_variety (limited blend variety)
    if (nextPurchaseCards.some((c) => c.id === 'np_blend_family_gaps')) {
      suppressedInsightIds.add('diversity_low_blend_variety');
    }
    // util_underused_blends (tobacco) and rotation_underused_pipes (pipes) target
    // different item types — they are complementary, not duplicates, so no
    // suppression is needed between them.

    // Priority order: data fixes first → specialization → restock/purchases → utilization → insights
    for (const card of dataMetadataCards) addCard({ ...card, section: card.section || 'data_metadata' });
    for (const card of specializationCards) addCard({ ...card, section: 'specialization' });
    for (const card of restockCards) addCard({ ...card, section: card.section || 'purchase_restock' });
    for (const card of wishlistPromotionCards) addCard({ ...card, section: 'purchase_restock' });
    for (const card of nextPurchaseCards) addCard({ ...card, section: 'purchase_restock' });
    for (const card of utilizationCards) addCard({ ...card, section: 'utilization' });
    // Proactive insights last — deduplicated against generated cards + semantic suppression
    for (const insight of allInsights) {
      if (!suppressedInsightIds.has(insight.id)) {
        addCard(insightToCard(insight));
      }
    }

    return result;
  }, [dataMetadataCards, specializationCards, restockCards, wishlistPromotionCards, nextPurchaseCards, utilizationCards, allInsights]);

  // Filter by active module
  const filteredCards = useMemo(() => {
    if (activeModule === 'all') return allCards;
    return allCards.filter((card) => {
      const mk = getModuleKey(card);
      return mk === activeModule;
    });
  }, [allCards, activeModule]);

  // Group by section, then sort within each section by recommendation class priority
  // Priority: AUTO_FIX > MULTI_PATH > REVIEW_REQUIRED > ADVISORY, then by severity

  const cardsBySection = useMemo(() => {
    const map = {};
    for (const s of OPTIMIZE_SECTIONS) map[s.key] = [];
    for (const card of filteredCards) {
      const key = card.section || DEFAULT_SECTION;
      if (map[key]) map[key].push(card);
      else map[DEFAULT_SECTION].push(card);
    }
    // Sort within each section: operational fixes first, then by severity
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const classDiff =
          (RECCLASS_PRIORITY[a.recommendationClass] ?? 4) -
          (RECCLASS_PRIORITY[b.recommendationClass] ?? 4);
        if (classDiff !== 0) return classDiff;
        return (SEVERITY_PRIORITY_MAP[a.severity] ?? 3) - (SEVERITY_PRIORITY_MAP[b.severity] ?? 3);
      });
    }
    return map;
  }, [filteredCards]);

  // Summary stats
  const totalCount = filteredCards.length;
  const highCount = filteredCards.filter((c) => c.severity === INSIGHT_SEVERITY.HIGH).length;
  const mediumCount = filteredCards.filter((c) => c.severity === INSIGHT_SEVERITY.MEDIUM).length;

  // Handlers
  function handleApplyFix(card) {
    setConfirmCard(card);
  }

  function handleConfirmApplyFix() {
    const card = confirmCard;
    setConfirmCard(null);
    if (card.navigateTo) {
      navigate(card.navigateTo);
      return;
    }
    const moduleKey = getModuleKey(card);
    const route = getModuleRoute(moduleKey);
    if (route) navigate(route);
  }

  function handleReviewDetails(card) {
    if (onAskCurator) {
      onAskCurator(
        `Tell me more about this recommendation: "${card.title}". ${card.whatWeFound} What exactly should I do to address this and what will have the most impact?`
      );
    }
  }

  function handleAskCuratorCard(card) {
    if (onAskCurator) {
      onAskCurator(
        `I want to discuss: "${card.title}". ${card.whatWeFound} What should I prioritize and what impact will it have on my collection?`
      );
    }
  }

  function handleAcknowledge(_card) {
    // Handled locally via localAcknowledged state inside RecommendationCard.
  }

  function handleViewItems(card) {
    if (card.navigateTo) {
      navigate(card.navigateTo);
      return;
    }
    const moduleKey = getModuleKey(card);
    const route = getModuleRoute(moduleKey);
    if (route) navigate(route);
  }

  function handleAskForMoreInfo(card) {
    if (onAskCurator) {
      onAskCurator(
        `Explain the rationale and evidence behind: "${card.title}". ${card.whatWeFound} Why is this important and what are my options for addressing it?`
      );
    }
  }

  function handleTreatIndividually(card) {
    setTreatIndividuallyCard(card);
  }

  const confirmDetails = confirmCard ? getConfirmationDetails(confirmCard) : null;
  const activeSections = OPTIMIZE_SECTIONS.filter((s) => (cardsBySection[s.key] || []).length > 0);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(32,22,14,0.99), rgba(20,14,9,0.99))',
        border: '1px solid rgba(140,105,65,0.22)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* ── Sticky Header ─────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 px-5 pt-5 pb-4"
        style={{
          background: 'linear-gradient(160deg, rgba(32,22,14,0.99), rgba(20,14,9,0.98))',
          borderBottom: '1px solid rgba(140,105,65,0.15)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold leading-tight"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
            >
              Optimize Your Collection
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.6)' }}>
              Structured improvement across data, health, rotation, acquisitions, and strategy
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg transition-all hover:opacity-80 flex-shrink-0"
              style={{ background: 'rgba(120,90,65,0.15)', border: '1px solid rgba(120,90,65,0.25)', color: 'rgba(224,216,200,0.6)' }}
              aria-label="Close optimize panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Module toggle pills */}
        <div className="flex flex-wrap gap-2">
          {MODULE_PILLS.map((pill) => {
            const isActive = activeModule === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setActiveModule(pill.key)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: isActive ? 'rgba(163,92,92,0.28)' : 'rgba(255,255,255,0.05)',
                  border: isActive ? '1px solid rgba(163,92,92,0.55)' : '1px solid rgba(120,90,65,0.2)',
                  color: isActive ? '#F5F1E7' : 'rgba(224,216,200,0.5)',
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Summary Bar ───────────────────────────────────────────────── */}
      {totalCount > 0 && (
        <div
          className="px-5 py-4 grid grid-cols-3 gap-3"
          style={{ borderBottom: '1px solid rgba(140,105,65,0.12)' }}
        >
          {[
            { label: 'Total Optimizations', value: totalCount, color: 'rgba(224,216,200,0.8)' },
            { label: 'High Priority', value: highCount, color: '#E05252' },
            { label: 'Medium Priority', value: mediumCount, color: '#C89752' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="text-center py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(140,105,65,0.1)' }}
            >
              <div className="text-2xl sm:text-3xl font-bold mb-1" style={{ color, fontFamily: "'Georgia', serif" }}>
                {value}
              </div>
              <div className="text-[10px] sm:text-xs font-medium" style={{ color: 'rgba(224,216,200,0.5)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Section index ─────────────────────────────────────────────── */}
      {activeSections.length > 1 && (
        <div
          className="px-5 py-3 flex flex-wrap gap-2"
          style={{ borderBottom: '1px solid rgba(140,105,65,0.08)' }}
        >
          {activeSections.map((s) => (
            <span
              key={s.key}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(140,105,65,0.08)', color: 'rgba(224,216,200,0.5)', border: '1px solid rgba(140,105,65,0.12)' }}
            >
              {s.emoji} {s.title}
              <span className="font-bold" style={{ color: 'rgba(180,140,75,0.7)' }}>
                {cardsBySection[s.key].length}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* ── Recommendation Sections ────────────────────────────────────── */}
      <div className="px-5 py-5 space-y-6">
        {totalCount === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: 'linear-gradient(145deg, rgba(42,30,20,0.9), rgba(28,19,13,0.95))',
              border: '1px solid rgba(74,124,92,0.25)',
            }}
          >
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#4A7C59' }} />
            <p className="text-base font-semibold mb-1" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
              Collection Well Optimized
            </p>
            <p className="text-sm" style={{ color: 'rgba(224,216,200,0.55)' }}>
              No immediate actions needed for the selected filter.
            </p>
          </div>
        ) : (
          OPTIMIZE_SECTIONS.map((section) => {
            const cards = cardsBySection[section.key] || [];
            if (!cards.length) return null;
            return (
              <SectionGroup
                key={section.key}
                section={section}
                cards={cards}
                onApplyFix={handleApplyFix}
                onReviewDetails={handleReviewDetails}
                onAskCurator={handleAskCuratorCard}
                onAcknowledge={handleAcknowledge}
                onViewItems={handleViewItems}
                onAskForMoreInfo={handleAskForMoreInfo}
                onTreatIndividually={handleTreatIndividually}
              />
            );
          })
        )}
      </div>

      {/* ── Confirmation Modal ─────────────────────────────────────────── */}
      <AlertDialog open={!!confirmCard} onOpenChange={(open) => !open && setConfirmCard(null)}>
        <AlertDialogContent
          style={{
            background: 'linear-gradient(145deg, rgba(38,26,16,0.99), rgba(28,19,12,0.99))',
            border: '1px solid rgba(140,105,65,0.3)',
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
              {confirmCard?.recommendationClass === RECOMMENDATION_CLASS.REVIEW_REQUIRED
                ? 'Approve Recommendation?'
                : 'Apply Recommendation?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 mt-2">
                {confirmCard && (
                  <>
                    <p className="text-sm font-semibold" style={{ color: 'rgba(240,230,210,0.9)' }}>
                      "{confirmCard.title}"
                    </p>
                    <div
                      className="rounded-xl p-4 space-y-2"
                      style={{ background: 'rgba(180,140,75,0.07)', border: '1px solid rgba(180,140,75,0.2)' }}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(180,140,75,0.7)' }}>
                        This will:
                      </p>
                      {confirmDetails?.changes.map((change, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span style={{ color: 'rgba(180,140,75,0.7)' }}>•</span>
                          <p className="text-sm" style={{ color: 'rgba(224,216,200,0.85)' }}>{change}</p>
                        </div>
                      ))}
                      <div className="flex items-start gap-2 pt-1">
                        <span style={{ color: 'rgba(180,140,75,0.7)' }}>•</span>
                        <p className="text-sm" style={{ color: 'rgba(224,216,200,0.85)' }}>
                          Affected: <span style={{ color: '#F5F1E7', fontWeight: 600 }}>{confirmDetails?.affectedModule}</span>
                        </p>
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: 'rgba(224,216,200,0.45)' }}>
                      Confirming opens the relevant {confirmCard.navigateTo ? 'page' : 'section of your collection'}. You make the actual edits there — no data is modified automatically.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="rounded-xl text-sm"
              style={{ background: 'rgba(120,90,65,0.2)', border: '1px solid rgba(120,90,65,0.35)', color: 'rgba(224,216,200,0.75)' }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmApplyFix}
              className="rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, rgba(74,124,92,0.5), rgba(74,124,92,0.3))', border: '1px solid rgba(74,124,92,0.6)', color: '#6aab80' }}
            >
              Confirm &amp; Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Treat Individually Modal ───────────────────────────────────── */}
      {treatIndividuallyCard && (
        <TreatIndividuallyModal
          card={treatIndividuallyCard}
          onClose={() => setTreatIndividuallyCard(null)}
          onAskCurator={onAskCurator}
          navigate={navigate}
        />
      )}
    </div>
  );
}
