/* eslint-disable */
/**
 * Structural tests verifying all module Insights pages share the same
 * InsightsShell components and expose the required baseline tabs.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { translate } from '@/components/i18n/index.jsx';

function readPage(fileName) {
  return fs.readFileSync(path.resolve(process.cwd(), 'src/pages', fileName), 'utf8');
}

// Resolve the user-facing InsightsHeader title regardless of whether the page
// renders it from a literal or a t('key') call. This keeps the title tests
// i18n-aware now that hardcoded English fallbacks have been removed.
function resolveInsightsTitle(src) {
  const headerIdx = src.indexOf('<InsightsHeader');
  const scope = headerIdx >= 0 ? src.slice(headerIdx, headerIdx + 400) : src;
  const tCall = scope.match(/title=\{\s*t\(\s*['"]([^'"]+)['"]/);
  if (tCall) return translate(tCall[1], {}, 'en');
  const literal = scope.match(/title=["']([^"']+)["']/);
  if (literal) return literal[1];
  return '';
}

const INSIGHTS_PAGES = [
  { file: 'Insights.jsx', module: 'PipeKeeper' },
  { file: 'WhiskeyInsights.jsx', module: 'WhiskeyKeeper' },
  { file: 'CigarInsights.jsx', module: 'CigarKeeper' },
  { file: 'WineInsights.jsx', module: 'WineKeeper' },
];

const BASELINE_TABS = ['summary', 'value', 'usage', 'statistics', 'trends', 'reports', 'sessions'];

describe('Insights standardization', () => {
  describe('InsightsPageShell usage', () => {
    INSIGHTS_PAGES.forEach(({ file, module }) => {
      it(`${module} uses InsightsPageShell`, () => {
        const src = readPage(file);
        expect(src, `${module} must import InsightsPageShell`).toContain('InsightsPageShell');
        expect(src, `${module} must render <InsightsPageShell>`).toContain('<InsightsPageShell');
      });
    });
  });

  describe('InsightsHeader usage', () => {
    INSIGHTS_PAGES.forEach(({ file, module }) => {
      it(`${module} uses InsightsHeader`, () => {
        const src = readPage(file);
        expect(src, `${module} must use InsightsHeader`).toContain('InsightsHeader');
      });
    });
  });

  describe('InsightsTabBar usage', () => {
    INSIGHTS_PAGES.forEach(({ file, module }) => {
      it(`${module} uses InsightsTabBar`, () => {
        const src = readPage(file);
        expect(src, `${module} must use InsightsTabBar`).toContain('InsightsTabBar');
      });
    });
  });

  describe('baseline tab keys', () => {
    INSIGHTS_PAGES.forEach(({ file, module }) => {
      BASELINE_TABS.forEach(tabKey => {
        it(`${module} exposes baseline tab: ${tabKey}`, () => {
          const src = readPage(file);
          expect(src, `${module} must include tab key '${tabKey}'`).toContain(`key: '${tabKey}'`);
        });
      });
    });
  });

  describe('KPI grid consistency', () => {
    INSIGHTS_PAGES.forEach(({ file, module }) => {
      it(`${module} uses InsightsKpiGrid`, () => {
        const src = readPage(file);
        expect(src, `${module} must use InsightsKpiGrid`).toContain('InsightsKpiGrid');
      });

      it(`${module} uses InsightStatCard`, () => {
        const src = readPage(file);
        expect(src, `${module} must use InsightStatCard`).toContain('InsightStatCard');
      });
    });
  });

  describe('Reports tab', () => {
    INSIGHTS_PAGES.forEach(({ file, module }) => {
      it(`${module} has a Reports tab panel`, () => {
        const src = readPage(file);
        const hasReports = src.includes("activeTab === 'reports'") || src.includes("activeInsightsTab === 'reports'");
        expect(hasReports, `${module} must render reports tab content`).toBe(true);
      });
    });
  });

  describe('Trends tab', () => {
    INSIGHTS_PAGES.forEach(({ file, module }) => {
      it(`${module} has a Trends tab panel`, () => {
        const src = readPage(file);
        const hasTrends = src.includes("activeTab === 'trends'") || src.includes("activeInsightsTab === 'trends'");
        expect(hasTrends, `${module} must render trends tab content`).toBe(true);
      });
    });
  });

  describe('module-specific tab names', () => {
    it('PipeKeeper includes Rotation tab', () => {
      const src = readPage('Insights.jsx');
      expect(src).toContain("key: 'rotation'");
      const hasRotationPanel = src.includes("activeTab === 'rotation'") || src.includes("activeInsightsTab === 'rotation'");
      expect(hasRotationPanel).toBe(true);
    });

    it('PipeKeeper includes Pairings tab', () => {
      const src = readPage('Insights.jsx');
      expect(src).toContain("key: 'pairings'");
      const hasPairingsPanel = src.includes("activeTab === 'pairings'") || src.includes("activeInsightsTab === 'pairings'");
      expect(hasPairingsPanel).toBe(true);
    });

    it('PipeKeeper includes Aging tab', () => {
      const src = readPage('Insights.jsx');
      expect(src).toContain("key: 'aging'");
      const hasAgingPanel = src.includes("activeTab === 'aging'") || src.includes("activeInsightsTab === 'aging'");
      expect(hasAgingPanel).toBe(true);
    });

    it('WineKeeper includes Drinking Window tab', () => {
      const src = readPage('WineInsights.jsx');
      expect(src).toContain("key: 'drinkingwindow'");
    });
  });

  describe('Pairings tab content', () => {
    it('PipeKeeper Pairings tab has pairing analytics or empty state', () => {
      const src = readPage('Insights.jsx');
      const hasPairings = src.includes('PairingGrid') || src.includes('PairingMatrix') || src.includes('InsightsEmptyState');
      expect(hasPairings, 'PipeKeeper must render pairing analytics or an empty state in the Pairings tab').toBe(true);
    });
  });

  describe('Aging tab content', () => {
    it('PipeKeeper Aging tab has cellar aging analytics or empty state', () => {
      const src = readPage('Insights.jsx');
      const hasAging = src.includes('CellarAgingDashboard') || src.includes('AgingReportExporter') || src.includes('InsightsEmptyState');
      expect(hasAging, 'PipeKeeper must render cellar aging analytics or an empty state in the Aging tab').toBe(true);
    });
  });

  describe('Rotation tab content', () => {
    it('PipeKeeper Rotation tab has rotation analytics or empty state', () => {
      const src = readPage('Insights.jsx');
      const hasRotation = src.includes('RotationPlanner') || src.includes('InsightsEmptyState');
      expect(hasRotation, 'PipeKeeper must render rotation analytics or an empty state in the Rotation tab').toBe(true);
    });
  });

  describe('module-specific page titles', () => {
    it('PipeKeeper Insights title uses "PipeKeeper Insights"', () => {
      expect(resolveInsightsTitle(readPage('Insights.jsx'))).toBe('PipeKeeper Insights');
    });

    it('WhiskeyKeeper Insights title uses "WhiskeyKeeper Insights"', () => {
      expect(resolveInsightsTitle(readPage('WhiskeyInsights.jsx'))).toBe('WhiskeyKeeper Insights');
    });

    it('CigarKeeper Insights title uses "CigarKeeper Insights"', () => {
      expect(resolveInsightsTitle(readPage('CigarInsights.jsx'))).toBe('CigarKeeper Insights');
    });

    it('WineKeeper Insights title uses "WineKeeper Insights"', () => {
      const src = readPage('WineInsights.jsx');
      expect(src).toContain('WineKeeper Insights');
    });

    it('PipeKeeper Insights title does not use generic "Collection Insights"', () => {
      const src = readPage('Insights.jsx');
      // The InsightsHeader must not fall back to "Collection Insights"
      expect(src).not.toContain("'Collection Insights'");
      expect(src).not.toContain('"Collection Insights"');
    });

    it('WhiskeyKeeper Insights title does not use generic "Collection Insights" as fallback', () => {
      const src = readPage('WhiskeyInsights.jsx');
      expect(src).not.toContain("'Collection Insights'");
      expect(src).not.toContain('"Collection Insights"');
    });
  });

  describe('mobile tab bar handles extra PipeKeeper tabs', () => {
    it('PipeKeeper InsightsTabBar has flex-wrap to handle extra tabs', () => {
      const shellSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/insights/InsightsShell.jsx'),
        'utf8'
      );
      // InsightsTabBar uses flex-wrap so tabs wrap on mobile instead of overflowing
      expect(shellSrc).toContain('flex-wrap');
    });
  });

  describe('empty state consistency', () => {
    INSIGHTS_PAGES.forEach(({ file, module }) => {
      it(`${module} uses InsightsEmptyState`, () => {
        const src = readPage(file);
        expect(src, `${module} must use InsightsEmptyState`).toContain('InsightsEmptyState');
      });
    });
  });

  describe('shared InsightsShell import', () => {
    INSIGHTS_PAGES.forEach(({ file, module }) => {
      it(`${module} imports from InsightsShell`, () => {
        const src = readPage(file);
        expect(src, `${module} must import from @/components/insights/InsightsShell`).toContain('@/components/insights/InsightsShell');
      });
    });
  });

  describe('CigarKeeper no longer one long page', () => {
    it('CigarInsights uses tab switching, not a single scrolling page', () => {
      const src = readPage('CigarInsights.jsx');
      // Must have multiple tab condition branches
      const tabBranches = (src.match(/activeTab ===/g) || []).length;
      expect(tabBranches, 'CigarInsights must have multiple tab-gated panels').toBeGreaterThanOrEqual(6);
    });
  });

  describe('WineKeeper sections are not empty placeholders', () => {
    it('WineInsights has non-trivial content in usage and statistics tabs', () => {
      const src = readPage('WineInsights.jsx');
      expect(src).toContain("activeTab === 'usage'");
      expect(src).toContain("activeTab === 'statistics'");
      expect(src).toContain("activeTab === 'value'");
      // Must contain actual content, not just empty states
      expect(src).toContain('InsightStatCard');
      expect(src).toContain('InsightPanel');
    });
  });
});
