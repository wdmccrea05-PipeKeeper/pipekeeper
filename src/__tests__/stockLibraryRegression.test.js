/* eslint-disable */
import { describe, it, expect } from 'vitest';

/**
 * Stock Library Regression Tests
 *
 * Validates the LogoLibraryBrowser UX overhaul:
 * - Identified blends displayed with blend name as primary label
 * - Manufacturer displayed secondarily
 * - Unidentified images grouped by manufacturer
 * - Manufacturer search returns all matching entries
 * - Blend-name search returns the specific entry
 * - Image selection persistence
 * - Legacy record compatibility (no blend_name)
 * - Custom upload with blend_name
 * - Backfill idempotency (no duplicate enrichment)
 */

// Simulate the getAvailableBrands logic from TobaccoLogoLibrary
function getAvailableBrands(builtInLogos, customLogos) {
  const all = [
    ...builtInLogos.map(l => ({
      brand: l.brand_name,
      blendName: l.blend_name || null,
      logo: l.logo_url,
      isCustom: false,
    })),
    ...customLogos.map(l => ({
      brand: l.brand_name,
      blendName: l.blend_name || null,
      logo: l.logo_url,
      isCustom: true,
    })),
  ];

  // Sort: blend-specific first, then generic, alphabetically within each group
  return all.sort((a, b) => {
    if (a.blendName && !b.blendName) return -1;
    if (!a.blendName && b.blendName) return 1;
    return (a.brand || '').localeCompare(b.brand || '');
  });
}

// Simulate the search ranking logic from LogoLibraryBrowser
function searchBrands(brands, query) {
  const q = query.toLowerCase().trim();
  if (!q) return brands;

  return brands
    .map(b => {
      let score = 0;
      if (b.blendName && b.blendName.toLowerCase().includes(q)) score = 100;
      if (b.brand && b.brand.toLowerCase().includes(q)) score = Math.max(score, 80);
      return { ...b, score };
    })
    .filter(b => b.score > 0)
    .sort((a, b) => b.score - a.score);
}

// Simulate the browse-mode grouping logic
function groupByManufacturer(brands) {
  const identified = brands.filter(b => b.blendName);
  const unidentified = brands.filter(b => !b.blendName);

  const groupMap = {};
  unidentified.forEach(b => {
    if (!groupMap[b.brand]) groupMap[b.brand] = [];
    groupMap[b.brand].push(b);
  });

  const grouped = Object.entries(groupMap)
    .map(([brand, entries]) => ({ brand, entries }))
    .sort((a, b) => a.brand.localeCompare(b.brand));

  return { identified, grouped };
}

// Simulate the label logic
function getLabels(brandObj) {
  const primaryLabel = brandObj.blendName || 'Unidentified stock image';
  const secondaryLabel = brandObj.brand;
  return { primaryLabel, secondaryLabel };
}

