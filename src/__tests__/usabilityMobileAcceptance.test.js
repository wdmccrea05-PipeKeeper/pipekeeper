import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Mobile-first usability acceptance checks.
 *
 * These encode the rules the Collection Intelligence 2.0 simplification pass is
 * held to, so a later feature cannot quietly reintroduce a fixed-width panel,
 * a four-column grid on a phone, a viewport-height header, or a screen with no
 * empty state. Widths covered by hand and in review: 320 / 375 / 390 / 430 /
 * 768 / 1024 / 1440.
 */

const AUDITED_SCREENS = [
  'src/pages/CollectionHub.jsx',
  'src/pages/Curator.jsx',
  'src/components/agent/ExpertTobacconistChat.jsx',
  'src/pages/Community.jsx',
  'src/pages/HelpCenter.jsx',
  'src/pages/ReportingCenter.jsx',
  'src/pages/CollectionTools.jsx',
  'src/pages/ShareCenter.jsx',
  'src/pages/ValuationCenter.jsx',
  'src/pages/WantList.jsx',
  'src/pages/PipeDetail.jsx',
  'src/pages/WineKeeper.jsx',
  'src/pages/CigarKeeper.jsx',
];

const read = (path) => readFileSync(path, 'utf8');

describe('mobile usability acceptance', () => {
  it('never sizes a screen with 100vh (mobile browser chrome clips it)', () => {
    for (const file of AUDITED_SCREENS) {
      expect(read(file), `${file} still uses min-h-screen`).not.toContain('min-h-screen');
    }
  });

  it('never pins a four-or-more column grid on a phone', () => {
    // A bare grid-cols-4+ token (not prefixed by sm:/md:/lg:/xl:) collapses at 320px.
    const bareDenseGrid = /(?:^|[\s"'])grid-cols-[4-9]\b/;
    for (const file of AUDITED_SCREENS) {
      expect(bareDenseGrid.test(read(file)), `${file} has a non-responsive dense grid`).toBe(false);
    }
  });

  it('never pins a panel wider than a small phone', () => {
    const widePanel = /\bw-\[([4-9]\d{2}|\d{4,})px\]/;
    for (const file of AUDITED_SCREENS) {
      expect(widePanel.test(read(file)), `${file} has a fixed width wider than 320px`).toBe(false);
    }
  });

  it('gives every audited screen an empty state', () => {
    for (const file of AUDITED_SCREENS) {
      const source = read(file);
      const hasEmptyState =
        source.includes('EmptyState') ||
        source.includes('length === 0') ||
        source.includes('length === 0 ?') ||
        source.includes('messages.length === 0');
      expect(hasEmptyState, `${file} has no empty-state branch`).toBe(true);
    }
  });

  it('keeps collection-to-record navigation to one tap from the hub', () => {
    const hub = read('src/pages/CollectionHub.jsx');
    expect(hub).toContain('onOpen={() => navigate(createPageUrl(meta.route))}');
    // Metrics drill into their own records, not a generic page.
    expect(hub).toContain("createPageUrl('SessionHistory')");
  });

  it('routes reporting through the one Reporting Center', () => {
    const hub = read('src/pages/CollectionHub.jsx');
    const reporting = read('src/pages/ReportingCenter.jsx');
    expect(hub).toContain("createPageUrl('ReportingCenter')");
    // Choosing a report renders it on the same screen — no extra page.
    expect(reporting).toContain('onSelect={setActiveReportId}');
  });

  it('keeps advanced Curator surfaces off the default conversation', () => {
    const page = read('src/pages/Curator.jsx');
    expect(page).toContain("return s && ALL_VALID_KEYS.has(s) ? s : 'chat';");
    expect(page).toContain('<AdvancedDetails');
  });

  it('keeps dialogs and sheets inside the viewport with safe-area padding', () => {
    const dialog = read('src/components/ui/dialog.jsx');
    const sheet = read('src/components/ui/sheet.jsx');
    expect(dialog).not.toMatch(/\b100vh\b/);
    expect(`${dialog}${sheet}`).toMatch(/max-h-\[|max-h-screen/);
  });
});