/**
 * wineTaxonomy.js
 *
 * Comprehensive, collector-grade taxonomy for WineKeeper style and varietal fields.
 *
 * Exports:
 *   STYLE_GROUPS        — grouped style options for the Style selector
 *   VARIETAL_GROUPS     — grouped varietal options for the Varietal selector
 *   ALL_STYLES          — flat list of all style strings
 *   ALL_VARIETALS       — flat list of all varietal strings
 *   STYLE_ALIASES       — map from normalized key → canonical display string
 *   VARIETAL_ALIASES    — map from alias → canonical varietal name
 *   getStyleKey         — normalize a style display string to a storage key
 *   getStyleDisplay     — return display string for a stored style key
 *   normalizeVarietalName — lowercase/trim a varietal for alias lookup
 *   resolveVarietalAlias  — resolve Syrah→Syrah, Shiraz→Shiraz (linked, not overwritten)
 *   buildVarietalDisplay  — build a human-readable blend display string
 *   migrateWineVarietals  — migrate legacy string varietal field to new array model
 */

// ---------------------------------------------------------------------------
// STYLE TAXONOMY
// ---------------------------------------------------------------------------

export const STYLE_GROUPS = [
  {
    group: 'Still Wines',
    options: [
      'Red',
      'White',
      'Rosé',
      'Orange',
      'Claret',
      'Field Blend',
      'Skin Contact White',
    ],
  },
  {
    group: 'Sparkling',
    options: [
      'Sparkling',
      'Champagne',
      'Cava',
      'Prosecco',
      'Crémant',
      'Franciacorta',
      'Pét-Nat',
      'Traditional Method Sparkling',
    ],
  },
  {
    group: 'Fortified / Sweet',
    options: [
      'Dessert',
      'Fortified',
      'Port',
      'Sherry',
      'Madeira',
      'Marsala',
      'Vermouth',
      'Ice Wine',
      'Late Harvest',
      'Sauternes-style',
      'Tokaji-style',
    ],
  },
  {
    group: 'Aromatized / Specialty',
    options: [
      'Aromatized',
      'Fruit Wine',
      'Mead',
      'Rice Wine',
      'Non-Grape Wine',
    ],
  },
  {
    group: 'Regional / Legacy Terms',
    options: [
      'Bordeaux Blend',
      'Rhône Blend',
      'Super Tuscan',
      'Chianti Style',
      'Rioja Style',
      'Burgundy Style',
    ],
  },
  {
    group: 'Other',
    options: ['Other'],
  },
];

/** Flat list of all canonical style display strings. */
export const ALL_STYLES = STYLE_GROUPS.flatMap((g) => g.options);

/**
 * Map from normalized (lowercase, no-space) style key → canonical display string.
 * Includes legacy keys from the old 8-item enum for backward compatibility.
 */
export const STYLE_ALIASES = {
  // Legacy enum values → canonical display strings
  red: 'Red',
  white: 'White',
  rosé: 'Rosé',
  rose: 'Rosé',
  sparkling: 'Sparkling',
  dessert: 'Dessert',
  fortified: 'Fortified',
  orange: 'Orange',
  other: 'Other',
  // Additional canonical keys
  champagne: 'Champagne',
  cava: 'Cava',
  prosecco: 'Prosecco',
  crémant: 'Crémant',
  cremant: 'Crémant',
  franciacorta: 'Franciacorta',
  'pét-nat': 'Pét-Nat',
  'pet-nat': 'Pét-Nat',
  petnat: 'Pét-Nat',
  'traditional method sparkling': 'Traditional Method Sparkling',
  claret: 'Claret',
  'field blend': 'Field Blend',
  'skin contact white': 'Skin Contact White',
  port: 'Port',
  sherry: 'Sherry',
  madeira: 'Madeira',
  marsala: 'Marsala',
  vermouth: 'Vermouth',
  'ice wine': 'Ice Wine',
  icewine: 'Ice Wine',
  'late harvest': 'Late Harvest',
  'sauternes-style': 'Sauternes-style',
  'tokaji-style': 'Tokaji-style',
  aromatized: 'Aromatized',
  'fruit wine': 'Fruit Wine',
  mead: 'Mead',
  'rice wine': 'Rice Wine',
  'non-grape wine': 'Non-Grape Wine',
  'bordeaux blend': 'Bordeaux Blend',
  'rhône blend': 'Rhône Blend',
  'rhone blend': 'Rhône Blend',
  'super tuscan': 'Super Tuscan',
  'chianti style': 'Chianti Style',
  'rioja style': 'Rioja Style',
  'burgundy style': 'Burgundy Style',
};

