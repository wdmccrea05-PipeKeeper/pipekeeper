/**
 * Unit tests for normalizeCigarPayload.js
 */

import { describe, test, expect } from 'vitest';
import { normalizeCigarPayload, deriveSinglesEquivalent } from '../normalizeCigarPayload.js';

// ── deriveSinglesEquivalent ────────────────────────────────────────────────────

describe('deriveSinglesEquivalent', () => {
  test('box: quantity * cigars_per_package', () => {
    expect(deriveSinglesEquivalent({ unit_type: 'box', quantity: 1, cigars_per_package: 20 })).toBe(20);
  });

  test('2 boxes of 10', () => {
    expect(deriveSinglesEquivalent({ unit_type: 'box', quantity: 2, cigars_per_package: 10 })).toBe(20);
  });

  test('5 singles', () => {
    expect(deriveSinglesEquivalent({ unit_type: 'single', quantity: 5, cigars_per_package: 1 })).toBe(5);
  });

  test('5pack', () => {
    expect(deriveSinglesEquivalent({ unit_type: '5pack', quantity: 1, cigars_per_package: 5 })).toBe(5);
  });

  test('partial_box uses singles_equivalent directly', () => {
    expect(deriveSinglesEquivalent({ unit_type: 'partial_box', quantity: 1, cigars_per_package: 20, singles_equivalent: 8 })).toBe(8);
  });

  test('partial_box ignores quantity * cpp, uses singles_equivalent', () => {
    expect(deriveSinglesEquivalent({ unit_type: 'partial_box', quantity: 1, cigars_per_package: 20, singles_equivalent: 12 })).toBe(12);
  });

  test('returns null when insufficient data', () => {
    expect(deriveSinglesEquivalent({ unit_type: 'box' })).toBeNull();
  });

  test('falls back to singles_equivalent when cpp missing', () => {
    expect(deriveSinglesEquivalent({ unit_type: 'box', quantity: 2, singles_equivalent: 40 })).toBe(40);
  });

  test('string numeric inputs are coerced', () => {
    expect(deriveSinglesEquivalent({ unit_type: 'box', quantity: '2', cigars_per_package: '10' })).toBe(20);
  });

  test('empty string inputs treated as missing', () => {
    expect(deriveSinglesEquivalent({ unit_type: 'box', quantity: '', cigars_per_package: '' })).toBeNull();
  });
});

// ── normalizeCigarPayload ──────────────────────────────────────────────────────

describe('normalizeCigarPayload', () => {
  test('removes empty string date fields', () => {
    const form = { name: 'Test', purchase_date: '', aging_start_date: '', ready_to_smoke_date: '' };
    const out = normalizeCigarPayload(form);
    expect(out.purchase_date).toBeUndefined();
    expect(out.aging_start_date).toBeUndefined();
    expect(out.ready_to_smoke_date).toBeUndefined();
  });

  test('preserves valid date strings', () => {
    const form = { name: 'Test', purchase_date: '2024-01-15' };
    const out = normalizeCigarPayload(form);
    expect(out.purchase_date).toBe('2024-01-15');
  });

  test('converts numeric strings to numbers', () => {
    const form = { name: 'Test', quantity: '2', cigars_per_package: '20', purchase_price: '15.50' };
    const out = normalizeCigarPayload(form);
    expect(out.quantity).toBe(2);
    expect(out.cigars_per_package).toBe(20);
    expect(out.purchase_price).toBe(15.5);
  });

  test('converts empty string numerics to undefined', () => {
    const form = { name: 'Test', quantity: '', ring_gauge: '', rating: '' };
    const out = normalizeCigarPayload(form);
    expect(out.quantity).toBeUndefined();
    expect(out.ring_gauge).toBeUndefined();
    expect(out.rating).toBeUndefined();
  });

  test('clears empty enum fields', () => {
    const form = { name: 'Test', body: '', strength: '', unit_type: '', production_status: '' };
    const out = normalizeCigarPayload(form);
    expect(out.body).toBeUndefined();
    expect(out.strength).toBeUndefined();
    expect(out.unit_type).toBeUndefined();
    expect(out.production_status).toBeUndefined();
  });

  test('clears empty optional string fields', () => {
    const form = { name: 'Test', brand: '', barcode: '', upc: '', humidor_id: '' };
    const out = normalizeCigarPayload(form);
    expect(out.brand).toBeUndefined();
    expect(out.barcode).toBeUndefined();
    expect(out.upc).toBeUndefined();
    expect(out.humidor_id).toBeUndefined();
  });

  test('preserves filled optional string fields', () => {
    const form = { name: 'Serie V', brand: 'Oliva', barcode: '123456' };
    const out = normalizeCigarPayload(form);
    expect(out.brand).toBe('Oliva');
    expect(out.barcode).toBe('123456');
  });

  test('derives singles_equivalent for box', () => {
    const form = { name: 'Test', unit_type: 'box', quantity: '1', cigars_per_package: '20' };
    const out = normalizeCigarPayload(form);
    expect(out.singles_equivalent).toBe(20);
  });

  test('sets initial_quantity on create from singles_equivalent', () => {
    const form = { name: 'Test', unit_type: 'box', quantity: '2', cigars_per_package: '10' };
    const out = normalizeCigarPayload(form, { isCreate: true });
    expect(out.singles_equivalent).toBe(20);
    expect(out.initial_quantity).toBe(20);
  });

  test('does not set initial_quantity on update', () => {
    const form = { name: 'Test', unit_type: 'box', quantity: '2', cigars_per_package: '10' };
    const out = normalizeCigarPayload(form, { isCreate: false });
    expect(out.initial_quantity).toBeUndefined();
  });

  test('does not overwrite existing initial_quantity on create', () => {
    const form = { name: 'Test', unit_type: 'box', quantity: '2', cigars_per_package: '10', initial_quantity: '25' };
    const out = normalizeCigarPayload(form, { isCreate: true });
    expect(out.initial_quantity).toBe(25); // preserved from form
  });

  test('partial_box: singles_equivalent from user-entered remaining, not derived', () => {
    const form = { name: 'Test', unit_type: 'partial_box', quantity: '1', cigars_per_package: '20', singles_equivalent: '8' };
    const out = normalizeCigarPayload(form);
    expect(out.singles_equivalent).toBe(8);
  });

  test('rating 0 is treated as undefined', () => {
    const form = { name: 'Test', rating: 0 };
    const out = normalizeCigarPayload(form);
    expect(out.rating).toBeUndefined();
  });

  test('positive rating is preserved', () => {
    const form = { name: 'Test', rating: 4 };
    const out = normalizeCigarPayload(form);
    expect(out.rating).toBe(4);
  });

  test('boolean fields are preserved', () => {
    const form = { name: 'Test', is_favorite: true, wishlist: false, restock_flag: true };
    const out = normalizeCigarPayload(form);
    expect(out.is_favorite).toBe(true);
    expect(out.wishlist).toBe(false);
    expect(out.restock_flag).toBe(true);
  });

  test('array fields are preserved', () => {
    const form = { name: 'Test', flavor_notes: ['cedar', 'leather'], aliases: [], photos: [] };
    const out = normalizeCigarPayload(form);
    expect(out.flavor_notes).toEqual(['cedar', 'leather']);
    expect(out.aliases).toEqual([]);
    expect(out.photos).toEqual([]);
  });
});
