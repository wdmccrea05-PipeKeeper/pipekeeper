/**
 * cigarValuation.js
 * Simple cigar value estimation — consistent with pipe/tobacco valuation philosophy.
 * Uses purchase price or estimated retail as the base, then adjusts for
 * quantity, brand tier, production status, and aging.
 */

// Known premium brands that command higher market prices
const PREMIUM_BRANDS = [
  'padron', 'fuente', 'arturo fuente', 'davidoff', 'cohiba', 'montecristo',
  'romeo y julieta', 'opus x', 'padrón', 'oliva', 'my father', 'perdomo',
  'drew estate', 'rocky patel', 'macanudo', 'ashton', 'alec bradley',
  'crowned heads', 'liga privada', 'camacho', 'tatuaje',
];

// Vitolas that typically retail at higher price points
const PREMIUM_VITOLAS = ['lancero', 'salomon', 'figurado', 'torpedo premium'];

/**
 * Estimate a base per-stick retail price from cigar attributes.
 * Returns a number in USD.
 */
function estimateBaseRetailPerStick(cigar) {
  const brand = (cigar.brand || '').toLowerCase();
  const vitola = (cigar.vitola || '').toLowerCase();
  const productionStatus = (cigar.production_status || '').toLowerCase();

  let base = 10; // conservative mid-market default

  // Brand tier adjustment
  if (PREMIUM_BRANDS.some((b) => brand.includes(b))) {
    base = 18;
  }

  // Vitola premium
  if (PREMIUM_VITOLAS.some((v) => vitola.includes(v))) {
    base *= 1.15;
  }

  // Rarity / production status
  if (productionStatus === 'limited' || productionStatus === 'limited_edition') {
    base *= 1.25;
  } else if (productionStatus === 'discontinued' || productionStatus === 'seasonal') {
    base *= 1.15;
  }

  return Math.round(base * 100) / 100;
}

/**
 * Calculate cigar collection value.
 *
 * @param {object} cigar — Cigar entity record
 * @returns {{ perStickValue: number, totalValue: number, confidenceScore: string }}
 */
export function calculateCigarValue(cigar) {
  if (!cigar) return { perStickValue: null, totalValue: null, confidenceScore: 'low' };

  const sticks = Number(cigar.singles_equivalent) || Number(cigar.quantity) || 0;
  if (sticks === 0) {
    return { perStickValue: null, totalValue: null, confidenceScore: 'low' };
  }

  // If the user provided estimated_value, use it directly (highest confidence)
  if (cigar.estimated_value && Number(cigar.estimated_value) > 0) {
    const total = Number(cigar.estimated_value);
    return {
      perStickValue: Math.round((total / sticks) * 100) / 100,
      totalValue: total,
      confidenceScore: 'high',
    };
  }

  // If user provided purchase price, use it as base (medium confidence)
  if (cigar.purchase_price && Number(cigar.purchase_price) > 0) {
    const total = Number(cigar.purchase_price);
    return {
      perStickValue: Math.round((total / sticks) * 100) / 100,
      totalValue: total,
      confidenceScore: 'medium',
    };
  }

  // Estimate from attributes (low confidence)
  const perStick = estimateBaseRetailPerStick(cigar);

  // Aging premium (slight boost for cellared cigars)
  let agingMultiplier = 1;
  if (cigar.aging_start_date) {
    const ageMonths = Math.floor(
      (Date.now() - new Date(cigar.aging_start_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    );
    if (ageMonths >= 36) agingMultiplier = 1.1;
    else if (ageMonths >= 12) agingMultiplier = 1.05;
  }

  const adjustedPerStick = Math.round(perStick * agingMultiplier * 100) / 100;
  const totalValue = Math.round(adjustedPerStick * sticks * 100) / 100;

  return {
    perStickValue: adjustedPerStick,
    totalValue,
    confidenceScore: 'low',
  };
}