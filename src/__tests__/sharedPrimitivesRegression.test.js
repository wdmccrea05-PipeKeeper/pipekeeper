import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { QUERY_KEYS, STALE_TIME } from '@/lib/queryKeys';
import { getItemPhoto } from '@/lib/images/getItemPhoto';

function read(relativePath) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('shared primitive regression coverage', () => {
  it('exposes canonical query key helpers for all four modules', () => {
    expect(QUERY_KEYS.pipes('a@example.com')).toEqual(['pipes', 'a@example.com']);
    expect(QUERY_KEYS.blends('a@example.com')).toEqual(['blends', 'a@example.com']);
    expect(QUERY_KEYS.bottles('a@example.com')).toEqual(['bottles', 'a@example.com']);
    expect(QUERY_KEYS.wines('a@example.com')).toEqual(['wines', 'a@example.com']);
    expect(QUERY_KEYS.cigars('a@example.com')).toEqual(['cigars', 'a@example.com']);
    expect(QUERY_KEYS.cigarSessionsById('abc', 'a@example.com')).toEqual(['cigar-sessions', 'abc', 'a@example.com']);
    expect(STALE_TIME.COLLECTION).toBe(30_000);
    expect(STALE_TIME.SESSION_HISTORY).toBe(60_000);
  });

  it('uses the shared item photo resolver fallback order', () => {
    expect(getItemPhoto({ photo: 'photo.jpg', image: 'image.jpg' })).toBe('photo.jpg');
    expect(getItemPhoto({ image: 'image.jpg', image_url: 'image-url.jpg' })).toBe('image.jpg');
    expect(getItemPhoto({ image_url: 'image-url.jpg', photo_url: 'photo-url.jpg' })).toBe('image-url.jpg');
    expect(getItemPhoto({ photo_url: 'photo-url.jpg', primary_photo: 'primary.jpg' })).toBe('photo-url.jpg');
    expect(getItemPhoto({ primary_photo: 'primary.jpg', photos: ['gallery.jpg'] })).toBe('primary.jpg');
    expect(getItemPhoto({ photos: ['gallery.jpg'] })).toBe('gallery.jpg');
  });

  it('PipeKeeper and insights pages adopt shared query/stale primitives', () => {
    const moduleSrc = read('src/components/modules/PipeKeeperModule.jsx');
    const insightsSrc = read('src/pages/Insights.jsx');
    expect(moduleSrc).toContain('QUERY_KEYS.pipeSummary');
    expect(moduleSrc).toContain('QUERY_KEYS.blendSummary');
    expect(moduleSrc).toContain('QUERY_KEYS.smokingLogsSummary');
    expect(moduleSrc).toContain('STALE_TIME.HOMEPAGE');
    expect(insightsSrc).toContain('QUERY_KEYS.pipes');
    expect(insightsSrc).toContain('QUERY_KEYS.blends');
    expect(insightsSrc).toContain('QUERY_KEYS.smokingLogs');
    expect(insightsSrc).toContain('activeAccent={MODULE_ACCENTS.pipekeeper}');
  });

  it('module insights pages use shared accent theming', () => {
    const wineInsights = read('src/pages/WineInsights.jsx');
    const whiskeyInsights = read('src/pages/WhiskeyInsights.jsx');
    const cigarInsights = read('src/pages/CigarInsights.jsx');
    expect(wineInsights).toContain('activeAccent={MODULE_ACCENTS.winekeeper}');
    expect(whiskeyInsights).toContain('activeAccent={MODULE_ACCENTS.whiskeykeeper}');
    expect(cigarInsights).toContain('activeAccent={MODULE_ACCENTS.cigarkeeper}');
  });
});
