/* eslint-disable */
/**
 * Structural tests verifying all module homepages share the same
 * ModuleHighlightsSection / ModuleStorySection framework.
 *
 * Tests:
 *  1-4.  Each module homepage imports and uses ModuleHighlightsSection
 *  5.    WineKeeper no longer uses InsightsHighlightGrid on the homepage
 *  6.    WineKeeper uses ModuleStorySection
 *  7.    WineKeeper story has image highlight cards (storyHighlights prop) when wines exist
 *  8.    All module highlight grids use the same CSS grid classes (via shared component)
 *  9.    All module homepage highlight cards use InsightHighlightCard (via shared component)
 * 10.    WineKeeper curator action still routes to /Curator
 * 11.    ModuleHighlightsSection uses InsightHighlightCard (shared card component)
 * 12.    ModuleHighlightsSection uses canonical grid classes
 * 13.    ModuleStorySection uses InsightHighlightCard for story image cards
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function readPage(fileName) {
  return fs.readFileSync(path.resolve(process.cwd(), 'src/pages', fileName), 'utf8');
}

function readModule(fileName) {
  return fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/modules', fileName),
    'utf8'
  );
}

const MODULE_PAGES = [
  { file: 'PipeKeeper', source: 'module', moduleFile: 'PipeKeeperModule.jsx', label: 'PipeKeeper' },
  { file: 'WhiskeyKeeper', source: 'page', pageFile: 'WhiskeyKeeper.jsx', label: 'WhiskeyKeeper' },
  { file: 'CigarKeeper', source: 'page', pageFile: 'CigarKeeper.jsx', label: 'CigarKeeper' },
  { file: 'WineKeeper', source: 'page', pageFile: 'WineKeeper.jsx', label: 'WineKeeper' },
];

function getModuleSource(mod) {
  return mod.source === 'module'
    ? readModule(mod.moduleFile)
    : readPage(mod.pageFile);
}

describe('Module homepage standardization', () => {
  describe('ModuleHighlightsSection usage', () => {
    MODULE_PAGES.forEach((mod) => {
      it(`${mod.label} imports ModuleHighlightsSection`, () => {
        const src = getModuleSource(mod);
        expect(src, `${mod.label} must import ModuleHighlightsSection`).toContain('ModuleHighlightsSection');
      });

      it(`${mod.label} renders <ModuleHighlightsSection`, () => {
        const src = getModuleSource(mod);
        expect(src, `${mod.label} must render <ModuleHighlightsSection`).toContain('<ModuleHighlightsSection');
      });
    });
  });

  describe('WineKeeper no longer uses InsightsHighlightGrid', () => {
    it('WineKeeper homepage does not render InsightsHighlightGrid', () => {
      const src = readPage('WineKeeper.jsx');
      expect(src, 'WineKeeper must not render <InsightsHighlightGrid on homepage').not.toContain('<InsightsHighlightGrid');
    });
  });

  describe('WineKeeper uses ModuleStorySection', () => {
    it('WineKeeper imports ModuleStorySection', () => {
      const src = readPage('WineKeeper.jsx');
      expect(src, 'WineKeeper must import ModuleStorySection').toContain('ModuleStorySection');
    });

    it('WineKeeper renders <ModuleStorySection', () => {
      const src = readPage('WineKeeper.jsx');
      expect(src, 'WineKeeper must render <ModuleStorySection').toContain('<ModuleStorySection');
    });
  });

  describe('WineKeeper story has image highlight cards', () => {
    it('WineKeeper passes storyHighlights to ModuleStorySection', () => {
      const src = readPage('WineKeeper.jsx');
      expect(
        src,
        'WineKeeper ModuleStorySection must receive storyHighlights prop'
      ).toContain('storyHighlights=');
    });

    it('WineKeeper does not have a text-only story block (no custom inline story div)', () => {
      const src = readPage('WineKeeper.jsx');
      // The old pattern: a standalone <div> containing myWineStory heading + prose — must be gone
      expect(src, 'WineKeeper must not have the old text-only story heading key').not.toContain("wine.myWineStory");
    });
  });

  describe('Shared highlight grid CSS classes in ModuleHighlightsSection', () => {
    it('ModuleHighlightsSection uses grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', () => {
      const src = readModule('ModuleHighlightsSection.jsx');
      expect(src, 'ModuleHighlightsSection must use canonical grid classes').toContain(
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      );
    });
  });

  describe('Shared card component', () => {
    it('ModuleHighlightsSection uses InsightHighlightCard', () => {
      const src = readModule('ModuleHighlightsSection.jsx');
      expect(src, 'ModuleHighlightsSection must use InsightHighlightCard').toContain('InsightHighlightCard');
    });

    it('ModuleStorySection uses InsightHighlightCard for story image cards', () => {
      const src = readModule('ModuleStorySection.jsx');
      expect(src, 'ModuleStorySection must use InsightHighlightCard').toContain('InsightHighlightCard');
    });
  });

  describe('WineKeeper uses shared wine selectors', () => {
    it('WineKeeper uses getWineDisplayName selector', () => {
      const src = readPage('WineKeeper.jsx');
      expect(src, 'WineKeeper must use getWineDisplayName').toContain('getWineDisplayName');
    });

    it('WineKeeper uses getWineProducer selector', () => {
      const src = readPage('WineKeeper.jsx');
      expect(src, 'WineKeeper must use getWineProducer').toContain('getWineProducer');
    });

    it('WineKeeper uses getWinePrimaryImage selector', () => {
      const src = readPage('WineKeeper.jsx');
      expect(src, 'WineKeeper must use getWinePrimaryImage').toContain('getWinePrimaryImage');
    });
  });

  describe('WineKeeper curator action routes to /Curator', () => {
    it('WineKeeper quick actions include navigate to /Curator', () => {
      const src = readPage('WineKeeper.jsx');
      expect(src, "WineKeeper curator action must navigate to '/Curator'").toContain("'/Curator'");
    });
  });

  describe('Module homepages do not use deprecated highlight patterns directly', () => {
    it('PipeKeeperModule does not render CatalogPlate in highlights section', () => {
      const src = readModule('PipeKeeperModule.jsx');
      // CatalogPlate may still be imported elsewhere but should not be used for highlights
      const catalogPlateCount = (src.match(/<CatalogPlate/g) || []).length;
      expect(
        catalogPlateCount,
        'PipeKeeperModule must not render any <CatalogPlate components directly'
      ).toBe(0);
    });

    it('WhiskeyKeeper homepage does not render WhiskeyHighlightCard directly', () => {
      const src = readPage('WhiskeyKeeper.jsx');
      expect(src, 'WhiskeyKeeper must not render <WhiskeyHighlightCard directly').not.toContain('<WhiskeyHighlightCard');
    });

    it('CigarKeeper homepage does not render WhiskeyHighlightCard directly for highlights', () => {
      const src = readPage('CigarKeeper.jsx');
      expect(src, 'CigarKeeper must not render <WhiskeyHighlightCard directly').not.toContain('<WhiskeyHighlightCard');
    });
  });
});
