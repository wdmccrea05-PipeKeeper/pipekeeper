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
import { filterAiEligibleItems } from '../../platform/aiEligibility.js';

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

// ─── Known tobacco blends catalog ────────────────────────────────────────────
// Source: manufacturer data, tobaccoreviews.com, tobacco listings.
// blend_type and strength derived from documented product specifications.

const KNOWN_BLENDS = {
  // Cornell & Diehl
  'Autumn Evening':            { blend_type: 'Virginia/Perique', strength: 'Medium' },
  'Billy Budd':                { blend_type: 'Virginia',          strength: 'Mild' },
  'Blue Ridge':                { blend_type: 'Virginia',          strength: 'Mild' },
  'Burley Flake #3':           { blend_type: 'Burley',            strength: 'Medium' },
  'Crooner':                   { blend_type: 'Aromatic',          strength: 'Mild' },
  'Dark Star':                 { blend_type: 'Virginia/Perique',  strength: 'Medium-Full' },
  'Jack Knife Plug':           { blend_type: 'Virginia',          strength: 'Medium' },
  'Pegasus':                   { blend_type: 'Virginia/Perique',  strength: 'Medium' },
  'Red Rapparee':              { blend_type: 'Burley',            strength: 'Medium-Full' },
  'Renegade':                  { blend_type: 'Burley',            strength: 'Medium' },
  'Star of the East':          { blend_type: 'Oriental',          strength: 'Medium' },
  'Stoved Virginia Flake':     { blend_type: 'Virginia',          strength: 'Mild' },
  'Tilted Tulip':              { blend_type: 'Aromatic',          strength: 'Mild' },
  'Warped Harvest':            { blend_type: 'Virginia/Burley',   strength: 'Medium' },
  'Haunted Bookshop':          { blend_type: 'Virginia',          strength: 'Mild' },
  'Bright Leaf Kentucky':      { blend_type: 'Virginia/Burley',   strength: 'Medium' },
  'Pirate Kake':               { blend_type: 'Virginia',          strength: 'Mild' },
  'Anniversary Kake':          { blend_type: 'Virginia/Perique',  strength: 'Medium' },

  // G.L. Pease
  'Abingdon':                  { blend_type: 'Virginia/Perique',  strength: 'Medium' },
  'Cairo':                     { blend_type: 'English',           strength: 'Full' },
  'Charing Cross':             { blend_type: 'English',           strength: 'Full' },
  'Chelsea Morning':           { blend_type: 'Virginia',          strength: 'Mild' },
  'Caravan':                   { blend_type: 'English',           strength: 'Medium-Full' },
  'Fillmore':                  { blend_type: 'Virginia/Perique',  strength: 'Medium' },
  'Gaslight':                  { blend_type: 'English',           strength: 'Medium' },
  "Haddo's Delight":           { blend_type: 'Virginia/Perique',  strength: 'Medium' },
  'Hammerhead':                { blend_type: 'Virginia/Burley',   strength: 'Medium-Full' },
  'Hyde Park':                 { blend_type: 'Virginia',          strength: 'Mild' },
  'Kensington':                { blend_type: 'English',           strength: 'Medium' },
  'Lagonda':                   { blend_type: 'Virginia/Perique',  strength: 'Medium' },
  'Meridian':                  { blend_type: 'Virginia',          strength: 'Medium' },
  'Old London Street':         { blend_type: 'English',           strength: 'Full' },
  'Samarra':                   { blend_type: 'English',           strength: 'Full' },
  'Sixpence':                  { blend_type: 'Virginia',          strength: 'Mild' },
  'Spotlight':                 { blend_type: 'Virginia',          strength: 'Mild' },
  'Stonehenge Flake':          { blend_type: 'Virginia',          strength: 'Medium' },
  'Symmetric':                 { blend_type: 'Virginia',          strength: 'Mild' },
  'Telegraph Hill':            { blend_type: 'Virginia/Burley',   strength: 'Medium' },
  'Triple Play':               { blend_type: 'Virginia',          strength: 'Medium' },
  'Union Square':              { blend_type: 'Virginia',          strength: 'Mild' },
  'Velvet Hammer':             { blend_type: 'Virginia/Perique',  strength: 'Medium-Full' },
  'Westminster':               { blend_type: 'English/Balkan',    strength: 'Full' },
  'Windjammer':                { blend_type: 'Virginia',          strength: 'Mild' },

  // Samuel Gawith
  'Best Brown Flake':          { blend_type: 'Virginia',          strength: 'Medium' },
  'Black XX Flake':            { blend_type: 'Virginia',          strength: 'Medium-Full' },
  "Bobby's Best Blend":        { blend_type: 'Virginia',          strength: 'Mild' },
  'Ennerdale Flake':           { blend_type: 'Aromatic',          strength: 'Mild' },
  'Full Virginia Flake':       { blend_type: 'Virginia',          strength: 'Medium' },
  'Grousemoor':                { blend_type: 'English',           strength: 'Medium-Full' },
  'Kendal Cream Flake':        { blend_type: 'Virginia',          strength: 'Mild' },
  'Kendal Dark Flake':         { blend_type: 'Virginia',          strength: 'Medium' },
  'Kendal Flake':              { blend_type: 'Virginia',          strength: 'Medium' },
  'Skiff Mixture':             { blend_type: 'English',           strength: 'Medium-Full' },
  'Squadron Leader':           { blend_type: 'English',           strength: 'Medium-Full' },
  'St. James Flake':           { blend_type: 'Virginia',          strength: 'Medium' },
  'Super Saver':               { blend_type: 'Virginia',          strength: 'Medium' },
  'Tom Buck':                  { blend_type: 'Virginia/Perique',  strength: 'Medium' },
  'Bracken Flake':             { blend_type: 'Virginia',          strength: 'Medium' },
  'Perfection':                { blend_type: 'Virginia',          strength: 'Medium' },

  // Gawith Hoggarth
  "Dark Bird's Eye":           { blend_type: 'Virginia',          strength: 'Medium-Full' },
  "Light Bird's Eye":          { blend_type: 'Virginia',          strength: 'Medium' },
  'Brown Twist':               { blend_type: 'Virginia',          strength: 'Medium-Full' },
  'Curly Block':               { blend_type: 'Virginia',          strength: 'Medium-Full' },
  'Dark Flake Unscented':      { blend_type: 'Virginia',          strength: 'Medium-Full' },
  'Empire Mixture':            { blend_type: 'English',           strength: 'Full' },
  'Golden Glow':               { blend_type: 'Aromatic',          strength: 'Mild' },
  'Kendal Cream':              { blend_type: 'Aromatic',          strength: 'Mild' },
  'Brown No. 4':               { blend_type: 'Virginia',          strength: 'Medium' },

  // Dunhill (archived; data from documented manufacturer specs)
  'Early Morning Pipe':        { blend_type: 'Virginia',          strength: 'Mild' },
  'My Mixture 965':            { blend_type: 'English',           strength: 'Full' },
  'Royal Yacht':               { blend_type: 'Virginia/Perique',  strength: 'Medium-Full' },
  'Elizabethan Mixture':       { blend_type: 'English',           strength: 'Medium' },
  'Aperitif':                  { blend_type: 'Aromatic',          strength: 'Mild' },
  'Nightcap':                  { blend_type: 'English',           strength: 'Full' },
  'Standard Mixture':          { blend_type: 'English',           strength: 'Medium' },
  'Three Year Matured Virginia': { blend_type: 'Virginia',        strength: 'Medium' },

  // Esoterica (St. Bruno / Ashton Heritage)
  'And So To Bed':             { blend_type: 'Virginia',          strength: 'Mild' },
  'Dunbar':                    { blend_type: 'Virginia',          strength: 'Mild' },
  'Margate':                   { blend_type: 'Virginia/Perique',  strength: 'Medium' },
  'Penzance':                  { blend_type: 'English',           strength: 'Full' },
  'Stonehaven':                { blend_type: 'English',           strength: 'Medium' },
  'Tobago':                    { blend_type: 'Virginia',          strength: 'Mild' },

  // Mac Baren
  '7 Seas Aromatic':           { blend_type: 'Aromatic',          strength: 'Mild' },
  '7 Seas Black':              { blend_type: 'Aromatic',          strength: 'Mild' },
  '7 Seas Royal':              { blend_type: 'Aromatic',          strength: 'Medium' },
  'Burley London Blend':       { blend_type: 'Virginia/Burley',   strength: 'Medium' },
  'Cube Cut':                  { blend_type: 'Virginia',          strength: 'Medium' },
  'Golden Extra':              { blend_type: 'Virginia',          strength: 'Mild' },
  'HH Acadian Perique':        { blend_type: 'Virginia/Perique',  strength: 'Medium' },
  'HH Bold Kentucky':          { blend_type: 'Burley',            strength: 'Medium-Full' },
  'HH Burley':                 { blend_type: 'Burley',            strength: 'Medium' },
  'HH English Blend':          { blend_type: 'English',           strength: 'Medium-Full' },
  'HH Mature Virginia':        { blend_type: 'Virginia',          strength: 'Medium' },
  'HH Old Dark Fired':         { blend_type: 'Burley',            strength: 'Full' },
  'HH Pure Virginia':          { blend_type: 'Virginia',          strength: 'Medium' },
  'Navy Flake':                { blend_type: 'Virginia/Perique',  strength: 'Medium-Full' },
  'Roll Cake':                 { blend_type: 'Virginia',          strength: 'Medium' },
  'Virginia No. 1':            { blend_type: 'Virginia',          strength: 'Medium' },
  'Solent Mixture':            { blend_type: 'Virginia',          strength: 'Mild' },
  'Plum Cake':                 { blend_type: 'Aromatic',          strength: 'Mild' },

  // Orlik
  'Dark Strong Kentucky':      { blend_type: 'Burley',            strength: 'Full' },
  'Erinmore Flake':            { blend_type: 'Virginia',          strength: 'Medium' },
  'Erinmore Mixture':          { blend_type: 'Aromatic',          strength: 'Mild' },
  'Finest Hour':               { blend_type: 'English',           strength: 'Medium' },
  'Golden Sliced':             { blend_type: 'Virginia',          strength: 'Mild' },
  'Medium Aromatic':           { blend_type: 'Aromatic',          strength: 'Mild' },

  // Robert McConnell
  'Award Flake':               { blend_type: 'Virginia',          strength: 'Medium' },
  'Baker Street':              { blend_type: 'English',           strength: 'Medium-Full' },
  'Black Cherry Blend':        { blend_type: 'Aromatic',          strength: 'Mild' },
  'Embarcadero':               { blend_type: 'English',           strength: 'Medium-Full' },
  'Matured Virginia':          { blend_type: 'Virginia',          strength: 'Medium' },
  'Rustica':                   { blend_type: 'Virginia',          strength: 'Medium-Full' },
  'Scottish Mixture':          { blend_type: 'English',           strength: 'Medium-Full' },

  // Peter Stokkebye
  'Amsterdam Shag':            { blend_type: 'Aromatic',          strength: 'Mild' },
  'Burgundy Cavendish':        { blend_type: 'Aromatic',          strength: 'Mild' },
  'English Blend No. 10':      { blend_type: 'English',           strength: 'Medium' },
  'English Oriental Supreme':  { blend_type: 'English',           strength: 'Medium-Full' },
  'Luxury Bullseye Flake':     { blend_type: 'Virginia',          strength: 'Medium' },
  'Luxury Twist Flake':        { blend_type: 'Virginia',          strength: 'Medium' },
  'Norwegian Sailors':         { blend_type: 'English',           strength: 'Medium-Full' },

  // Lane Limited
  '1Q':                        { blend_type: 'Aromatic',          strength: 'Mild' },
  'BCA':                       { blend_type: 'Aromatic',          strength: 'Mild' },
  'HGL':                       { blend_type: 'Aromatic',          strength: 'Mild' },
  'Ready Rubbed':              { blend_type: 'Aromatic',          strength: 'Mild' },
  'LL-7':                      { blend_type: 'Aromatic',          strength: 'Mild' },

  // Sutliff
  'Bohemian Scandal':          { blend_type: 'English',           strength: 'Medium-Full' },
  'Cringle Flake':             { blend_type: 'Virginia',          strength: 'Medium' },
  'Maple Street':              { blend_type: 'Aromatic',          strength: 'Mild' },
  'Molto Dolce':               { blend_type: 'Aromatic',          strength: 'Mild' },
  'Paladin Black Cherry':      { blend_type: 'Aromatic',          strength: 'Mild' },
  'Trophy Room':               { blend_type: 'English',           strength: 'Medium' },
  'Virginia Flake':            { blend_type: 'Virginia',          strength: 'Medium' },
  'Vintage Cube Cut Virginia': { blend_type: 'Virginia',          strength: 'Medium' },
  'Match 965':                 { blend_type: 'English',           strength: 'Full' },

  // W.O. Larsen
  'Old Fashioned':             { blend_type: 'Aromatic',          strength: 'Mild' },
  'Private Blend No. 1':       { blend_type: 'English',           strength: 'Medium' },
  'Honey Dew':                 { blend_type: 'Aromatic',          strength: 'Mild' },

  // Dan Tobacco
  "Devil's Holiday":           { blend_type: 'English',           strength: 'Full' },
  'Fathom':                    { blend_type: 'English',           strength: 'Medium-Full' },
  'My Mixture 773':            { blend_type: 'Virginia',          strength: 'Medium' },
  'Sjoeman':                   { blend_type: 'English',           strength: 'Medium' },

  // Balkan Sobranie (documented historical specs)
  'Balkan Sobranie Original':  { blend_type: 'English/Balkan',    strength: 'Full' },
  'Balkan Sobranie No. 759':   { blend_type: 'English/Balkan',    strength: 'Full' },
  'White Ribbon':              { blend_type: 'English/Balkan',    strength: 'Medium-Full' },
  'Sobranie Mixture No. 10':   { blend_type: 'English/Balkan',    strength: 'Full' },

  // Captain Black
  'Captain Black Gold':        { blend_type: 'Aromatic',          strength: 'Mild' },
  'Captain Black Light':       { blend_type: 'Aromatic',          strength: 'Mild' },
  'Captain Black Original':    { blend_type: 'Aromatic',          strength: 'Mild' },
  'Captain Black White':       { blend_type: 'Aromatic',          strength: 'Mild' },
  'Captain Black Royal':       { blend_type: 'Aromatic',          strength: 'Mild' },

  // Borkum Riff
  'Borkum Riff Bourbon Whiskey': { blend_type: 'Aromatic',        strength: 'Mild' },
  'Borkum Riff Cherry Cavendish': { blend_type: 'Aromatic',       strength: 'Mild' },
  'Borkum Riff Original':      { blend_type: 'Aromatic',          strength: 'Mild' },
  'Borkum Riff Honey & Vanilla': { blend_type: 'Aromatic',        strength: 'Mild' },

  // Amphora
  'Amphora Brown Blend':       { blend_type: 'Aromatic',          strength: 'Mild' },
  'Amphora Full Aroma':        { blend_type: 'Aromatic',          strength: 'Medium' },
  'Amphora Original':          { blend_type: 'Aromatic',          strength: 'Mild' },

  // Solani
  'Aged Burley Flake':         { blend_type: 'Burley',            strength: 'Medium' },
  'Silver Flake':              { blend_type: 'Virginia',          strength: 'Medium' },
  'Mountain Herbs':            { blend_type: 'Aromatic',          strength: 'Medium' },

  // Rattray's
  "Accountant's Mixture":      { blend_type: 'English',           strength: 'Medium' },
  'Black Mallory':             { blend_type: 'English',           strength: 'Full' },
  'Brown Clunee':              { blend_type: 'English',           strength: 'Medium-Full' },
  "Hal o' the Wynd":           { blend_type: 'Virginia',          strength: 'Mild' },
  'Marlin Flake':              { blend_type: 'Virginia',          strength: 'Medium' },
  'Old Gowrie':                { blend_type: 'Virginia',          strength: 'Medium' },
  "Rattray's Red Rapparee":    { blend_type: 'Burley',            strength: 'Medium-Full' },

  // Davidoff
  'Danish Mixture':            { blend_type: 'Aromatic',          strength: 'Mild' },
  'Davidoff English Mixture':  { blend_type: 'English',           strength: 'Medium' },
  'Fleur de Lis':              { blend_type: 'Aromatic',          strength: 'Mild' },
  'Royalty':                   { blend_type: 'Virginia',          strength: 'Medium' },

  // Vauen / Stanwell house blends
  'De Luxe':                   { blend_type: 'Aromatic',          strength: 'Mild' },
  'Top Cavendish':             { blend_type: 'Aromatic',          strength: 'Mild' },
};

