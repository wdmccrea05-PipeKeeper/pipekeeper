import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { filtersForModuleParam, moduleKeyFromParam } from '@/lib/reports/reportModuleScope.js';
import { resolveSessionModuleFilter } from '@/lib/sessionHistory/moduleFilter.js';
import { DEFAULT_FILTERS } from '@/lib/reports/reportModel.js';
import { DOCUMENTATION_FIELDS, matchesPreset } from '@/lib/cigars/cigarDocumentation.js';
import { AGING_BUCKETS } from '@/lib/cigars/humidorInventory.js';
import { buildDashboardMetrics } from '@/lib/cigars/cigarDashboard.js';

/**
 * Behavioural audit for the simplicity / progressive-disclosure workstreams:
 * it checks what a link or a dashboard actually does, not that a component
 * happens to exist.
 */

const read = (path) => readFileSync(path, 'utf8');

const MODULE_NAVS = {
  pipekeeper: 'src/components/modules/PipeKeeperModuleNav.jsx',
  whiskeykeeper: 'src/components/modules/WhiskeyKeeperModuleNav.jsx',
  cigarkeeper: 'src/components/modules/CigarKeeperModuleNav.jsx',
  winekeeper: 'src/components/modules/WineKeeperModuleNav.jsx',
};

const SUPPORTED_PRESETS = new Set([
  'docs_missing',
  'unassigned',
  'condition_unrecorded',
  'value_missing',
  'rated_none',
  ...AGING_BUCKETS.map((bucket) => bucket.key),
]);

describe('report discovery', () => {
  it('scopes a module report link to that module alone', () => {
    const base = { ...DEFAULT_FILTERS };
    for (const key of Object.keys(MODULE_NAVS)) {
      const scoped = filtersForModuleParam(key, base);
      const switchedOn = Object.entries(scoped.modules)
        .filter(([, on]) => on)
        .map(([module]) => module);
      expect(switchedOn, key).toEqual([moduleKeyFromParam(key)]);
    }
  });

  it('leaves a plain visit reporting across every collection', () => {
    const base = { ...DEFAULT_FILTERS };
    expect(filtersForModuleParam(null, base)).toBe(base);
    expect(filtersForModuleParam('nonsense', base)).toBe(base);
  });

  it('sends every module to the one Reporting Center, not a second reports page', () => {
    for (const [key, path] of Object.entries(MODULE_NAVS)) {
      const source = read(path);
      expect(source, path).toContain(`ReportingCenter?module=${key}`);
      expect(source, path).not.toContain('CollectionReports');
    }
  });
});

