/* eslint-disable */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mock setup ─────────────────────────────────────────────────────────────
// Mock window/navigator before importing modules

const mockWindow = (overrides = {}) => {
  // Set properties on the existing jsdom window rather than replacing it
  if (overrides.webkit !== undefined) {
    window.webkit = overrides.webkit;
  } else {
    delete window.webkit;
  }
  if (overrides.BarcodeDetector !== undefined) {
    window.BarcodeDetector = overrides.BarcodeDetector;
  } else {
    delete window.BarcodeDetector;
  }
  if (overrides.navigator) {
    Object.assign(navigator, overrides.navigator);
  }
};

// ─── Issue 2: Native iOS environment detection & scanner availability ───────

describe('[Issue 2] Native iOS barcode scanner detection', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('detects iOS WebView via webkit.messageHandlers', async () => {
    mockWindow({
      webkit: {
        messageHandlers: {
          pipekeeper: { postMessage: vi.fn() },
        },
      },
    });
    const { isIOSWebView } = await import('@/components/utils/nativeIAPBridge');
    expect(isIOSWebView()).toBe(true);
  });

  it('returns false when not in a WebView', async () => {
    mockWindow({ webkit: undefined });
    const { isIOSWebView } = await import('@/components/utils/nativeIAPBridge');
    expect(isIOSWebView()).toBe(false);
  });

  it('detects native barcode scanner handler', async () => {
    mockWindow({
      webkit: {
        messageHandlers: {
          scanBarcode: { postMessage: vi.fn() },
        },
      },
    });
    const { hasNativeBarcodeScanner } = await import('@/components/utils/nativeIAPBridge');
    expect(hasNativeBarcodeScanner()).toBe(true);
  });

  it('returns false for native barcode scanner when no handler', async () => {
    mockWindow({
      webkit: {
        messageHandlers: {
          pipekeeper: { postMessage: vi.fn() },
        },
      },
    });
    const { hasNativeBarcodeScanner } = await import('@/components/utils/nativeIAPBridge');
    expect(hasNativeBarcodeScanner()).toBe(false);
  });

  it('canAttemptLiveBarcodeScan returns true when native barcode scanner is available (even without BarcodeDetector)', async () => {
    mockWindow({
      webkit: {
        messageHandlers: {
          scanBarcode: { postMessage: vi.fn() },
        },
      },
    });
    // No BarcodeDetector in window
    const mod = await import('@/components/identify/BarcodeScannerModal');
    expect(mod.canAttemptLiveBarcodeScan()).toBe(true);
  });

  it('canAttemptLiveBarcodeScan returns false when neither web nor native scanner available', async () => {
    delete window.webkit;
    delete window.BarcodeDetector;
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    const mod = await import('@/components/identify/BarcodeScannerModal');
    expect(mod.canAttemptLiveBarcodeScan()).toBe(false);
  });

  it('requestNativeBarcodeScan rejects when no native handler', async () => {
    mockWindow({ webkit: undefined });
    const { requestNativeBarcodeScan } = await import('@/components/utils/nativeIAPBridge');
    await expect(requestNativeBarcodeScan()).rejects.toThrow();
  });

  it('requestNativeBarcodeScan resolves with code when native handler dispatches result event', async () => {
    const postMessage = vi.fn();
    mockWindow({
      webkit: {
        messageHandlers: {
          scanBarcode: { postMessage },
        },
      },
    });
    const { requestNativeBarcodeScan } = await import('@/components/utils/nativeIAPBridge');

    const promise = requestNativeBarcodeScan();

    // Simulate native app dispatching the result event
    setTimeout(() => {
      const event = new CustomEvent('pipekeeper_barcode_result', {
        detail: { success: true, code: '0123456789012' },
      });
      window.dispatchEvent(event);
    }, 10);

    const code = await promise;
    expect(code).toBe('0123456789012');
    expect(postMessage).toHaveBeenCalledWith({ action: 'scanBarcode' });
  });
});

// ─── Issue 5: Collection-limit behavior ─────────────────────────────────────