/**
 * Infer blend_type and strength for a single TobaccoBlend record.
 * 1. Exact blend name match in catalog → confidence 0.90
 * 2. Partial blend name match (blend name contained in catalog key) → confidence 0.80
 * 3. No match → { payload: null, confidence: 0 }
 */
/** Build a proposedChange payload for a blend from a catalog match, including only missing fields. */
function buildBlendPayload(blend, data) {
  const payload = {};
  if (!blend.blend_type || blend.blend_type === '' || blend.blend_type === 'Unknown') payload.blend_type = data.blend_type;
  if (!blend.strength   || blend.strength   === '') payload.strength   = data.strength;
  return Object.keys(payload).length ? payload : null;
}

function inferBlendMetadata(blend) {
  const nameLower = (blend.name || '').toLowerCase().trim();
  if (!nameLower) return { payload: null, confidence: 0 };

  // 1. Exact match
  for (const [key, data] of Object.entries(KNOWN_BLENDS)) {
    if (nameLower === key.toLowerCase()) {
      const payload = buildBlendPayload(blend, data);
      return payload ? { payload, confidence: 0.90 } : { payload: null, confidence: 0 };
    }
  }

  // 2. Partial match — catalog key is contained in the blend name or vice versa
  for (const [key, data] of Object.entries(KNOWN_BLENDS)) {
    const keyLower = key.toLowerCase();
    if (nameLower.includes(keyLower) || keyLower.includes(nameLower)) {
      const payload = buildBlendPayload(blend, data);
      return payload ? { payload, confidence: 0.80 } : { payload: null, confidence: 0 };
    }
  }

  return { payload: null, confidence: 0 };
}