describe('drill-down filters', () => {
  it('applies the module carried by a session-history link', () => {
    const available = ['all', 'pipe', 'whiskey', 'cigar', 'wine', 'pipe_club'];
    expect(resolveSessionModuleFilter('wine', available)).toBe('wine');
    expect(resolveSessionModuleFilter('winekeeper', available)).toBe('wine');
    expect(resolveSessionModuleFilter('cigarkeeper', available)).toBe('cigar');
    expect(resolveSessionModuleFilter('whiskey', available)).toBe('whiskey');
    expect(resolveSessionModuleFilter(null, available)).toBe('all');
    // A module the collector cannot open must not leave an empty calendar.
    expect(resolveSessionModuleFilter('wine', ['all', 'pipe'])).toBe('all');
  });

  it('session history reads the module from the link instead of a fixed default', () => {
    const source = read('src/pages/SessionHistory.jsx');
    expect(source).toContain('resolveSessionModuleFilter');
    expect(source).toContain('.get("module")');
  });

  it('emits only cigar drill-down filters the collection page can apply', () => {
    const now = new Date('2026-11-01T00:00:00Z');
    const cigars = [
      {
        id: 'c1',
        name: 'Serie V',
        brand: 'Oliva',
        vitola: 'Toro',
        humidor_id: 'h1',
        quantity: 1,
        cigars_per_package: 1,
        aging_start_date: '2026-09-01',
        purchase_price: 20,
        condition: 'Excellent',
        box_date: '2026-09-01',
        purchase_date: '2026-09-01',
      },
      { id: 'c2', name: '1964', brand: 'Padron', quantity: 1, cigars_per_package: 1, rating: 4, estimated_value: 30 },
    ];
    const metrics = buildDashboardMetrics({
      cigars,
      humidors: [{ id: 'h1', name: 'Cabinet' }],
      readingsByHumidor: {},
      ratings: [],
      now,
    });

    const cigarsPage = read('src/pages/Cigars.jsx');
    const emittedKeys = new Set();
    const emittedPresets = new Set();

    metrics.forEach((metric) => {
      const targets = [metric.params, ...(metric.breakdown || []).map((row) => row.params)];
      targets.forEach((params = {}) => {
        Object.entries(params).forEach(([key, value]) => {
          emittedKeys.add(key);
          if (key === 'preset') emittedPresets.add(value);
        });
      });
    });

    expect(emittedKeys.size).toBeGreaterThan(0);
    for (const key of emittedKeys) {
      expect(cigarsPage, `Cigars ignores ?${key}=`).toContain(`searchParams.get('${key}')`);
    }
    for (const preset of emittedPresets) {
      expect(SUPPORTED_PRESETS.has(preset), `no filter handles preset ${preset}`).toBe(true);
    }
  });

  it('presets actually narrow the record list instead of passing everything through', () => {
    const documented = {
      ...Object.fromEntries(DOCUMENTATION_FIELDS.map((field) => [field.key, 'recorded'])),
      humidor_id: 'h1',
      purchase_price: 25,
    };
    expect(matchesPreset({}, 'docs_missing')).toBe(true);
    expect(matchesPreset(documented, 'docs_missing')).toBe(false);
    expect(matchesPreset({}, 'unassigned')).toBe(true);
    expect(matchesPreset(documented, 'unassigned')).toBe(false);
    expect(matchesPreset({ purchase_price: 25 }, 'value_missing')).toBe(false);
    expect(matchesPreset({}, 'value_missing')).toBe(true);
  });

  it('hub deep links land on screens that read the link', () => {
    expect(read('src/components/modules/PipeKeeperModule.jsx')).toContain("'log-smoke'");
    for (const page of ['Tastings', 'Wines', 'Cigars', 'Tobacco', 'Pipes']) {
      expect(read(`src/pages/${page}.jsx`), page).toMatch(/get\(['"]action['"]\)/);
    }
  });
});

describe('default density', () => {
  it('keeps the hub and CigarKeeper to a few default metrics', () => {
    const hub = read('src/pages/CollectionHub.jsx');
    const stripStart = hub.indexOf('<StatStrip');
    const strip = hub.slice(stripStart, hub.indexOf('/>', stripStart));
    const hubMetrics = (strip.match(/label:/g) || []).length;
    expect(hubMetrics).toBeGreaterThan(0);
    expect(hubMetrics, 'hub shows too many headline metrics').toBeLessThanOrEqual(4);

    const cigar = read('src/pages/CigarKeeper.jsx');
    const stats = cigar.slice(cigar.indexOf('const cigarStats = ['), cigar.indexOf('];', cigar.indexOf('const cigarStats = [')));
    expect((stats.match(/label:/g) || []).length).toBeLessThanOrEqual(4);
  });

  it('keeps essential record fields out of collapsed sections', () => {
    const wine = read('src/components/wine/WineForm.jsx');
    // The name field must render before any collapsible section, so adding a
    // wine never starts with a screen full of closed headers.
    expect(wine.indexOf("t('wine.name'")).toBeGreaterThan(-1);
    expect(wine.indexOf("t('wine.name'")).toBeLessThan(wine.indexOf('<FormSection'));

    for (const path of [
      'src/components/pipes/PipeForm.jsx',
      'src/components/tobacco/TobaccoForm.jsx',
      'src/components/cigars/CigarForm.jsx',
      'src/components/whiskey/BottleForm.jsx',
    ]) {
      const source = read(path);
      expect(source, path).toContain('FormSection');
      // Advanced sections stay closed: at most two open by default.
      const openByDefault = (source.match(/defaultOpen(?!=\{?\s*false)/g) || []).length;
      expect(openByDefault, `${path} opens too many sections at once`).toBeLessThanOrEqual(2);
    }
  });
});