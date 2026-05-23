import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readPage(fileName) {
  return fs.readFileSync(path.resolve(process.cwd(), 'src/pages', fileName), 'utf8');
}

describe('collection page parity regression coverage', () => {
  it('persists view mode for every collection page', () => {
    expect(readPage('Wines.jsx')).toContain('wineViewMode');
    expect(readPage('Whiskey.jsx')).toContain('whiskeyViewMode');
    expect(readPage('Cigars.jsx')).toContain('cigarsViewMode');
    expect(readPage('Pipes.jsx')).toContain('pipesViewMode');
    expect(readPage('Tobacco.jsx')).toContain('tobaccoViewMode');
  });

  it('uses canonical query helpers and stale times on collection pages', () => {
    const wines = readPage('Wines.jsx');
    const whiskey = readPage('Whiskey.jsx');
    const pipes = readPage('Pipes.jsx');
    const tobacco = readPage('Tobacco.jsx');

    expect(wines).toContain('QUERY_KEYS.wines');
    expect(wines).toContain('QUERY_KEYS.wineTastingsSummary');
    expect(wines).toContain('STALE_TIME.COLLECTION');

    expect(whiskey).toContain('QUERY_KEYS.bottles');
    expect(whiskey).toContain('STALE_TIME.COLLECTION');

    expect(pipes).toContain('QUERY_KEYS.pipes');
    expect(pipes).toContain('STALE_TIME.COLLECTION');

    expect(tobacco).toContain('QUERY_KEYS.blends');
    expect(tobacco).toContain('STALE_TIME.COLLECTION');
  });

  it('keeps wine list rendering and collection page grid/list parity hooks in place', () => {
    const wines = readPage('Wines.jsx');

    expect(wines).toContain('WineListItem');
    expect(wines).toContain("viewMode === 'grid'");

    for (const pageName of ['Whiskey.jsx', 'Cigars.jsx', 'Pipes.jsx', 'Tobacco.jsx']) {
      const source = readPage(pageName);
      expect(source).toContain('viewMode');
      expect(source).toMatch(/['"]grid['"]/);
      expect(source).toMatch(/['"]list['"]/);
    }
  });
});