// ─── Known production pipe shapes ────────────────────────────────────────────
// Source: manufacturer catalogues, pipedia.org shape charts.

const KNOWN_PIPE_SHAPES = {
  // Peterson standard shapes (shape number in name)
  'system standard':      'Bent Billiard',
  'system spigot':        'Bent Billiard',
  'system deluxe':        'Bent Billiard',
  'sherlock holmes':      'Calabash',
  'aran':                 'Bent',
  'x105':                 'Bent Billiard',
  'x220':                 'Prince',
  'x245':                 'Billiard',
  'x999':                 'Bent',
  'kildare':              'Bent Billiard',
  'donegal rocky':        'Billiard',
  'emerald':              'Billiard',
  'whiskey barrel':       'Barrel',
  'tankard':              'Tankard',
  // Savinelli common series
  'autograph':            'Billiard',
  'alor':                 'Bent',
  'oscar':                'Billiard',
  'point':                'Billiard',
  'oom paul':             'Oom Paul',
  'half bent':            'Half-Bent',
  'prince':               'Prince',
  'rhodesian':            'Rhodesian',
  'cherrywood':           'Cherrywood',
  'cavalier':             'Cavalier',
  'volcano':              'Volcano',
  'canadian':             'Canadian',
  'lumberman':            'Lumberman',
  'poker':                'Poker',
  // Stanwell
  'regal':                'Billiard',
  'de luxe':              'Billiard',
  'featherweight':        'Billiard',
  'pot':                  'Pot',
  'dublin':               'Dublin',
  'apple':                'Apple',
  // Chacom
  'atlas':                'Billiard',
  'morvan':               'Bent',
  'pirate':               'Billiard',
  // Common shape keywords (catch-all pattern matching)
  'billiard':             'Billiard',
  'bent billiard':        'Bent Billiard',
  'bent':                 'Bent',
  'apple billiard':       'Apple',
  'dublin bent':          'Dublin Bent',
  'churchwarden':         'Churchwarden',
  'freehand':             'Freehand',
  'calabash':             'Calabash',
  'bamboo':               'Bamboo',
  'horn':                 'Horn',
  'acorn':                'Acorn',
  'brandy':               'Brandy',
  'egg':                  'Egg',
  'bulldog':              'Bulldog',
  'bullmoose':            'Bull Moose',
  'zulu':                 'Zulu',
  'cutty':                'Cutty',
};

/**
 * Infer shape for a production pipe from its name or model.
 * Returns { shape, confidence } or { shape: null, confidence: 0 }.
 */
function inferPipeShape(pipe) {
  const searchStr = `${pipe.name || ''} ${pipe.maker || ''} ${pipe.model || ''}`.toLowerCase();
  if (!searchStr.trim()) return { shape: null, confidence: 0 };

  for (const [key, shape] of Object.entries(KNOWN_PIPE_SHAPES)) {
    if (searchStr.includes(key)) {
      // Longer keys are more specific model names → higher confidence; short keys are generic shape words.
      const confidence = key.length > 6 ? 0.82 : 0.72;
      return { shape, confidence };
    }
  }
  return { shape: null, confidence: 0 };
}

// ─── Category A: Record Optimization ─────────────────────────────────────────

