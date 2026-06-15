import { describe, it, expect } from 'vitest';
/* eslint-disable */
import fs from 'node:fs';
import path from 'node:path';

function read(relativePath) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('detail parity regression coverage', () => {
  it('Pipe, Whiskey, Wine, and Cigar detail pages all expose the shared valuation card', () => {
    const pipe = read('src/pages/PipeDetail.jsx');
    const bottle = read('src/pages/BottleDetail.jsx');
    const wine = read('src/pages/WineDetail.jsx');
    const cigar = read('src/pages/CigarDetail.jsx');
    expect(pipe).toContain('<UnifiedValuationCard');
    expect(bottle).toContain('<UnifiedValuationCard');
    expect(wine).toContain('<UnifiedValuationCard');
    expect(cigar).toContain('<UnifiedValuationCard');
  });

  it('Pipe, Whiskey, Wine, and Cigar detail pages all expose share and similar-item flows', () => {
    const pipe = read('src/pages/PipeDetail.jsx');
    const bottle = read('src/pages/BottleDetail.jsx');
    const wine = read('src/pages/WineDetail.jsx');
    const cigar = read('src/pages/CigarDetail.jsx');
    expect(pipe).toContain('ShareRecordModal');
    expect(pipe).toContain('SimilarItemsDrawer');
    expect(bottle).toContain('ShareRecordModal');
    expect(bottle).toContain('SimilarItemsDrawer');
    expect(wine).toContain('ShareRecordModal');
    expect(wine).toContain('SimilarItemsDrawer');
    expect(cigar).toContain('ShareRecordModal');
    expect(cigar).toContain('SimilarItemsDrawer');
  });

  it('Pipe and Whiskey details use the shared image fallback helper', () => {
    const pipe = read('src/pages/PipeDetail.jsx');
    const whiskeyCard = read('src/components/whiskey/BottleCard.jsx');
    const whiskeyList = read('src/components/whiskey/BottleListItem.jsx');
    expect(pipe).toContain('getItemPhoto');
    expect(whiskeyCard).toContain('getItemPhoto');
    expect(whiskeyList).toContain('getItemPhoto');
  });
});