describe('[Issue 5] Free tier limit consistency', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('pipe limit is 5 in moduleLimits (canonical source)', async () => {
    const { getModuleLimit } = await import('@/components/utils/moduleLimits');
    expect(getModuleLimit('pipekeeper', 'pipes')).toBe(5);
  });

  it('pipe limit is 5 in limitChecks', async () => {
    const mod = await import('@/components/utils/limitChecks');
    expect(mod.FREE_TIER_LIMITS.PIPES).toBe(5);
  });

  it('hasReachedLimit returns false for pro users', async () => {
    const { hasReachedLimit } = await import('@/components/utils/moduleLimits');
    const proUser = { role: 'admin', subscription_tier: 'pro' };
    // Mock hasModuleProAccess to return true for pro users
    vi.doMock('@/components/utils/moduleEntitlements', () => ({
      hasModuleProAccess: () => true,
    }));
    const { hasReachedLimit: hrl } = await import('@/components/utils/moduleLimits');
    expect(hrl(proUser, null, 'pipekeeper', 'pipes', 100)).toBe(false);
  });

  it('hasReachedLimit returns true when count >= limit for free users', async () => {
    vi.doMock('@/components/utils/moduleEntitlements', () => ({
      hasModuleProAccess: () => false,
    }));
    const { hasReachedLimit } = await import('@/components/utils/moduleLimits');
    expect(hasReachedLimit({}, null, 'pipekeeper', 'pipes', 5)).toBe(true);
    expect(hasReachedLimit({}, null, 'pipekeeper', 'pipes', 4)).toBe(false);
  });

  it('getRemainingBeforeLimit returns correct remaining count', async () => {
    vi.doMock('@/components/utils/moduleEntitlements', () => ({
      hasModuleProAccess: () => false,
    }));
    const { getRemainingBeforeLimit } = await import('@/components/utils/moduleLimits');
    expect(getRemainingBeforeLimit({}, null, 'pipekeeper', 'pipes', 3)).toBe(2);
    expect(getRemainingBeforeLimit({}, null, 'pipekeeper', 'pipes', 5)).toBe(0);
  });
});

// ─── Issue 4: Pipe Club blends serialization ─────────────────────────────────

describe('[Issue 4] Pipe Club blends serialization', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('serializeBlends produces valid JSON array', async () => {
    const { serializeBlends } = await import('@/components/pipeclub/pipeClubPairing');
    const blends = [
      { source: 'collection', blendId: 'abc', name: 'Haunted Bookshop', manufacturer: 'Cornell & Diehl', tempBlend: null },
      { source: 'new', blendId: null, name: 'Autumn Evening', manufacturer: 'Peterson', tempBlend: { name: 'Autumn Evening', manufacturer: 'Peterson' } },
    ];
    const json = serializeBlends(blends);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].blend_name).toBe('Haunted Bookshop');
    expect(parsed[0].manufacturer).toBe('Cornell & Diehl');
    expect(parsed[1].blend_name).toBe('Autumn Evening');
  });

  it('parseBlends returns array from blends JSON', async () => {
    const { parseBlends } = await import('@/components/pipeclub/pipeClubPairing');
    const json = JSON.stringify([
      { index: 0, blend_id: 'abc', blend_name: 'Haunted Bookshop', manufacturer: 'Cornell & Diehl', source: 'collection' },
      { index: 1, blend_id: null, blend_name: 'Autumn Evening', manufacturer: 'Peterson', source: 'new' },
    ]);
    const result = parseBlends(json, null);
    expect(result).toHaveLength(2);
    expect(result[0].blend_name).toBe('Haunted Bookshop');
    expect(result[1].blend_name).toBe('Autumn Evening');
  });

  it('parseBlends falls back to legacy single-blend fields when blends is null', async () => {
    const { parseBlends } = await import('@/components/pipeclub/pipeClubPairing');
    const session = {
      proposed_blend_name: 'Frog Morton',
      proposed_blend_manufacturer: 'McClelland',
      proposed_blend_source: 'collection',
      proposed_blend_id: 'xyz',
      temp_tobacco_snapshot: null,
    };
    const result = parseBlends(null, session);
    expect(result).toHaveLength(1);
    expect(result[0].blend_name).toBe('Frog Morton');
    expect(result[0].manufacturer).toBe('McClelland');
    expect(result[0].source).toBe('collection');
  });

  it('parseBlends returns empty array when no blends and no legacy fields', async () => {
    const { parseBlends } = await import('@/components/pipeclub/pipeClubPairing');
    expect(parseBlends(null, {})).toEqual([]);
    expect(parseBlends(null, null)).toEqual([]);
  });

  it('legacy single-blend records are preserved (backward compatible)', async () => {
    const { serializeBlends, parseBlends } = await import('@/components/pipeclub/pipeClubPairing');
    // A legacy session with only single-blend fields
    const legacySession = {
      proposed_blend_name: 'Frog Morton',
      proposed_blend_manufacturer: 'McClelland',
      proposed_blend_source: 'collection',
      proposed_blend_id: 'xyz',
    };
    const parsed = parseBlends(legacySession.blends, legacySession);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].blend_name).toBe('Frog Morton');
    // The serialized form should be readable back
    const reserialized = serializeBlends(parsed.map(p => ({
      source: p.source,
      blendId: p.blend_id,
      name: p.blend_name,
      manufacturer: p.manufacturer,
      tempBlend: p.temp_snapshot,
    })));
    const reparsed = parseBlends(reserialized, null);
    expect(reparsed).toHaveLength(1);
    expect(reparsed[0].blend_name).toBe('Frog Morton');
  });
});

