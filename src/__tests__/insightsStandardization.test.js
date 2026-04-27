/* eslint-disable */
/**
 * Structural tests verifying all module Insights pages share the same
 * InsightsShell components and expose the required baseline tabs.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function readPage(fileName) {
  return fs.readFileSync(path.resolve(process.cwd(), 'src/pages', fileName), 'utf8');
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

    it('WineKeeper includes Drinking Window tab', () => {
      const src = readPage('WineInsights.jsx');
      expect(src).toContain("key: 'drinkingwindow'");
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
