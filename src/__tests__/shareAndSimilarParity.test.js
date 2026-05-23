import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildPublicPipeShareView,
  buildPublicTobaccoShareView,
  buildPublicWhiskeyShareView,
  buildPublicWineShareView,
  buildPublicCigarShareView,
} from '@/components/share/shareFieldSelectors';
import { buildFindSimilarPrompt } from '@/components/recommendations/FindSimilarEngine';

function read(relativePath) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('share and similar parity', () => {
  it('sanitizes whiskey, wine, and cigar share views', () => {
    const whiskey = buildPublicWhiskeyShareView(
      { id: '1', name: 'Bottle', notes: 'secret', photo: 'a.jpg', collector_value: 123, distillery: 'Maker' },
      { include_photos: false, include_notes: false, include_value: false },
      {}
    );
    expect(whiskey.notes).toBeUndefined();
    expect(whiskey.photo).toBeUndefined();
    expect(whiskey.estimated_value).toBeUndefined();

    const wine = buildPublicWineShareView(
      { id: '2', name: 'Wine', notes: 'x'.repeat(400), photo: 'b.jpg', purchase_price: 55, producer: 'Producer' },
      { include_photos: true, include_notes: true, include_value: true },
      { is_public: true, display_name: 'Collector' }
    );
    expect(wine.photo).toBe('b.jpg');
    expect(wine.notes.length).toBeLessThanOrEqual(300);
    expect(wine.shared_by).toBe('Collector');

    const cigar = buildPublicCigarShareView(
      { id: '3', name: 'Cigar', brand: 'Brand', notes: 'memo', market_estimated_total_value: 42, photos: ['c.jpg'] },
      { include_photos: true, include_notes: true, include_value: true },
      {}
    );
    expect(cigar.photo).toBe('c.jpg');
    expect(cigar.notes).toBe('memo');
    expect(cigar.estimated_value).toBe(42);
  });

  it('preserves existing pipe and tobacco share sanitization', () => {
    const pipe = buildPublicPipeShareView({ id: 'p', name: 'Pipe', photos: ['p.jpg'], notes: 'notes', estimated_value: 9 }, { include_photos: true, include_notes: true, include_value: true }, {});
    const tobacco = buildPublicTobaccoShareView({ id: 't', name: 'Blend', photo: 't.jpg', notes: 'notes', manual_market_value: 10 }, { include_photos: true, include_notes: true, include_value: true }, {});
    expect(pipe.photos).toEqual(['p.jpg']);
    expect(pipe.notes).toBe('notes');
    expect(tobacco.photo).toBe('t.jpg');
    expect(tobacco.estimated_value).toBe(10);
  });

  it('supports wine and cigar find-similar prompts', () => {
    const winePrompt = buildFindSimilarPrompt('wine', { id: 'w1', name: 'Barolo', producer: 'Producer' }, { wines: [] });
    const cigarPrompt = buildFindSimilarPrompt('cigar', { id: 'c1', name: 'Serie D', brand: 'Partagás' }, { cigars: [] });
    expect(winePrompt).toContain('"recordType": "wine"');
    expect(cigarPrompt).toContain('"recordType": "cigar"');
  });

  it('keeps legacy share modal compatibility and public share route support', () => {
    const modalSrc = read('src/components/share/ShareRecordModal.jsx');
    const publicRouteSrc = read('src/pages/PublicSharedRecord.jsx');
    expect(modalSrc).toContain('recordType');
    expect(modalSrc).toContain('onClose');
    expect(modalSrc).toContain("type === 'wine_collection' ? 'wine' : type");
    expect(modalSrc).toContain('CigarShareCard');
    expect(publicRouteSrc).toContain('moduleType === "cigar"');
    expect(publicRouteSrc).toContain('buildPublicCigarShareView');
  });
});
