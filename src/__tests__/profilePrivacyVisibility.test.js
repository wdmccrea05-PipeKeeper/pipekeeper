/* eslint-disable */
/**
 * Tests for src/lib/privacy/profileVisibility.js helper functions
 * and renderer privacy flag usage correctness.
 *
 * Tests:
 *  1.  personal_hide_totals=false → shouldHideOwnDashboardTotals returns false (shows totals)
 *  2.  personal_hide_totals=true  → shouldHideOwnDashboardTotals returns true (hides totals)
 *  3.  home_hide_collection_values=false → shouldHideHomeCollectionValues returns false (shows values)
 *  4.  home_hide_collection_values=true  → shouldHideHomeCollectionValues returns true (hides values)
 *  5.  privacy_hide_values does not affect personal dashboard flag
 *  6.  Each helper saves/reads the same boolean field — no cross-field assignment
 *  7.  No renderer uses !home_hide_collection_values or !personal_hide_totals to decide hiding
 *  8.  shouldHidePublicValues reads privacy_hide_values only
 *  9.  shouldHidePublicInventory reads privacy_hide_inventory only
 * 10.  shouldHidePublicCounts reads privacy_hide_collection_counts only
 * 11.  null/undefined profile returns false for all helpers (safe defaults)
 * 12.  Profile.jsx switch checked props use !! coercion (not raw flag, not inverted)
 * 13.  Profile.jsx toggle status text keys exist in en locale
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  shouldHideOwnDashboardTotals,
  shouldHideHomeCollectionValues,
  shouldHidePublicValues,
  shouldHidePublicInventory,
  shouldHidePublicCounts,
} from '@/lib/privacy/profileVisibility';

// ─── Helper unit tests ────────────────────────────────────────────────────────

describe('profileVisibility helpers', () => {
  describe('shouldHideOwnDashboardTotals (personal_hide_totals)', () => {
    it('returns false when personal_hide_totals is false — dashboard totals are shown', () => {
      expect(shouldHideOwnDashboardTotals({ personal_hide_totals: false })).toBe(false);
    });

    it('returns true when personal_hide_totals is true — dashboard totals are hidden', () => {
      expect(shouldHideOwnDashboardTotals({ personal_hide_totals: true })).toBe(true);
    });

    it('returns false for undefined profile', () => {
      expect(shouldHideOwnDashboardTotals(undefined)).toBe(false);
    });

    it('returns false for null profile', () => {
      expect(shouldHideOwnDashboardTotals(null)).toBe(false);
    });
  });

  describe('shouldHideHomeCollectionValues (home_hide_collection_values)', () => {
    it('returns false when home_hide_collection_values is false — Hub values are shown', () => {
      expect(shouldHideHomeCollectionValues({ home_hide_collection_values: false })).toBe(false);
    });

    it('returns true when home_hide_collection_values is true — Hub values are hidden', () => {
      expect(shouldHideHomeCollectionValues({ home_hide_collection_values: true })).toBe(true);
    });

    it('returns false for undefined profile', () => {
      expect(shouldHideHomeCollectionValues(undefined)).toBe(false);
    });
  });

  describe('shouldHidePublicValues (privacy_hide_values)', () => {
    it('returns false when privacy_hide_values is false — public values shown', () => {
      expect(shouldHidePublicValues({ privacy_hide_values: false })).toBe(false);
    });

    it('returns true when privacy_hide_values is true — public values hidden', () => {
      expect(shouldHidePublicValues({ privacy_hide_values: true })).toBe(true);
    });

    it('returns false for undefined profile', () => {
      expect(shouldHidePublicValues(undefined)).toBe(false);
    });
  });

  describe('shouldHidePublicInventory (privacy_hide_inventory)', () => {
    it('returns false when privacy_hide_inventory is false', () => {
      expect(shouldHidePublicInventory({ privacy_hide_inventory: false })).toBe(false);
    });

    it('returns true when privacy_hide_inventory is true', () => {
      expect(shouldHidePublicInventory({ privacy_hide_inventory: true })).toBe(true);
    });
  });

  describe('shouldHidePublicCounts (privacy_hide_collection_counts)', () => {
    it('returns false when privacy_hide_collection_counts is false', () => {
      expect(shouldHidePublicCounts({ privacy_hide_collection_counts: false })).toBe(false);
    });

    it('returns true when privacy_hide_collection_counts is true', () => {
      expect(shouldHidePublicCounts({ privacy_hide_collection_counts: true })).toBe(true);
    });
  });

  describe('privacy_hide_values does not affect personal dashboard flag', () => {
    it('privacy_hide_values=true does not cause shouldHideOwnDashboardTotals to return true', () => {
      const profile = {
        privacy_hide_values: true,
        personal_hide_totals: false,
      };
      expect(shouldHideOwnDashboardTotals(profile)).toBe(false);
    });

    it('personal_hide_totals=true does not cause shouldHidePublicValues to return true', () => {
      const profile = {
        personal_hide_totals: true,
        privacy_hide_values: false,
      };
      expect(shouldHidePublicValues(profile)).toBe(false);
    });
  });

  describe('each helper reads its own field exclusively', () => {
    it('shouldHideOwnDashboardTotals reads personal_hide_totals only', () => {
      // All other flags are true; personal_hide_totals is false → must return false
      const profile = {
        personal_hide_totals: false,
        home_hide_collection_values: true,
        privacy_hide_values: true,
        privacy_hide_inventory: true,
        privacy_hide_collection_counts: true,
      };
      expect(shouldHideOwnDashboardTotals(profile)).toBe(false);
    });

    it('shouldHideHomeCollectionValues reads home_hide_collection_values only', () => {
      const profile = {
        home_hide_collection_values: false,
        personal_hide_totals: true,
        privacy_hide_values: true,
        privacy_hide_inventory: true,
        privacy_hide_collection_counts: true,
      };
      expect(shouldHideHomeCollectionValues(profile)).toBe(false);
    });

    it('shouldHidePublicValues reads privacy_hide_values only', () => {
      const profile = {
        privacy_hide_values: false,
        personal_hide_totals: true,
        home_hide_collection_values: true,
        privacy_hide_inventory: true,
        privacy_hide_collection_counts: true,
      };
      expect(shouldHidePublicValues(profile)).toBe(false);
    });
  });
});

// ─── Static source analysis ───────────────────────────────────────────────────

function readSrc(relPath) {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
}

const RENDERER_FILES = [
  'src/components/modules/PipeKeeperModule.jsx',
  'src/pages/PublicProfile.jsx',
  'src/pages/CollectionHub.jsx',
  'src/components/hooks/useProfilePrivacy.jsx',
];

describe('renderer source analysis', () => {
  it('no renderer uses !home_hide_collection_values to decide hiding', () => {
    for (const file of RENDERER_FILES) {
      const src = readSrc(file);
      expect(
        src,
        `${file} must not use !home_hide_collection_values`
      ).not.toMatch(/!\s*home_hide_collection_values/);
    }
  });

  it('no renderer uses !personal_hide_totals with a conditional that hides values', () => {
    // personalHideTotals ? '—' : value  is CORRECT (hide when true)
    // !personalHideTotals ? '—' : value would be INVERTED — forbid it
    for (const file of RENDERER_FILES) {
      const src = readSrc(file);
      // Detect !personalHideTotals immediately followed by ? which would invert the hide logic
      expect(
        src,
        `${file} must not use !personalHideTotals ? '—'`
      ).not.toMatch(/!\s*personalHideTotals\s*\?/);
    }
  });

  it('PipeKeeperModule gates dashboard stats on personalHideTotals (hide when true)', () => {
    const src = readSrc('src/components/modules/PipeKeeperModule.jsx');
    // Must contain the pattern: personalHideTotals ? '—' (or similar hiding when true)
    expect(src, 'PipeKeeperModule must hide totals when personalHideTotals is true').toMatch(
      /personalHideTotals\s*\?\s*['"]—['"]/
    );
  });
});

describe('Profile.jsx toggle switch correctness', () => {
  it('personal_hide_totals switch uses !! coercion, not raw value', () => {
    const src = readSrc('src/pages/Profile.jsx');
    expect(src, 'personal_hide_totals switch must use !!formData.personal_hide_totals').toMatch(
      /checked=\{!!formData\.personal_hide_totals\}/
    );
  });

  it('home_hide_collection_values switch uses !! coercion, not raw value', () => {
    const src = readSrc('src/pages/Profile.jsx');
    expect(src, 'home_hide_collection_values switch must use !!formData.home_hide_collection_values').toMatch(
      /checked=\{!!formData\.home_hide_collection_values\}/
    );
  });

  it('privacy_hide_values switch uses !! coercion, not raw value', () => {
    const src = readSrc('src/pages/Profile.jsx');
    expect(src, 'privacy_hide_values switch must use !!formData.privacy_hide_values').toMatch(
      /checked=\{!!formData\.privacy_hide_values\}/
    );
  });

  it('Profile.jsx contains toggleStatusHidden i18n key reference', () => {
    const src = readSrc('src/pages/Profile.jsx');
    expect(src, 'Profile.jsx must reference toggleStatusHidden i18n key').toContain('toggleStatusHidden');
  });

  it('Profile.jsx contains toggleStatusVisible i18n key reference', () => {
    const src = readSrc('src/pages/Profile.jsx');
    expect(src, 'Profile.jsx must reference toggleStatusVisible i18n key').toContain('toggleStatusVisible');
  });
});

describe('en locale has required toggle status keys', () => {
  it('profileExtended.toggleStatusVisible exists in en.ui locale', () => {
    const src = readSrc('src/components/i18n/locales/en.ui.jsx');
    expect(src, 'en.ui must contain toggleStatusVisible').toContain('toggleStatusVisible');
  });

  it('profileExtended.toggleStatusHidden exists in en.ui locale', () => {
    const src = readSrc('src/components/i18n/locales/en.ui.jsx');
    expect(src, 'en.ui must contain toggleStatusHidden').toContain('toggleStatusHidden');
  });
});
