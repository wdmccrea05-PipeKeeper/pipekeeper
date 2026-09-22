/* eslint-disable */
/**
 * SAFE-AREA REGRESSION TESTS
 *
 * Tests that the iOS safe-area is handled correctly at the shared shell level.
 * Todd reported that the top nav and hamburger were buried under the
 * Wi-Fi/signal/battery indicators on iPhone 15 Pro.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ── Read the actual production files ──────────────────────────────────────

const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
const layoutPath = path.resolve(process.cwd(), 'src/Layout.jsx');

const indexHtml = fs.existsSync(indexHtmlPath) ? fs.readFileSync(indexHtmlPath, 'utf-8') : '';
const layout = fs.existsSync(layoutPath) ? fs.readFileSync(layoutPath, 'utf-8') : '';

describe('Safe-Area Regression Tests', () => {
  // 1. Viewport meta includes viewport-fit=cover (enables env(safe-area-inset-*))
  it('viewport meta includes viewport-fit=cover', () => {
    expect(indexHtml).toContain('viewport-fit=cover');
  });

  // 2. Header uses env(safe-area-inset-top) for top padding
  it('header uses env(safe-area-inset-top)', () => {
    expect(layout).toContain('env(safe-area-inset-top)');
  });

  // 3. Header does NOT use a hard-coded fixed margin (e.g., padding-top: 40px)
  it('header does not use hard-coded iPhone-specific spacing', () => {
    // Should not contain hard-coded pixel padding for safe area
    expect(layout).not.toMatch(/padding-top:\s*40px/);
    expect(layout).not.toMatch(/paddingTop:\s*40/);
    expect(layout).not.toMatch(/if.*iPhone.*15/);
  });

  // 4. Main content includes env(safe-area-inset-bottom) for bottom safe area
  it('main content includes env(safe-area-inset-bottom)', () => {
    expect(layout).toContain('env(safe-area-inset-bottom)');
  });

  // 5. Layout does not double-apply safe area (native wrapper does NOT own the inset)
  it('layout owns the safe-area inset (single owner)', () => {
    // The web app owns the safe-area via CSS env() — no native wrapper padding
    // The viewport-fit=cover tells the browser to extend into safe areas
    // and env() provides the inset values. This is the single owner.
    expect(indexHtml).toContain('viewport-fit=cover');
    expect(layout).toContain('env(safe-area-inset-top)');
  });

  // 6. Touch targets are at least 44x44px
  it('hamburger button has minimum 44px touch target', () => {
    // The hamburger button in Layout.jsx uses width: 48, height: 48
    expect(layout).toContain('width: 48');
    expect(layout).toContain('height: 48');
  });

  // 7. Desktop layout is unchanged (md: breakpoints still present)
  it('desktop layout breakpoints are preserved', () => {
    expect(layout).toContain('md:');
    expect(layout).toContain('md:hidden');
    expect(layout).toContain('md:block');
  });

  // 8. The header is sticky (not fixed) so it scrolls with safe-area offset
  it('header is sticky (not fixed at viewport y=0)', () => {
    expect(layout).toContain('sticky top-0');
  });

  // 9. The premium active indicator uses module-level access (not generic tier)
  it('PremiumActiveIndicator uses module-level access check', () => {
    const indicatorPath = path.resolve(process.cwd(), 'src/components/subscription/PremiumActiveIndicator.jsx');
    const indicator = fs.existsSync(indicatorPath) ? fs.readFileSync(indicatorPath, 'utf-8') : '';
    expect(indicator).toContain('getModulesWithProAccess');
    expect(indicator).not.toContain('hasPaidAccess');
  });

  // 10. normalizeTier no longer always returns "pro"
  it('normalizeTier returns free for non-pro payloads', () => {
    const syncPath = path.resolve(process.cwd(), 'src/components/utils/appleSubscriptionSync.jsx');
    const sync = fs.existsSync(syncPath) ? fs.readFileSync(syncPath, 'utf-8') : '';
    // The function should return "free" as the default, not "pro" (accept single or double quotes)
    expect(sync.match(/return\s+["']free["']/)).toBeTruthy();
  });

  // 11. Foreground refresh listener exists in useCurrentUser
  it('useCurrentUser has foreground refresh for Apple IAP sync', () => {
    const hookPath = path.resolve(process.cwd(), 'src/components/hooks/useCurrentUser.jsx');
    const hook = fs.existsSync(hookPath) ? fs.readFileSync(hookPath, 'utf-8') : '';
    expect(hook).toContain('visibilitychange');
    expect(hook).toContain("visibilityState");
  });

  // 12. hasModuleProAccess uses subscription for module derivation
  it('hasModuleProAccess uses subscription for module derivation', () => {
    const entPath = path.resolve(process.cwd(), 'src/components/utils/moduleEntitlements.jsx');
    const ent = fs.existsSync(entPath) ? fs.readFileSync(entPath, 'utf-8') : '';
    expect(ent).toContain('subscriptionGrantsPaidAccess');
    expect(ent).toContain('SUBSCRIPTION-BACKED');
  });
});