function analyzeMetadata(context) {
  const { blends = [], pipes = [], bottles = [] } = context;
  const recommendations = [];

  // ── Blends missing blend_type ──────────────────────────────────────────────
  const blendsNoType = blends.filter((b) => !b.blend_type || b.blend_type === '' || b.blend_type === 'Unknown');
  if (blendsNoType.length > 0) {
    const items = blendsNoType.slice(0, MAX_ITEMS_PER_REC).map((b) => {
      const lookup = inferBlendMetadata(b);
      return {
        id: b.id,
        recordId: b.id,
        recordType: 'blend',
        recordName: b.name,
        itemName: b.name,
        manufacturer: b.manufacturer || null,
        ownershipStatus: 'owned',
        missingFields: ['blend type'],
        proposedChange: lookup.payload
          ? { confidence: lookup.confidence, payload: lookup.payload, rationale: 'Matched from product catalog' }
          : null,
      };
    });

    const withPayloads   = items.filter((i) => i.proposedChange);
    const highConf       = withPayloads.filter((i) => i.proposedChange.confidence >= 0.70);
    const actionType     = highConf.length > 0 ? ACTION_TYPE.AUTO_FIX : ACTION_TYPE.REVIEW_REQUIRED;

    const summary = withPayloads.length > 0
      ? `${withPayloads.length} of ${items.length} unclassified blend${items.length > 1 ? 's' : ''} matched in the product catalog and ${withPayloads.length > 1 ? 'are' : 'is'} ready to apply.`
      : `${items.length} blend${items.length > 1 ? 's are' : ' is'} unclassified — blend type not found in catalog.`;

    recommendations.push(createRecommendation({
      category:           CATEGORY.RECORD_OPTIMIZATION,
      goal:               'blend_missing_type',
      actionType,
      title:              'Blends Missing Classification',
      summary,
      whyItMatters:       'Blend type is the foundation of every recommendation this system makes. ' +
                          'Without it, a blend cannot be matched to a pipe, placed in a pairing, or factored into collection balance.',
      recommendationText: withPayloads.length > 0
        ? `${withPayloads.length} blend${withPayloads.length > 1 ? 's' : ''} matched from the product catalog. Apply Fix to auto-fill or Review to confirm.`
        : 'Open each blend and assign the blend family — Virginia, English, Aromatic, Burley, or whichever applies.',
      moduleKey:          MODULE_KEY.TOBACCO,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           items.length >= 5 ? PRIORITY.HIGH : PRIORITY.MEDIUM,
      confidence:         'high',
      items,
      actionPayload: { type: 'open_blend_edit', field: 'blend_type' },
    }));
  }

  // ── Blends missing strength ────────────────────────────────────────────────
  const blendsNoStrength = blends.filter((b) => (!b.strength || b.strength === ''));
  if (blendsNoStrength.length > 0) {
    const items = blendsNoStrength.slice(0, MAX_ITEMS_PER_REC).map((b) => {
      // Try catalog lookup first, then fall back to blend_type inference
      const catalogLookup = inferBlendMetadata(b);
      const catalogStrength = catalogLookup.payload?.strength || null;
      const typeInferred    = b.blend_type ? (BLEND_TYPE_STRENGTH_INFERENCE[b.blend_type] || null) : null;
      const inferred        = catalogStrength || typeInferred;
      const confidence      = catalogStrength ? catalogLookup.confidence : (typeInferred ? 0.80 : 0);

      return {
        id: b.id,
        recordId: b.id,
        recordType: 'blend',
        recordName: b.name,
        itemName: b.name,
        manufacturer: b.manufacturer || null,
        ownershipStatus: 'owned',
        proposedChange: inferred
          ? { confidence, payload: { strength: inferred }, rationale: catalogStrength ? 'Matched from product catalog' : 'Inferred from blend type' }
          : null,
      };
    });
    const inferredCount = items.filter((i) => i.proposedChange).length;
    const actionType = inferredCount > 0 ? ACTION_TYPE.AUTO_FIX : ACTION_TYPE.REVIEW_REQUIRED;

    const summary = inferredCount > 0
      ? `${inferredCount} of ${items.length} blend${items.length > 1 ? 's' : ''} matched in the catalog — strength values ready to apply.`
      : `${items.length} blend${items.length > 1 ? 's are' : ' is'} missing a strength rating.`;

    recommendations.push(createRecommendation({
      category:           CATEGORY.RECORD_OPTIMIZATION,
      goal:               'blend_missing_strength',
      actionType,
      title:              'Blends Missing Strength',
      summary,
      whyItMatters:       'Strength rating determines how blends are sequenced in a session, which pipes suit them, ' +
                          'and which whiskeys create a balanced pairing.',
      recommendationText: inferredCount > 0
        ? `Apply Fix to auto-fill ${inferredCount} value${inferredCount > 1 ? 's' : ''} from the product catalog.`
        : 'Open each blend and set the strength from the tin or manufacturer page.',
      moduleKey:          MODULE_KEY.TOBACCO,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.LOW,
      confidence:         'high',
      items,
      actionPayload: { type: 'open_blend_edit', field: 'strength' },
    }));
  }

  // ─── Whiskey inference data ─────────────────────────────────────────────────
  // Source: distillery websites, whiskybase.com, master of malt listings.

  const KNOWN_DISTILLERIES = {
    // Kentucky Bourbon
    'Buffalo Trace':       { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 45 },
    'Wild Turkey':         { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 40 },
    'Four Roses':          { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 40 },
    "Maker's Mark":        { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 45 },
    'Woodford Reserve':    { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 45.2 },
    'Knob Creek':          { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 50 },
    'Jim Beam':            { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 40 },
    'Evan Williams':       { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 43 },
    'Eagle Rare':          { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 45 },
    'Bulleit':             { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 45 },
    'Heaven Hill':         { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 40 },
    'Old Forester':        { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 43 },
    'Elijah Craig':        { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 47 },
    'Angel\'s Envy':       { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 43.3 },
    'Bakers':              { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 53.5 },
    'Basil Hayden':        { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 40 },
    'Blanton\'s':          { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 46.5 },
    'Booker\'s':           { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 62 },
    'George T. Stagg':     { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 67 },
    'Noah\'s Mill':        { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 57.15 },
    'Old Charter':         { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 40 },
    'Old Grand Dad':       { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 40 },
    'Pappy Van Winkle':    { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 45.2 },
    'W.L. Weller':         { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 45 },
    'Weller':              { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 45 },
    'Jefferson\'s':        { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 41.15 },
    'Town Branch':         { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 40 },
    'Kentucky Owl':        { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 48.2 },
    'Russell\'s Reserve':  { type: 'Bourbon',            region: 'Kentucky',     country: 'USA',      abv: 45 },
    // Tennessee
    'Jack Daniel':         { type: 'Tennessee Whiskey',  region: 'Tennessee',    country: 'USA',      abv: 40 },
    'George Dickel':       { type: 'Tennessee Whiskey',  region: 'Tennessee',    country: 'USA',      abv: 45 },
    'Uncle Nearest':       { type: 'Tennessee Whiskey',  region: 'Tennessee',    country: 'USA',      abv: 46.5 },
    // American Rye
    'Rittenhouse':         { type: 'Rye',                region: 'Pennsylvania', country: 'USA',      abv: 50 },
    'WhistlePig':          { type: 'Rye',                region: 'Vermont',      country: 'USA',      abv: 50 },
    'Sazerac':             { type: 'Rye',                region: 'Louisiana',    country: 'USA',      abv: 45 },
    'High West':           { type: 'Rye',                region: 'Utah',         country: 'USA',      abv: 46 },
    'Templeton':           { type: 'Rye',                region: 'Iowa',         country: 'USA',      abv: 40 },
    'Michter\'s':          { type: 'Rye',                region: 'Kentucky',     country: 'USA',      abv: 42.4 },
    'Old Overholt':        { type: 'Rye',                region: 'Kentucky',     country: 'USA',      abv: 40 },
    'Pikesville':          { type: 'Rye',                region: 'Maryland',     country: 'USA',      abv: 55 },
    'Redemption':          { type: 'Rye',                region: 'Indiana',      country: 'USA',      abv: 46 },
    'FEW':                 { type: 'Rye',                region: 'Illinois',     country: 'USA',      abv: 46.5 },
    // Islay Scotch
    'Laphroaig':           { type: 'Islay Single Malt',  region: 'Islay',        country: 'Scotland', abv: 40 },
    'Ardbeg':              { type: 'Islay Single Malt',  region: 'Islay',        country: 'Scotland', abv: 46 },
    'Bowmore':             { type: 'Islay Single Malt',  region: 'Islay',        country: 'Scotland', abv: 40 },
    'Lagavulin':           { type: 'Islay Single Malt',  region: 'Islay',        country: 'Scotland', abv: 43 },
    'Caol Ila':            { type: 'Islay Single Malt',  region: 'Islay',        country: 'Scotland', abv: 43 },
    'Bunnahabhain':        { type: 'Islay Single Malt',  region: 'Islay',        country: 'Scotland', abv: 46.3 },
    'Kilchoman':           { type: 'Islay Single Malt',  region: 'Islay',        country: 'Scotland', abv: 46 },
    'Bruichladdich':       { type: 'Islay Single Malt',  region: 'Islay',        country: 'Scotland', abv: 50 },
    'Port Charlotte':      { type: 'Islay Single Malt',  region: 'Islay',        country: 'Scotland', abv: 50 },
    'Octomore':            { type: 'Islay Single Malt',  region: 'Islay',        country: 'Scotland', abv: 59.3 },
    // Speyside Scotch
    'Balvenie':            { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 40 },
    'Glenfiddich':         { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 40 },
    'Glenlivet':           { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 40 },
    'Macallan':            { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 40 },
    'Glenfarclas':         { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 40 },
    'Aberlour':            { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 40 },
    'Cragganmore':         { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 40 },
    'Dalwhinnie':          { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 43 },
    'Benromach':           { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 43 },
    'Cardhu':              { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 40 },
    'Craigellachie':       { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 46 },
    'Knockando':           { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 43 },
    'Linkwood':            { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 43 },
    'Longmorn':            { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 46 },
    'Mortlach':            { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 43.4 },
    'Strathisla':          { type: 'Single Malt Scotch', region: 'Speyside',     country: 'Scotland', abv: 43 },
    // Highland Scotch
    'GlenDronach':         { type: 'Single Malt Scotch', region: 'Highland',     country: 'Scotland', abv: 43 },
    'Oban':                { type: 'Single Malt Scotch', region: 'Highland',     country: 'Scotland', abv: 43 },
    'Highland Park':       { type: 'Single Malt Scotch', region: 'Highland',     country: 'Scotland', abv: 40 },
    'Glenmorangie':        { type: 'Single Malt Scotch', region: 'Highland',     country: 'Scotland', abv: 43 },
    'Edradour':            { type: 'Single Malt Scotch', region: 'Highland',     country: 'Scotland', abv: 40 },
    'Glengoyne':           { type: 'Single Malt Scotch', region: 'Highland',     country: 'Scotland', abv: 43 },
    'Tomatin':             { type: 'Single Malt Scotch', region: 'Highland',     country: 'Scotland', abv: 40 },
    'Dalmore':             { type: 'Single Malt Scotch', region: 'Highland',     country: 'Scotland', abv: 40 },
    'Balblair':            { type: 'Single Malt Scotch', region: 'Highland',     country: 'Scotland', abv: 46 },
    'Ben Nevis':           { type: 'Single Malt Scotch', region: 'Highland',     country: 'Scotland', abv: 46 },
    'Clynelish':           { type: 'Single Malt Scotch', region: 'Highland',     country: 'Scotland', abv: 46 },
    'Old Pulteney':        { type: 'Single Malt Scotch', region: 'Highland',     country: 'Scotland', abv: 40 },
    'Royal Lochnagar':     { type: 'Single Malt Scotch', region: 'Highland',     country: 'Scotland', abv: 40 },
    // Island Scotch
    'Talisker':            { type: 'Single Malt Scotch', region: 'Island',       country: 'Scotland', abv: 45.8 },
    'Jura':                { type: 'Single Malt Scotch', region: 'Island',       country: 'Scotland', abv: 40 },
    'Ledaig':              { type: 'Single Malt Scotch', region: 'Island',       country: 'Scotland', abv: 46.3 },
    'Tobermory':           { type: 'Single Malt Scotch', region: 'Island',       country: 'Scotland', abv: 46.3 },
    'Arran':               { type: 'Single Malt Scotch', region: 'Island',       country: 'Scotland', abv: 46 },
    // Campbeltown
    'Springbank':          { type: 'Single Malt Scotch', region: 'Campbeltown',  country: 'Scotland', abv: 46 },
    'Glengyle':            { type: 'Single Malt Scotch', region: 'Campbeltown',  country: 'Scotland', abv: 46 },
    'Glen Scotia':         { type: 'Single Malt Scotch', region: 'Campbeltown',  country: 'Scotland', abv: 46 },
    // Blended Scotch
    'Famous Grouse':       { type: 'Blended Scotch',     region: 'Scotland',     country: 'Scotland', abv: 40 },
    'Monkey Shoulder':     { type: 'Blended Scotch',     region: 'Speyside',     country: 'Scotland', abv: 40 },
    'Johnnie Walker':      { type: 'Blended Scotch',     region: 'Scotland',     country: 'Scotland', abv: 40 },
    "Dewar's":             { type: 'Blended Scotch',     region: 'Scotland',     country: 'Scotland', abv: 40 },
    'Chivas':              { type: 'Blended Scotch',     region: 'Scotland',     country: 'Scotland', abv: 40 },
    "Teacher's":           { type: 'Blended Scotch',     region: 'Scotland',     country: 'Scotland', abv: 40 },
    'Cutty Sark':          { type: 'Blended Scotch',     region: 'Scotland',     country: 'Scotland', abv: 40 },
    'Ballantine\'s':       { type: 'Blended Scotch',     region: 'Scotland',     country: 'Scotland', abv: 40 },
    'Bell\'s':             { type: 'Blended Scotch',     region: 'Scotland',     country: 'Scotland', abv: 40 },
    'Grant\'s':            { type: 'Blended Scotch',     region: 'Scotland',     country: 'Scotland', abv: 40 },
    "Robbie Dhu":          { type: 'Blended Scotch',     region: 'Scotland',     country: 'Scotland', abv: 40 },
    // Irish
    'Jameson':             { type: 'Irish Whiskey',      region: 'Cork',         country: 'Ireland',  abv: 40 },
    'Redbreast':           { type: 'Irish Whiskey',      region: 'Dublin',       country: 'Ireland',  abv: 40 },
    'Bushmills':           { type: 'Irish Whiskey',      region: 'Antrim',       country: 'Ireland',  abv: 40 },
    'Teeling':             { type: 'Irish Whiskey',      region: 'Dublin',       country: 'Ireland',  abv: 46 },
    'Green Spot':          { type: 'Irish Whiskey',      region: 'Cork',         country: 'Ireland',  abv: 40 },
    'Yellow Spot':         { type: 'Irish Whiskey',      region: 'Cork',         country: 'Ireland',  abv: 46 },
    'Red Spot':            { type: 'Irish Whiskey',      region: 'Cork',         country: 'Ireland',  abv: 46 },
    'Tullamore':           { type: 'Irish Whiskey',      region: 'Offaly',       country: 'Ireland',  abv: 40 },
    'Slane':               { type: 'Irish Whiskey',      region: 'Meath',        country: 'Ireland',  abv: 40 },
    'Powers':              { type: 'Irish Whiskey',      region: 'Dublin',       country: 'Ireland',  abv: 40 },
    'Kilbeggan':           { type: 'Irish Whiskey',      region: 'Westmeath',    country: 'Ireland',  abv: 40 },
    'Connemara':           { type: 'Irish Whiskey',      region: 'Galway',       country: 'Ireland',  abv: 40 },
    'Midleton':            { type: 'Irish Whiskey',      region: 'Cork',         country: 'Ireland',  abv: 40 },
    "Writer's Tears":      { type: 'Irish Whiskey',      region: 'Dublin',       country: 'Ireland',  abv: 40 },
    'Waterford':           { type: 'Irish Whiskey',      region: 'Waterford',    country: 'Ireland',  abv: 50 },
    // Japanese
    'Nikka':               { type: 'Japanese Whisky',    region: 'Japan',        country: 'Japan',    abv: 43 },
    'Suntory':             { type: 'Japanese Whisky',    region: 'Japan',        country: 'Japan',    abv: 43 },
    'Hakushu':             { type: 'Japanese Whisky',    region: 'Yamanashi',    country: 'Japan',    abv: 43 },
    'Hibiki':              { type: 'Japanese Whisky',    region: 'Japan',        country: 'Japan',    abv: 43 },
    'Yoichi':              { type: 'Japanese Whisky',    region: 'Hokkaido',     country: 'Japan',    abv: 45 },
    'Miyagikyo':           { type: 'Japanese Whisky',    region: 'Miyagi',       country: 'Japan',    abv: 45 },
    'Yamazaki':            { type: 'Japanese Whisky',    region: 'Osaka',        country: 'Japan',    abv: 43 },
    'Toki':                { type: 'Japanese Whisky',    region: 'Japan',        country: 'Japan',    abv: 43 },
    'Chichibu':            { type: 'Japanese Whisky',    region: 'Saitama',      country: 'Japan',    abv: 46 },
    'Akkeshi':             { type: 'Japanese Whisky',    region: 'Hokkaido',     country: 'Japan',    abv: 55 },
    // Canadian
    'Crown Royal':         { type: 'Canadian Whisky',    region: 'Manitoba',     country: 'Canada',   abv: 40 },
    "Canadian Club":       { type: 'Canadian Whisky',    region: 'Ontario',      country: 'Canada',   abv: 40 },
    'Forty Creek':         { type: 'Canadian Whisky',    region: 'Ontario',      country: 'Canada',   abv: 40 },
    'Pendleton':           { type: 'Canadian Whisky',    region: 'British Columbia', country: 'Canada', abv: 40 },
    'Seagram\'s':          { type: 'Canadian Whisky',    region: 'Ontario',      country: 'Canada',   abv: 40 },
  };

  const WHISKEY_NAME_PATTERNS = [
    { pattern: /\bbourbon\b/i,        type: 'Bourbon',            confidence: 0.88 },
    { pattern: /\brye\b/i,            type: 'Rye',                confidence: 0.85 },
    { pattern: /\bislay\b/i,          type: 'Islay Single Malt',  confidence: 0.92 },
    { pattern: /\bsingle malt\b/i,    type: 'Single Malt Scotch', confidence: 0.90 },
    { pattern: /\bscotch\b/i,         type: 'Blended Scotch',     confidence: 0.75 },
    { pattern: /\birish\b/i,          type: 'Irish Whiskey',      confidence: 0.88 },
    { pattern: /\bjapanese\b/i,       type: 'Japanese Whisky',    confidence: 0.88 },
    { pattern: /\btennessee\b/i,      type: 'Tennessee Whiskey',  confidence: 0.88 },
    { pattern: /\bcanadian\b/i,       type: 'Canadian Whisky',    confidence: 0.85 },
    { pattern: /\bspeyside\b/i,       type: 'Single Malt Scotch', confidence: 0.85 },
    { pattern: /\bhighland\b/i,       type: 'Single Malt Scotch', confidence: 0.80 },
  ];

  /**
   * Infer metadata for a bottle from known distilleries or name patterns.
   * Returns only fields that are actually missing from the bottle.
   */
  function inferBottleMetadata(bottle) {
    let distilleryData = null;
    let inferConfidence = 0;

    const distilleryStr = (bottle.distillery || '').toLowerCase();
    const nameStr       = (bottle.name        || '').toLowerCase();
    const searchStr     = distilleryStr || nameStr;

    if (!searchStr) return { payload: null, confidence: 0 };

    for (const [key, data] of Object.entries(KNOWN_DISTILLERIES)) {
      const keyLower = key.toLowerCase();
      if (searchStr.includes(keyLower) || keyLower.includes(searchStr.replace(/\s+\d+.*$/, ''))) {
        distilleryData  = data;
        inferConfidence = 0.85;
        break;
      }
    }

    if (!distilleryData) {
      for (const { pattern, type, confidence } of WHISKEY_NAME_PATTERNS) {
        if (pattern.test(nameStr) || pattern.test(distilleryStr)) {
          distilleryData  = { type };
          inferConfidence = confidence;
          break;
        }
      }
    }

    if (!distilleryData) return { payload: null, confidence: 0 };

    const payload = {};
    if (!bottle.type && !bottle.whiskey_type && distilleryData.type)   payload.type   = distilleryData.type;
    if (!bottle.region  && distilleryData.region)  payload.region  = distilleryData.region;
    if (!bottle.country && distilleryData.country) payload.country = distilleryData.country;
    if (!bottle.abv     && distilleryData.abv)     payload.abv     = distilleryData.abv;

    if (!Object.keys(payload).length) return { payload: null, confidence: 0 };
    return { payload, confidence: inferConfidence };
  }

  // ── Bottles missing core metadata ─────────────────────────────────────────
  const bottlesMissingMeta = bottles.filter(
    (b) => !b.distillery || !b.region || !b.age || !b.abv || !(b.type || b.whiskey_type)
  );
  if (bottlesMissingMeta.length > 0) {
    const items = bottlesMissingMeta.slice(0, MAX_ITEMS_PER_REC).map((b) => {
      const missing = [];
      if (!b.distillery) missing.push('distillery');
      if (!b.region) missing.push('region');
      if (!b.country) missing.push('country');
      if (!b.age) missing.push('age');
      if (!b.abv) missing.push('ABV');
      if (!(b.type || b.whiskey_type)) missing.push('spirit type');

      // Use the comprehensive KNOWN_DISTILLERIES catalog lookup first,
      // which yields higher-confidence inferences than name-pattern guessing.
      const { payload: catalogPayload, confidence: catalogConfidence } = inferBottleMetadata(b);

      return {
        id: b.id,
        recordId: b.id,
        recordType: 'bottle',
        recordName: b.name,
        itemName: b.name,
        missingFields: missing,
        ownershipStatus: 'owned',
        proposedChange: catalogPayload
          ? {
              confidence: catalogConfidence,
              payload: catalogPayload,
              rationale: 'Values inferred from the known distillery catalog.',
            }
          : null,
      };
    });

    const actionableCount = items.filter((i) => i.proposedChange?.payload).length;

    recommendations.push(createRecommendation({
      category:           CATEGORY.RECORD_OPTIMIZATION,
      goal:               'bottle_missing_core_metadata',
      actionType:         actionableCount > 0 ? ACTION_TYPE.AUTO_FIX : ACTION_TYPE.REVIEW_REQUIRED,
      title:              'Bottles Missing Core Metadata',
      summary:            `${items.length} bottle${items.length > 1 ? 's have' : ' has'} incomplete records.${actionableCount > 0 ? ` ${actionableCount} can be auto-filled from the distillery catalog.` : ''}`,
      whyItMatters:       'Spirit type, region, and ABV are not just descriptive — they determine which blends and cigars this bottle can be paired with.',
      recommendationText: actionableCount > 0
        ? `Apply Fix to auto-fill ${actionableCount} bottle${actionableCount > 1 ? 's' : ''} from the distillery catalog. Review each result before committing if needed.`
        : 'Open each bottle and fill in the missing fields — distillery, region, spirit type, and ABV.',
      moduleKey:          MODULE_KEY.WHISKEY,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           items.length >= 5 ? PRIORITY.MEDIUM : PRIORITY.LOW,
      confidence:         'high',
      items,
    }));
  }

  // ── Bottles missing valuation ─────────────────────────────────────────────
  const bottlesMissingValue = bottles.filter(
    (b) => !b.retail_price && !b.aftermarket_price && !b.collector_value
  );
  if (bottlesMissingValue.length > 0) {
    const deriveBottleValuePayload = (bottle) => {
      const retail = Number(bottle.retail_price || 0);
      const market = Number(bottle.aftermarket_price || 0);
      const collector = Number(bottle.collector_value || 0);
      if (retail || market || collector) return null;

      const purchase = Number(bottle.purchase_price || 0);
      const fallback = purchase > 0 ? purchase : 0;
      if (!fallback) return null;

      return {
        retail_price: fallback,
        estimated_value: fallback,
      };
    };

    const items = bottlesMissingValue.slice(0, MAX_ITEMS_PER_REC).map((b) => {
      const payload = deriveBottleValuePayload(b);
      return {
        id: b.id,
        recordId: b.id,
        recordType: 'bottle',
        recordName: b.name,
        itemName: b.name,
        ownershipStatus: 'owned',
        missingFields: ['valuation'],
        proposedChange: payload
          ? {
              confidence: 0.82,
              payload,
              rationale: 'Value derived from existing purchase price fallback.',
            }
          : null,
      };
    });

    const actionableCount = items.filter((i) => i.proposedChange?.payload).length;

    recommendations.push(createRecommendation({
      category:           CATEGORY.RECORD_OPTIMIZATION,
      goal:               'bottle_missing_valuation',
      actionType:         actionableCount > 0 ? ACTION_TYPE.AUTO_FIX : ACTION_TYPE.REVIEW_REQUIRED,
      title:              'Bottles Without Valuation Data',
      summary:            `${items.length} bottles have no pricing data — your collection's total value is understated.`,
      whyItMatters:       'Valuation data shows what the collection is actually worth and informs purchase priority.',
      recommendationText: actionableCount > 0
        ? `${actionableCount} bottles can be valued automatically using the existing valuation fallback chain.`
        : 'These bottles need manual review.',
      moduleKey:          MODULE_KEY.WHISKEY,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.LOW,
      confidence:         'medium',
      items,
    }));
  }

  // ── Pipes missing shape classification ───────────────────────────────────
  const pipesMissingClass = pipes.filter((p) => !p.shape && !p.bowl_style);
  if (pipesMissingClass.length >= 3) {
    const items = pipesMissingClass.slice(0, MAX_ITEMS_PER_REC).map((p) => {
      const lookup = inferPipeShape(p);
      return {
        id: p.id,
        recordId: p.id,
        recordType: 'pipe',
        recordName: p.name,
        itemName: p.name,
        maker: p.maker || null,
        ownershipStatus: 'owned',
        proposedChange: lookup.shape
          ? { confidence: lookup.confidence, payload: { shape: lookup.shape }, rationale: 'Matched from production pipe catalog' }
          : null,
      };
    });

    const withPayloads = items.filter((i) => i.proposedChange);
    const actionType   = withPayloads.length > 0 ? ACTION_TYPE.AUTO_FIX : ACTION_TYPE.REVIEW_REQUIRED;

    recommendations.push(createRecommendation({
      category:           CATEGORY.RECORD_OPTIMIZATION,
      goal:               'pipe_missing_shape',
      actionType,
      title:              'Pipes Missing Shape Classification',
      summary: withPayloads.length > 0
        ? `${withPayloads.length} of ${items.length} pipe${items.length > 1 ? 's' : ''} matched in the production catalog — shape ready to apply.`
        : `${items.length} pipe${items.length > 1 ? 's are' : ' is'} missing shape or bowl style.`,
      whyItMatters:       'Shape drives bowl volume and smoking characteristics. Without it, collection diversity analysis is incomplete.',
      recommendationText: withPayloads.length > 0
        ? `Apply Fix to auto-fill ${withPayloads.length} shape${withPayloads.length > 1 ? 's' : ''} from the pipe catalog.`
        : 'Open each pipe and add the shape — Billiard, Dublin, Bent, Pot, or whichever applies.',
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
  // Exclude ai_excluded items: collectible-only / hold pieces must not influence rotation balance
  const blends = filterAiEligibleItems(context.blends || []);
  const pipes  = filterAiEligibleItems(context.pipes  || []);
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
  // Exclude ai_excluded items: collectible-only / hold-only pieces must not appear in rotation recommendations
  const blends     = filterAiEligibleItems(context.blends || []);
  const pipes      = filterAiEligibleItems(context.pipes  || []);
  const { smokingLogs = [] } = context;
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

// ─── Category B: Collection Optimization — Whiskey-native ────────────────────

/**
 * Whiskey-specific collection optimization analysis.
 * Active when WhiskeyKeeper is the primary or only module.
 */
function analyzeWhiskeyCollection(context) {
  const { bottles = [], tastingLogs = [], inventoryUnits = [], acquisitionItems = [] } = context;
  const recommendations = [];
  const now = nowMs();

  if (!bottles.length) return recommendations;

  // ── Bottles never tasted ────────────────────────────────────────────────────
  const tastedIds = new Set(
    tastingLogs.map((l) => l.bottle_id || l.bottleId).filter(Boolean)
  );
  const neverTasted = bottles.filter((b) => !tastedIds.has(b.id));
  if (neverTasted.length >= 2) {
    const items = neverTasted.slice(0, MAX_ITEMS_PER_REC).map((b) => ({
      id: b.id,
      recordId: b.id,
      recordType: 'bottle',
      recordName: b.name,
      itemName: b.name,
      ownershipStatus: 'owned',
    }));

    recommendations.push(createRecommendation({
      category:           CATEGORY.COLLECTION_OPTIMIZATION,
      goal:               'whiskey_bottles_never_tasted',
      actionType:         ACTION_TYPE.ADVISORY,
      title:              'Bottles With No Tasting History',
      summary:            `${neverTasted.length} bottle${neverTasted.length > 1 ? 's have' : ' has'} never been logged. These are invisible to Curator's session and pairing logic.`,
      whyItMatters:       'Tasting notes, even brief ones, let Curator recommend these bottles for sessions and pairings. Without at least one log entry, a bottle is dead weight in the rotation.',
      recommendationText: 'Pick the one you are most curious about and log even a short tasting. One entry is enough to bring it into the rotation.',
      moduleKey:          MODULE_KEY.WHISKEY,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           neverTasted.length >= 5 ? PRIORITY.MEDIUM : PRIORITY.LOW,
      confidence:         'high',
      items,
      actionPayload:      { type: 'view_bottles', filter: 'never_tasted' },
    }));
  }

  // ── Style/region overconcentration ──────────────────────────────────────────
  const typeCounts = {};
  const regionCounts = {};
  for (const b of bottles) {
    const type = b.type || b.whiskey_type || null;
    if (type) typeCounts[type] = (typeCounts[type] || 0) + 1;
    const region = b.region || null;
    if (region) regionCounts[region] = (regionCounts[region] || 0) + 1;
  }
  const classifiedByType = Object.values(typeCounts).reduce((s, n) => s + n, 0);
  if (classifiedByType >= 4) {
    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const [topType, topCount] = sortedTypes[0];
    const ratio = topCount / classifiedByType;
    if (ratio >= IMBALANCE_THRESHOLD) {
      const pct = Math.round(ratio * 100);
      recommendations.push(createRecommendation({
        category:           CATEGORY.COLLECTION_OPTIMIZATION,
        goal:               'whiskey_style_overconcentration',
        actionType:         ACTION_TYPE.ADVISORY,
        title:              'Collection Skewed Toward One Spirit Style',
        summary:            `${pct}% of your classified bottles are ${topType}. That leaves large blind spots in tasting range and pairing options.`,
        whyItMatters:       `A whiskey collection heavily weighted toward ${topType} loses the contrast and range that makes each bottle distinct. Different styles offer different flavor profiles, pairings, and moods.`,
        recommendationText: `Your Grow & Expand recommendations include specific suggestions for which style to explore next based on your current ${topType}-heavy collection.`,
        moduleKey:          MODULE_KEY.WHISKEY,
        ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
        priority:           PRIORITY.LOW,
        confidence:         computeConfidence({
          preferenceAlignment:   0.5,
          usageHistoryRelevance: 0.5,
          dataCompleteness:      classifiedByType >= 6 ? 0.9 : 0.6,
          diversityContribution: 0.8,
        }),
        items:              bottles.filter((b) => (b.type || b.whiskey_type) === topType).slice(0, MAX_ITEMS_PER_REC).map((b) => ({
          id: b.id, recordId: b.id, recordType: 'bottle', recordName: b.name, itemName: b.name, ownershipStatus: 'owned',
        })),
        actionPayload:      { type: 'balance_insight', topType, ratio: pct, totalTyped: classifiedByType },
      }));
    }
  }

  // ── Depleted bottles still in collection ────────────────────────────────────
  const depleted = bottles.filter((b) => {
    const remaining = Number(b.remaining_pours ?? b.current_pours ?? b.pours_remaining);
    if (!Number.isNaN(remaining)) return remaining === 0;
    const percent = Number(b.fill_level_percent ?? b.fill_percent ?? b.fill_level);
    if (!Number.isNaN(percent)) return percent === 0;
    return false;
  });
  // Only flag depleted bottles that are not already in the purchase queue
  const trackedRestockIds = new Set(
    acquisitionItems
      .filter((i) => ['restock', 'shopping_list'].includes(String(i.status || '').toLowerCase()))
      .map((i) => i.id)
  );
  const depletedUntracked = depleted.filter((b) => !trackedRestockIds.has(b.id));
  if (depletedUntracked.length >= 1) {
    const items = depletedUntracked.slice(0, MAX_ITEMS_PER_REC).map((b) => ({
      id: b.id,
      recordId: b.id,
      recordType: 'bottle',
      recordName: b.name,
      itemName: b.name,
      ownershipStatus: 'depleted',
    }));
    recommendations.push(createRecommendation({
      category:           CATEGORY.COLLECTION_OPTIMIZATION,
      goal:               'whiskey_depleted_bottles',
      actionType:         ACTION_TYPE.ADVISORY,
      title:              'Depleted Bottles Still in Collection',
      summary:            `${depletedUntracked.length} empty bottle${depletedUntracked.length > 1 ? 's are' : ' is'} still tracked as active inventory. These take up rotation space and may affect collection value estimates.`,
      whyItMatters:       'Depleted bottles that are not being restocked should be archived or marked for restock so the collection picture is accurate.',
      recommendationText: 'Archive bottles you are not planning to replace, or add them to your restock list if you intend to get another.',
      moduleKey:          MODULE_KEY.WHISKEY,
      ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
      priority:           PRIORITY.LOW,
      confidence:         'high',
      items,
      actionPayload:      { type: 'view_bottles', filter: 'depleted' },
    }));
  }

  // ── Underused bottles (last tasting > 90 days, not depleted) ───────────────
  const UNDERUSED_BOTTLE_DAYS = 90;
  const bottleLastTasted = {};
  for (const log of tastingLogs) {
    const bid = log.bottle_id || log.bottleId;
    const ts  = new Date(log.tasting_date || log.date || log.created_date).getTime();
    if (bid && !isNaN(ts)) {
      if (!bottleLastTasted[bid] || ts > bottleLastTasted[bid]) bottleLastTasted[bid] = ts;
    }
  }
  if (tastingLogs.length > 0) {
    const underused = bottles
      .filter((b) => {
        const remaining = Number(b.remaining_pours ?? b.current_pours ?? b.pours_remaining);
        const percent   = Number(b.fill_level_percent ?? b.fill_percent ?? b.fill_level);
        const isEmpty   = (!isNaN(remaining) && remaining === 0) || (!isNaN(percent) && percent === 0);
        if (isEmpty) return false;
        const last = bottleLastTasted[b.id];
        if (!last) return false; // never tasted is handled separately
        return (now - last) / 86_400_000 > UNDERUSED_BOTTLE_DAYS;
      })
      .sort((a, b) => (bottleLastTasted[a.id] || 0) - (bottleLastTasted[b.id] || 0));

    if (underused.length >= 2) {
      const items = underused.slice(0, MAX_ITEMS_PER_REC).map((b) => {
        const daysAgo = bottleLastTasted[b.id]
          ? Math.floor((now - bottleLastTasted[b.id]) / 86_400_000)
          : null;
        return {
          id: b.id,
          recordId: b.id,
          recordType: 'bottle',
          recordName: b.name,
          itemName: b.name,
          lastUsedDaysAgo: daysAgo,
          ownershipStatus: 'owned',
        };
      });
      const longestGap  = items[0]?.lastUsedDaysAgo;
      const longestName = items[0]?.itemName;

      recommendations.push(createRecommendation({
        category:           CATEGORY.COLLECTION_OPTIMIZATION,
        goal:               'whiskey_underused_bottles',
        actionType:         ACTION_TYPE.ADVISORY,
        title:              'Bottles Overdue for a Pour',
        summary:            longestGap
          ? `${longestName} hasn't been tasted in ${longestGap} days.${items.length > 1 ? ` ${items.length - 1} other bottle${items.length > 2 ? 's are' : ' is'} also sitting idle.` : ''}`
          : `${items.length} bottles haven't been tasted in ${UNDERUSED_BOTTLE_DAYS}+ days.`,
        whyItMatters:       'Whiskey continues to evolve once opened. A bottle untouched for months may be at a different peak than when you last poured it — for better or worse.',
        recommendationText: 'Pour the oldest-sitting bottle first. Even a brief tasting note refreshes Curator\'s data and keeps the rotation honest.',
        moduleKey:          MODULE_KEY.WHISKEY,
        ownershipContext:   OWNERSHIP_CONTEXT.IN_COLLECTION,
        priority:           PRIORITY.MEDIUM,
        confidence:         'high',
        items,
        actionPayload:      { type: 'view_bottles', filter: 'underused' },
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
  const whiskeyActive = context.activeModules?.whiskeykeeper !== false;

  const allRecommendations = [
    ...analyzeMetadata(context),
    ...analyzeBalance(context),
    ...analyzeUtilization(context),
    ...(whiskeyActive ? analyzeWhiskeyCollection(context) : []),
    ...generatePurchaseRestockRecommendations({
      blends:             context.blends || [],
      bottles:            context.bottles || [],
      cigars:             context.cigars || [],
      wantListItems:      context.wantListItems || [],
      acquisitionItems:   context.acquisitionItems || [],
      cigarModuleActive:  context.cigarModuleActive || false,
      activeModules:      context.activeModules || {},
    }),
    ...generateSpecializationRecommendations(
      context.pipes || [],
      context.blends || [],
      context.smokingLogs || [],
      context.preferences || {}
    ),
    ...generatePairingRecommendations(context),
    ...generateGrowExpandRecommendations({
      pipes:         context.pipes || [],
      blends:        context.blends || [],
      bottles:       context.bottles || [],
      smokingLogs:   context.smokingLogs || [],
      preferences:   context.preferences || {},
      activeModules: context.activeModules || {},
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