// ─── Issue 4: Pipe Club recommendation restricted to present pipes ───────────

describe('[Issue 4] Recommendation restricted to present pipes', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rankPresentPipes returns null when no pipes present', async () => {
    const { rankPresentPipes } = await import('@/components/pipeclub/pipeClubPairing');
    const result = rankPresentPipes([], { name: 'Test Blend' }, null);
    expect(result.best).toBeNull();
    expect(result.alternative).toBeNull();
  });

  it('rankPresentPipes only evaluates provided pipes', async () => {
    const { rankPresentPipes } = await import('@/components/pipeclub/pipeClubPairing');
    // Mock the canonical scorer to just return the pipes in order
    vi.doMock('@/components/utils/pairingScoreCanonical', () => ({
      rankPipesForBlend: (pipes) => pipes.map((p, i) => ({
        pipe_id: p.id,
        pipe_name: p.name,
        bowl_variant_id: null,
        bowl_name: null,
        score: 10 - i,
        confidence: 0.8,
        why: 'test',
        normalizedPipe: p,
      })),
    }));
    const { rankPresentPipes: rpp } = await import('@/components/pipeclub/pipeClubPairing');

    const presentPipes = [
      { id: 'pipe1', name: 'Dunhill Group 4' },
      { id: 'pipe2', name: 'Peterson System' },
    ];
    const allCollectionPipes = [
      { id: 'pipe1', name: 'Dunhill Group 4' },
      { id: 'pipe2', name: 'Peterson System' },
      { id: 'pipe3', name: 'Castello Sea Rock' }, // NOT present
    ];

    const result = rpp(presentPipes, { name: 'Test Blend' }, null);
    expect(result.best).not.toBeNull();
    expect(result.best.pipe_id).toBe('pipe1');
    expect(result.alternative).not.toBeNull();
    expect(result.alternative.pipe_id).toBe('pipe2');
    // pipe3 should never appear in results
    expect(result.best.pipe_id).not.toBe('pipe3');
    expect(result.alternative.pipe_id).not.toBe('pipe3');
  });
});

// ─── Issue 3: Stock image display/search labels ──────────────────────────────

describe('[Issue 3] Tobacco logo library blend name support', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getAvailableBrands includes blendName when available', async () => {
    const { getAvailableBrands } = await import('@/components/tobacco/TobaccoLogoLibrary');
    const customLogos = [
      { brand_name: 'Cornell & Diehl', blend_name: 'Haunted Bookshop', logo_url: 'https://example.com/hb.png' },
      { brand_name: 'Cornell & Diehl', blend_name: 'Star of the East', logo_url: 'https://example.com/sote.png' },
      { brand_name: 'Peterson', blend_name: null, logo_url: 'https://example.com/peterson.png' },
    ];
    const result = getAvailableBrands(customLogos);
    // Should have entries with blendName set
    const hauntedBookshop = result.find(r => r.blendName === 'Haunted Bookshop');
    expect(hauntedBookshop).toBeDefined();
    expect(hauntedBookshop.brand).toBe('Cornell & Diehl');

    const starOfEast = result.find(r => r.blendName === 'Star of the East');
    expect(starOfEast).toBeDefined();
    expect(starOfEast.brand).toBe('Cornell & Diehl');

    // Generic Peterson entry should have null blendName
    const peterson = result.find(r => r.brand === 'Peterson' && r.isCustom);
    expect(peterson.blendName).toBeNull();
  });

  it('blend-specific entries are sorted before generic brand entries', async () => {
    const { getAvailableBrands } = await import('@/components/tobacco/TobaccoLogoLibrary');
    const customLogos = [
      { brand_name: 'Cornell & Diehl', blend_name: 'Haunted Bookshop', logo_url: 'url1' },
      { brand_name: 'AAA Generic', blend_name: null, logo_url: 'url2' },
    ];
    const result = getAvailableBrands(customLogos);
    // The blend-specific entry should come first
    const firstCustom = result.find(r => r.isCustom);
    expect(firstCustom.blendName).toBe('Haunted Bookshop');
  });
});

// ─── Issue 1: Touch target sizes ─────────────────────────────────────────────

describe('[Issue 1] Touch target minimum sizes', () => {
  it('BackButton style includes minHeight 44', async () => {
    // Read the file content and verify the style
    // This is a static check since we can't render in this test
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/navigation/BackButton.jsx'),
      'utf-8'
    );
    expect(content).toContain('minHeight: 44');
  });

  it('BarcodeScannerModal close button is 44pt', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/identify/BarcodeScannerModal.jsx'),
      'utf-8'
    );
    expect(content).toContain('minHeight: 44');
    expect(content).toContain('minWidth: 44');
  });
});