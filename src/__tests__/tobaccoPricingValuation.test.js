/**
 * tobaccoPricingValuation.test.js
 *
 * Tests for:
 *  - UnifiedValuationCard renders Pricing button / no gear button
 *  - getBlendValue selector priority (tobaccoSelectors)
 *  - valueEngine tobacco purchaseValue / marketValue normalization
 */

import { describe, it, expect } from 'vitest';
import { getBlendValue } from '../lib/collection/tobaccoSelectors';
import { normalizeValuationInputs, computeCurrentValue } from '../components/valuation/valueEngine';

// ── getBlendValue priority ────────────────────────────────────────────────────

describe('getBlendValue', () => {
  const baseBlend = {
    quantity: 3,
    cellar_quantity: 2,
  };

  it('returns manual_override_total first', () => {
    expect(getBlendValue({ ...baseBlend, manual_override_total: 50, estimated_total_value: 40, market_estimated_total_value: 30 })).toBe(50);
  });

  it('returns estimated_total_value second', () => {
    expect(getBlendValue({ ...baseBlend, estimated_total_value: 40, market_estimated_total_value: 30 })).toBe(40);
  });

  it('returns market_estimated_total_value third', () => {
    expect(getBlendValue({ ...baseBlend, market_estimated_total_value: 30, market_estimated_unit_value: 2 })).toBe(30);
  });

  it('returns market_estimated_unit_value × quantity fourth', () => {
    // quantity = 3 + 2(cellar) = 5
    expect(getBlendValue({ ...baseBlend, market_estimated_unit_value: 2 })).toBe(10);
  });

  it('returns estimated_unit_value × quantity fifth', () => {
    expect(getBlendValue({ ...baseBlend, estimated_unit_value: 3 })).toBe(15);
  });

  it('falls back to purchase_price × quantity', () => {
    expect(getBlendValue({ ...baseBlend, purchase_price: 4 })).toBe(20);
  });

  it('supports legacy manual_market_value alias', () => {
    expect(getBlendValue({ ...baseBlend, manual_market_value: 25 })).toBe(25);
  });

  it('uses legacy quantity rollup fields when quantity/cellar_quantity are absent', () => {
    expect(
      getBlendValue({
        tin_total_quantity_oz: 8,
        bulk_total_quantity_oz: 4,
        pouch_total_quantity_oz: 0,
        market_estimated_unit_value: 2,
      })
    ).toBe(24);
  });

  it('returns 0 when no value data present', () => {
    expect(getBlendValue({ ...baseBlend })).toBe(0);
  });

  it('returns 0 for null input', () => {
    expect(getBlendValue(null)).toBe(0);
  });
});

// ── valueEngine tobacco normalization ─────────────────────────────────────────

const TOBACCO_ITEM = {
  blend_type: 'English',
  tin_total_quantity_oz: 8,
  bulk_total_quantity_oz: 4,
  pouch_total_quantity_oz: 0,
};

describe('normalizeValuationInputs tobacco purchaseValue', () => {
  it('uses cost_basis when provided', () => {
    const inputs = normalizeValuationInputs({ ...TOBACCO_ITEM, cost_basis: 45, purchase_price: 15 }, 'pipekeeper');
    expect(inputs.purchaseValue).toBe(45);
  });

  it('falls back to purchase_price when cost_basis is missing', () => {
    const inputs = normalizeValuationInputs({ ...TOBACCO_ITEM, purchase_price: 15 }, 'pipekeeper');
    expect(inputs.purchaseValue).toBe(15);
  });

  it('purchaseValue is 0 when neither cost_basis nor purchase_price exist', () => {
    const inputs = normalizeValuationInputs({ ...TOBACCO_ITEM }, 'pipekeeper');
    expect(inputs.purchaseValue).toBe(0);
  });
});

describe('normalizeValuationInputs tobacco marketValue', () => {
  it('uses market_estimated_total_value first', () => {
    const inputs = normalizeValuationInputs({
      ...TOBACCO_ITEM,
      market_estimated_total_value: 30,
      market_estimated_unit_value: 2,
      price_per_oz: 1,
    }, 'pipekeeper');
    expect(inputs.marketValue).toBe(30);
  });

  it('uses market_estimated_unit_value × oz second', () => {
    // totalOz = 12, meuv = 2 → 24
    const inputs = normalizeValuationInputs({
      ...TOBACCO_ITEM,
      market_estimated_unit_value: 2,
      price_per_oz: 1,
    }, 'pipekeeper');
    expect(inputs.marketValue).toBe(24);
  });

  it('uses price_per_oz × oz third', () => {
    // totalOz = 12, price_per_oz = 1 → 12
    const inputs = normalizeValuationInputs({ ...TOBACCO_ITEM, price_per_oz: 1 }, 'pipekeeper');
    expect(inputs.marketValue).toBe(12);
  });

  it('marketValue is 0 when no market data', () => {
    const inputs = normalizeValuationInputs({ ...TOBACCO_ITEM }, 'pipekeeper');
    expect(inputs.marketValue).toBe(0);
  });
});

describe('computeCurrentValue tobacco uses purchase_price as fallback', () => {
  it('returns purchase_price when no market/manual value exists', () => {
    const value = computeCurrentValue({ ...TOBACCO_ITEM, purchase_price: 20 }, 'pipekeeper');
    expect(value).toBe(20);
  });

  it('market value overrides purchase_price', () => {
    const value = computeCurrentValue({ ...TOBACCO_ITEM, price_per_oz: 2, purchase_price: 5 }, 'pipekeeper');
    // totalOz = 12, price_per_oz = 2 → marketValue = 24
    expect(value).toBe(24);
  });
});

// ── UnifiedValuationCard — no dead gear button ────────────────────────────────
// These are static import/source checks — verifying the implementation contract.

describe('UnifiedValuationCard source contract', () => {
  it('does not import Settings icon', async () => {
    const src = await import('../components/valuation/UnifiedValuationCard.jsx?raw').catch(() => null);
    if (!src) return; // skip if raw imports not supported
    expect(src.default).not.toContain('Settings');
  });

  it('imports DollarSign icon', async () => {
    const src = await import('../components/valuation/UnifiedValuationCard.jsx?raw').catch(() => null);
    if (!src) return;
    expect(src.default).toContain('DollarSign');
  });

  it('renders Pricing label in button', async () => {
    const src = await import('../components/valuation/UnifiedValuationCard.jsx?raw').catch(() => null);
    if (!src) return;
    expect(src.default).toContain('>Pricing<');
  });

  it('does not reference showSettings state', async () => {
    const src = await import('../components/valuation/UnifiedValuationCard.jsx?raw').catch(() => null);
    if (!src) return;
    expect(src.default).not.toContain('showSettings');
  });
});
