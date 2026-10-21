import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const src = readFileSync('base44/functions/createModuleCheckoutSession/entry.ts', 'utf8');
describe('module checkout fixed bundle scopes', () => {
  it('maps founders bundle to both Stripe billing periods', () => {
    expect(src).toMatch(/bundle_2:\s*\{\s*monthly: Deno\.env\.get\('VITE_STRIPE_FOUNDERS_MONTHLY'\),\s*annual: Deno\.env\.get\('VITE_STRIPE_FOUNDERS_ANNUAL'\)/);
  });
  it('restricts every bundle to its exact paid module set', () => {
    expect(src).toContain("bundle_2: ['pipekeeper', 'whiskeykeeper']");
    expect(src).toContain("bundle_3: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper']");
    expect(src).toContain("bundle_4: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']");
    expect(src).toContain("code: 'INVALID_BUNDLE_SCOPE'");
    expect(src.indexOf('if (!isValidBundleScope(type, modules))')).toBeLessThan(src.indexOf('const priceId = resolvePriceId'));
  });
});
