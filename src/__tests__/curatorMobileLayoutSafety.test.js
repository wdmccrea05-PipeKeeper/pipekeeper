import { describe, it, expect } from 'vitest';

describe('curator mobile layout safety contracts', () => {
  it('Layout applies dynamic viewport height, safe-area top padding, and independent main scroll', async () => {
    const src = await import('../Layout.jsx?raw').catch(() => null);
    expect(src).toBeTruthy();

    expect(src.default).toContain('min-h-[100dvh]');
    expect(src.default).toContain('max-h-[100dvh]');
    expect(src.default).toContain('pt-[env(safe-area-inset-top)]');
    expect(src.default).toContain('flex-1 overflow-y-auto');
  });

  it('Curator page uses dynamic viewport height instead of min-h-screen', async () => {
    const src = await import('../pages/Curator.jsx?raw').catch(() => null);
    expect(src).toBeTruthy();

    expect(src.default).toContain('min-h-[100dvh]');
    expect(src.default).toContain('pt-[env(safe-area-inset-top)]');
    expect(src.default).not.toContain('min-h-screen');
  });

  it('ExpertTobacconistChat keeps the thread dvh-capped and the input clear of the keyboard', async () => {
    const src = await import('../components/agent/ExpertTobacconistChat.jsx?raw').catch(() => null);
    expect(src).toBeTruthy();

    expect(src.default).toContain("height: 'min(58dvh, 560px)'");
    expect(src.default).toContain('env(safe-area-inset-bottom)');
    expect(src.default).toContain('overscrollBehavior');
    expect(src.default).toContain('overflow-x-hidden');
  });
});