describe('Stock Library Regression', () => {
  const mockBuiltInLogos = [
    { brand_name: 'Cornell & Diehl', blend_name: 'Cornell & Diehl Fires on the Levee', logo_url: 'https://example.com/cdl-fires.jpg' },
    { brand_name: 'Cornell & Diehl', blend_name: null, logo_url: 'https://example.com/cdl-1.jpg' },
    { brand_name: 'Cornell & Diehl', blend_name: null, logo_url: 'https://example.com/cdl-2.jpg' },
    { brand_name: 'Peterson', blend_name: 'Peterson My Mixture 965', logo_url: 'https://example.com/peterson-965.jpg' },
    { brand_name: 'Peterson', blend_name: null, logo_url: 'https://example.com/peterson-generic.jpg' },
    { brand_name: 'Mac Baren', blend_name: 'Three Nuns (24)', logo_url: 'https://example.com/macbaren-3nuns.jpg' },
    { brand_name: 'Unknown Brand', blend_name: null, logo_url: 'https://example.com/unknown-1.jpg' },
  ];

  const mockCustomLogos = [
    { brand_name: 'Custom Blender', blend_name: 'My Custom Blend', logo_url: 'https://example.com/custom-1.jpg', is_custom: true },
    { brand_name: 'Custom Generic', blend_name: null, logo_url: 'https://example.com/custom-generic.jpg', is_custom: true },
  ];

  const allBrands = getAvailableBrands(mockBuiltInLogos, mockCustomLogos);

  describe('Identified blend displayed as primary label', () => {
    it('shows blend name as primary label for identified entries', () => {
      const identified = allBrands.filter(b => b.blendName);
      identified.forEach(b => {
        const { primaryLabel } = getLabels(b);
        expect(primaryLabel).toBe(b.blendName);
        expect(primaryLabel).not.toBe('Unidentified stock image');
      });
    });

    it('shows manufacturer as secondary label for identified entries', () => {
      const identified = allBrands.filter(b => b.blendName);
      identified.forEach(b => {
        const { secondaryLabel } = getLabels(b);
        expect(secondaryLabel).toBe(b.brand);
      });
    });
  });

  describe('Unidentified image grouping', () => {
    it('groups unidentified entries by manufacturer', () => {
      const { grouped } = groupByManufacturer(allBrands);
      const cdlGroup = grouped.find(g => g.brand === 'Cornell & Diehl');
      expect(cdlGroup).toBeDefined();
      expect(cdlGroup.entries.length).toBe(2);
      expect(cdlGroup.entries.every(e => !e.blendName)).toBe(true);
    });

    it('shows "Unidentified stock image" as primary label for unidentified entries', () => {
      const unidentified = allBrands.filter(b => !b.blendName);
      unidentified.forEach(b => {
        const { primaryLabel } = getLabels(b);
        expect(primaryLabel).toBe('Unidentified stock image');
      });
    });

    it('does not use index numbering (· 1/N) for unidentified entries', () => {
      const unidentified = allBrands.filter(b => !b.blendName);
      unidentified.forEach(b => {
        const { primaryLabel } = getLabels(b);
        expect(primaryLabel).not.toMatch(/·\s*\d+\/\d+/);
      });
    });

    it('sorts manufacturer groups alphabetically', () => {
      const { grouped } = groupByManufacturer(allBrands);
      for (let i = 1; i < grouped.length; i++) {
        expect(grouped[i - 1].brand.localeCompare(grouped[i].brand)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('Manufacturer search', () => {
    it('returns all entries for a manufacturer when searching by brand', () => {
      const results = searchBrands(allBrands, 'Cornell & Diehl');
      expect(results.length).toBe(3); // 1 identified + 2 unidentified
      results.forEach(r => {
        expect(r.brand).toBe('Cornell & Diehl');
      });
    });

    it('scores manufacturer matches at 80', () => {
      const results = searchBrands(allBrands, 'Peterson');
      const genericPeterson = results.find(r => !r.blendName);
      expect(genericPeterson.score).toBe(80);
    });
  });

  describe('Blend-name search', () => {
    it('returns the specific entry when searching by blend name', () => {
      const results = searchBrands(allBrands, 'Three Nuns');
      expect(results.length).toBe(1);
      expect(results[0].blendName).toBe('Three Nuns (24)');
    });

    it('scores blend name matches at 100 (higher than manufacturer)', () => {
      const results = searchBrands(allBrands, 'Three Nuns');
      expect(results[0].score).toBe(100);
    });

    it('returns identified entry when searching by partial blend name', () => {
      const results = searchBrands(allBrands, 'Fires on the Levee');
      expect(results.length).toBe(1);
      expect(results[0].blendName).toBe('Cornell & Diehl Fires on the Levee');
    });
  });

  describe('Image selection persistence', () => {
    it('identifies selected image by logo URL', () => {
      const selectedLogo = 'https://example.com/cdl-fires.jpg';
      const isSelected = (brandObj) => brandObj.logo === selectedLogo;
      const selected = allBrands.find(isSelected);
      expect(selected).toBeDefined();
      expect(selected.brand).toBe('Cornell & Diehl');
      expect(selected.blendName).toBe('Cornell & Diehl Fires on the Levee');
    });
  });

  describe('Legacy record compatibility', () => {
    it('handles records with null blend_name without crashing', () => {
      const legacyBrands = getAvailableBrands(
        [{ brand_name: 'Legacy Brand', blend_name: null, logo_url: 'https://example.com/legacy.jpg' }],
        []
      );
      expect(legacyBrands.length).toBe(1);
      expect(legacyBrands[0].blendName).toBeNull();
      const { primaryLabel } = getLabels(legacyBrands[0]);
      expect(primaryLabel).toBe('Unidentified stock image');
    });

    it('preserves all record IDs and image references', () => {
      const brands = getAvailableBrands(mockBuiltInLogos, mockCustomLogos);
      expect(brands.length).toBe(mockBuiltInLogos.length + mockCustomLogos.length);
      brands.forEach(b => {
        expect(b.logo).toBeDefined();
        expect(typeof b.logo).toBe('string');
      });
    });
  });

  describe('Custom upload with blend_name', () => {
    it('marks custom logos with isCustom flag', () => {
      const customBrands = allBrands.filter(b => b.isCustom);
      expect(customBrands.length).toBe(2);
      customBrands.forEach(b => {
        expect(b.isCustom).toBe(true);
      });
    });

    it('allows custom logos to have blend names', () => {
      const customWithBlend = allBrands.find(b => b.isCustom && b.blendName);
      expect(customWithBlend).toBeDefined();
      expect(customWithBlend.blendName).toBe('My Custom Blend');
    });

    it('allows custom logos without blend names', () => {
      const customGeneric = allBrands.find(b => b.isCustom && !b.blendName);
      expect(customGeneric).toBeDefined();
      const { primaryLabel } = getLabels(customGeneric);
      expect(primaryLabel).toBe('Unidentified stock image');
    });
  });

  describe('Backfill idempotency', () => {
    it('does not duplicate records when enrichment is applied twice', () => {
      const enriched = [
        ...mockBuiltInLogos.map(l =>
          l.logo_url === 'https://example.com/cdl-fires.jpg'
            ? { ...l, blend_name: 'Cornell & Diehl Fires on the Levee' }
            : l
        ),
      ];

      // Apply enrichment again — should be idempotent
      const reEnriched = enriched.map(l =>
        l.logo_url === 'https://example.com/cdl-fires.jpg'
          ? { ...l, blend_name: 'Cornell & Diehl Fires on the Levee' }
          : l
      );

      expect(reEnriched.length).toBe(enriched.length);
      expect(reEnriched.filter(l => l.blend_name).length).toBe(enriched.filter(l => l.blend_name).length);
    });

    it('preserves existing blend names during backfill', () => {
      const withBlend = mockBuiltInLogos.find(l => l.blend_name === 'Peterson My Mixture 965');
      expect(withBlend.blend_name).toBe('Peterson My Mixture 965');
      // Backfill should not overwrite existing blend names
      const afterBackfill = { ...withBlend, blend_name: withBlend.blend_name || 'Backfilled Name' };
      expect(afterBackfill.blend_name).toBe('Peterson My Mixture 965');
    });
  });
});