/**
 * Normalize a style display string to a lowercase storage key.
 * @param {string} style
 * @returns {string}
 */
export function getStyleKey(style) {
  if (!style) return '';
  return style.toLowerCase().trim();
}

/**
 * Return the canonical display string for a stored style key.
 * Falls back to the original string (title-cased) if key not found.
 * @param {string} key
 * @returns {string}
 */
export function getStyleDisplay(key) {
  if (!key) return '';
  const lower = key.toLowerCase().trim();
  if (STYLE_ALIASES[lower]) return STYLE_ALIASES[lower];
  // Fall back: return original with first letter uppercased
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// ---------------------------------------------------------------------------
// VARIETAL TAXONOMY
// ---------------------------------------------------------------------------

export const VARIETAL_GROUPS = [
  {
    group: 'Red Grapes',
    options: [
      'Cabernet Sauvignon',
      'Merlot',
      'Pinot Noir',
      'Syrah',
      'Shiraz',
      'Grenache',
      'Tempranillo',
      'Sangiovese',
      'Nebbiolo',
      'Malbec',
      'Zinfandel',
      'Primitivo',
      'Mourvèdre',
      'Carignan',
      'Petit Verdot',
      'Cabernet Franc',
      'Gamay',
      'Barbera',
      'Dolcetto',
      'Touriga Nacional',
      'Tannat',
      "Nero d'Avola",
      'Aglianico',
      'Corvina',
      'Montepulciano',
      'Blaufränkisch',
      'Cinsault',
      'Alicante Bouschet',
      'Mencía',
      'Xinomavro',
      'Pinotage',
      'Carmenère',
      'País',
      'Bonarda',
      'Dornfelder',
      'Lemberger',
      'Zweigelt',
      'St. Laurent',
      'Baga',
      'Trincadeira',
      'Frappato',
      'Nerello Mascalese',
      'Gaglioppo',
      'Sagrantino',
      'Tinta Roriz',
      'Tinta Barroca',
      'Castelão',
      'Lagrein',
      'Teroldego',
      'Schiava',
      'Grignolino',
      'Freisa',
      'Pelaverga',
      'Poulsard',
      'Trousseau',
      'Negrette',
      'Fer Servadou',
      'Mérille',
      'Mauzan',
      'Piquepoul Noir',
      'Counoise',
      'Mondeuse',
      'Persan',
    ],
  },
  {
    group: 'White Grapes',
    options: [
      'Chardonnay',
      'Sauvignon Blanc',
      'Riesling',
      'Chenin Blanc',
      'Pinot Grigio',
      'Pinot Gris',
      'Gewürztraminer',
      'Viognier',
      'Albariño',
      'Verdejo',
      'Grüner Veltliner',
      'Sémillon',
      'Muscadet / Melon de Bourgogne',
      'Marsanne',
      'Roussanne',
      'Fiano',
      'Falanghina',
      'Garganega',
      'Trebbiano',
      'Arneis',
      'Assyrtiko',
      'Torrontés',
      'Vermentino',
      'Muscat',
      'Palomino',
      'Verdelho',
      'Friulano',
      'Tocai Friulano',
      'Pinot Blanc',
      'Aligoté',
      'Bourgogne Blanc',
      'Petit Manseng',
      'Gros Manseng',
      'Colombard',
      'Ugni Blanc',
      'Picpoul',
      'Clairette',
      'Rolle',
      'Verdicchio',
      'Ribolla Gialla',
      'Pecorino',
      'Catarratto',
      'Carricante',
      'Grecanico',
      'Greco di Tufo',
      'Grechetto',
      'Nosiola',
      'Kerner',
      'Müller-Thurgau',
      'Scheurebe',
      'Silvaner',
      'Elbling',
      'Loureiro',
      'Arinto',
      'Antão Vaz',
      'Siria',
      'Roupeiro',
      'Alvarinho',
      'Avesso',
      'Gouveio',
      'Encruzado',
      'Bical',
      'Fernão Pires',
      'Macabeo / Viura',
      'Xarel-lo',
      'Parellada',
      'Txakoli',
      'Godello',
      'Treixadura',
      'Torrontés Riojano',
      'Torrontés Mendocino',
    ],
  },
  {
    group: 'Rosé / Flexible',
    options: [
      'Grenache Rosé',
      'Provence Blend',
      'Rosado Blend',
      'Field Blend',
      'Cinsault Rosé',
      'Pinot Noir Rosé',
      'Sangiovese Rosé',
      'Syrah Rosé',
    ],
  },
  {
    group: 'Sparkling Grapes',
    options: [
      'Pinot Meunier',
      'Glera',
      'Xarel-lo',
      'Macabeo',
      'Parellada',
      'Chardonnay Blanc de Blancs',
      'Pinot Noir Blanc de Noirs',
      'Champagne Blend',
    ],
  },
  {
    group: 'Dessert / Fortified Grapes',
    options: [
      'Pedro Ximénez',
      'Moscatel',
      'Bual',
      'Malvasia',
      'Sercial',
      'Verdelho',
      'Tinta Negra',
      'Terrantez',
      'Aleatico',
      'Zibibbo',
      'Pantelleria Blend',
      'Moscato',
      'Recioto Blend',
    ],
  },
  {
    group: 'Blend Labels',
    options: [
      'GSM Blend',
      'Bordeaux Blend',
      'Rhône Blend',
      'Super Tuscan Blend',
      'Meritage',
      'Field Blend',
      'Indigenous Blend',
      'Traditional Blend',
    ],
  },
];

/** Flat list of all canonical varietal display strings. */
export const ALL_VARIETALS = VARIETAL_GROUPS.flatMap((g) => g.options);

/**
 * Varietal alias map: alias (lowercase) → canonical name.
 * Aliases are linked (not overwritten on the record) so Syrah stays Syrah.
 * Used for search normalization and filter matching.
 */
export const VARIETAL_ALIASES = {
  // Pinot Grigio / Pinot Gris — regional names for the same grape
  'pinot grigio': 'Pinot Gris',
  'pinot gris': 'Pinot Gris',

  // Syrah / Shiraz — same grape, different market names
  syrah: 'Syrah',
  shiraz: 'Syrah',

  // Primitivo / Zinfandel — genetically identical
  primitivo: 'Zinfandel',
  zinfandel: 'Zinfandel',

  // Garnacha / Grenache
  garnacha: 'Grenache',
  grenache: 'Grenache',

  // Tempranillo aliases
  tempranillo: 'Tempranillo',
  'tinta de toro': 'Tempranillo',
  'tinta del país': 'Tempranillo',
  cencibel: 'Tempranillo',
  'tinta roriz': 'Tempranillo',
  aragonés: 'Tempranillo',

  // Mourvèdre / Monastrell / Mataro
  'mourvèdre': 'Mourvèdre',
  mourvedre: 'Mourvèdre',
  monastrell: 'Mourvèdre',
  mataro: 'Mourvèdre',

  // Muscadet alias
  'melon de bourgogne': 'Muscadet / Melon de Bourgogne',
  muscadet: 'Muscadet / Melon de Bourgogne',

  // Macabeo alias
  'macabeo': 'Macabeo',
  viura: 'Macabeo',
  'macabeo / viura': 'Macabeo',

  // Semillon
  semillon: 'Sémillon',
  'sémillon': 'Sémillon',

  // Albariño
  alvarinho: 'Albariño',
  'albariño': 'Albariño',

  // Grüner Veltliner
  'grüner veltliner': 'Grüner Veltliner',
  'gruner veltliner': 'Grüner Veltliner',

  // Gewürztraminer
  'gewürztraminer': 'Gewürztraminer',
  gewurztraminer: 'Gewürztraminer',

  // Nero d'Avola
  "nero d'avola": "Nero d'Avola",
  'nero davola': "Nero d'Avola",

  // Blaufränkisch
  'blaufränkisch': 'Blaufränkisch',
  blaufrankisch: 'Blaufränkisch',
  lemberger: 'Blaufränkisch',

  // Mencía
  'mencía': 'Mencía',
  mencia: 'Mencía',
};

/**
 * Normalize a varietal name for alias lookup.
 * @param {string} name
 * @returns {string}
 */
export function normalizeVarietalName(name) {
  if (!name) return '';
  return name.toLowerCase().trim();
}

/**
 * Resolve a varietal name through aliases.
 * Returns the canonical form (or the input if no alias found).
 * Does NOT overwrite the stored value — aliases are linked for search matching only.
 * @param {string} name
 * @returns {string}
 */
export function resolveVarietalAlias(name) {
  if (!name) return name;
  const key = normalizeVarietalName(name);
  return VARIETAL_ALIASES[key] || name;
}

/**
 * Get all canonical names that alias to the same grape as the given name.
 * Used for filter matching (search for "Shiraz" also matches "Syrah" wines).
 * @param {string} name
 * @returns {string[]} — array of canonical forms (may include the original)
 */
export function getVarietalAliasGroup(name) {
  if (!name) return [];
  const canonical = resolveVarietalAlias(name);
  const aliases = Object.entries(VARIETAL_ALIASES)
    .filter(([, v]) => v === canonical)
    .map(([k]) => k);
  return [...new Set([canonical.toLowerCase(), ...aliases])];
}

/**
 * Build a human-readable display string from an array of varietals.
 * @param {string[]} varietals
 * @returns {string}
 */
export function buildVarietalDisplay(varietals) {
  if (!Array.isArray(varietals) || varietals.length === 0) return '';
  if (varietals.length === 1) return varietals[0];
  return varietals.join(' / ');
}

/**
 * Migrate a legacy wine record's single `varietal` string into the new array model.
 * Safe to call on records that already have blend_components populated.
 *
 * Returns the fields to merge into the wine object for the new data model:
 *   - blend_components  (array)
 *   - varietal_primary  (string)
 *   - varietal_display  (string)
 *   - is_blend          (boolean)
 *
 * Does NOT mutate the passed object.
 * @param {object} wine — raw wine record
 * @returns {object} — fields to merge
 */
export function migrateWineVarietals(wine) {
  if (!wine) return {};

  // If new array model already populated, use it
  if (Array.isArray(wine.blend_components) && wine.blend_components.length > 0) {
    const varietals = wine.blend_components;
    return {
      blend_components: varietals,
      varietal_primary: varietals[0] || '',
      varietal_display: buildVarietalDisplay(varietals),
      is_blend: varietals.length > 1,
    };
  }

  // Fall back to legacy varietal string
  if (wine.varietal) {
    return {
      blend_components: [wine.varietal],
      varietal_primary: wine.varietal,
      varietal_display: wine.varietal,
      is_blend: false,
    };
  }

  return {
    blend_components: [],
    varietal_primary: '',
    varietal_display: '',
    is_blend: false,
  };
}

/**
 * Filter a wine list by style.
 * Matches against the stored `style` field (case-insensitive).
 * @param {object[]} wines
 * @param {string} styleFilter — display string or key
 * @returns {object[]}
 */
export function filterWinesByStyle(wines, styleFilter) {
  if (!styleFilter || styleFilter === 'all') return wines;
  const filterKey = getStyleKey(styleFilter);
  return wines.filter((w) => {
    if (!w.style) return false;
    return getStyleKey(w.style) === filterKey;
  });
}

/**
 * Filter a wine list by varietal (supports alias matching).
 * Checks both the legacy `varietal` field and `blend_components` array.
 * @param {object[]} wines
 * @param {string} varietalFilter
 * @returns {object[]}
 */
export function filterWinesByVarietal(wines, varietalFilter) {
  if (!varietalFilter || varietalFilter === 'all') return wines;
  const aliasGroup = getVarietalAliasGroup(varietalFilter);
  const filterLower = normalizeVarietalName(varietalFilter);

  return wines.filter((w) => {
    // Check blend_components array
    if (Array.isArray(w.blend_components) && w.blend_components.length > 0) {
      return w.blend_components.some((v) => {
        const vLower = normalizeVarietalName(v);
        return vLower === filterLower || aliasGroup.includes(vLower);
      });
    }
    // Fall back to legacy varietal string
    if (w.varietal) {
      const vLower = normalizeVarietalName(w.varietal);
      return vLower === filterLower || aliasGroup.includes(vLower);
    }
    return false;
  });
}

/**
 * Compute a varietal breakdown map from a wine collection.
 * Respects both legacy `varietal` field and new `blend_components` array.
 * @param {object[]} wines
 * @returns {Record<string, number>} — varietal → count
 */
export function computeVarietalBreakdown(wines) {
  if (!Array.isArray(wines)) return {};
  const breakdown = {};
  for (const w of wines) {
    const varietals = Array.isArray(w.blend_components) && w.blend_components.length > 0
      ? w.blend_components
      : w.varietal
        ? [w.varietal]
        : [];
    for (const v of varietals) {
      if (v) breakdown[v] = (breakdown[v] || 0) + 1;
    }
  }
  return breakdown;
}

/**
 * Compute a blend vs single-varietal breakdown.
 * @param {object[]} wines
 * @returns {{ blends: number, singles: number, unspecified: number }}
 */
export function computeBlendBreakdown(wines) {
  if (!Array.isArray(wines)) return { blends: 0, singles: 0, unspecified: 0 };
  let blends = 0;
  let singles = 0;
  let unspecified = 0;
  for (const w of wines) {
    const hasComponents = Array.isArray(w.blend_components) && w.blend_components.length > 0;
    if (hasComponents) {
      if (w.blend_components.length > 1 || w.is_blend) {
        blends++;
      } else {
        singles++;
      }
    } else if (w.varietal) {
      // Legacy string — treat as single unless explicitly marked
      if (w.is_blend) blends++;
      else singles++;
    } else {
      unspecified++;
    }
  }
  return { blends, singles, unspecified };
}

/**
 * Compute avg rating by varietal from a wine collection.
 * @param {object[]} wines
 * @returns {Array<{ varietal: string, avgRating: number, count: number }>}
 */
export function computeAvgRatingByVarietal(wines) {
  if (!Array.isArray(wines)) return [];
  const accumulator = {};
  for (const w of wines) {
    if (!w.rating || w.rating <= 0) continue;
    const varietals = Array.isArray(w.blend_components) && w.blend_components.length > 0
      ? [w.blend_components[0]] // use primary varietal for rating attribution
      : w.varietal
        ? [w.varietal]
        : [];
    for (const v of varietals) {
      if (!v) continue;
      if (!accumulator[v]) accumulator[v] = { sum: 0, count: 0 };
      accumulator[v].sum += w.rating;
      accumulator[v].count++;
    }
  }
  return Object.entries(accumulator)
    .map(([varietal, { sum, count }]) => ({
      varietal,
      avgRating: Math.round((sum / count) * 10) / 10,
      count,
    }))
    .sort((a, b) => b.avgRating - a.avgRating);
}

/**
 * Compute most valuable varietals from a wine collection.
 * Uses the same value priority as wineSelectors.
 * @param {object[]} wines
 * @returns {Array<{ varietal: string, totalValue: number, count: number }>}
 */
export function computeValueByVarietal(wines) {
  if (!Array.isArray(wines)) return [];
  const accumulator = {};

  for (const w of wines) {
    const qty = Math.max(1, Number(w.quantity) || 1);
    let value = 0;
    if (w.manual_valuation_enabled && Number(w.manual_estimated_value) > 0) {
      value = Number(w.manual_estimated_value) * qty;
    } else if (Number(w.estimated_total_value) > 0) {
      value = Number(w.estimated_total_value);
    } else if (Number(w.market_estimated_total_value) > 0) {
      value = Number(w.market_estimated_total_value);
    } else if (Number(w.estimated_unit_value) > 0) {
      value = Number(w.estimated_unit_value) * qty;
    } else if (Number(w.market_estimated_unit_value) > 0) {
      value = Number(w.market_estimated_unit_value) * qty;
    } else if (Number(w.estimated_value) > 0) {
      value = Number(w.estimated_value) * qty;
    }
    if (value <= 0) continue;

    const varietals = Array.isArray(w.blend_components) && w.blend_components.length > 0
      ? [w.blend_components[0]]
      : w.varietal
        ? [w.varietal]
        : [];
    for (const v of varietals) {
      if (!v) continue;
      if (!accumulator[v]) accumulator[v] = { totalValue: 0, count: 0 };
      accumulator[v].totalValue += value;
      accumulator[v].count++;
    }
  }

  return Object.entries(accumulator)
    .map(([varietal, { totalValue, count }]) => ({ varietal, totalValue, count }))
    .sort((a, b) => b.totalValue - a.totalValue);
}
