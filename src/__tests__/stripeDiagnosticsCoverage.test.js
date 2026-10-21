import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const diagnostics = readFileSync('base44/functions/stripeDiagnostics/entry.ts', 'utf8');
const health = readFileSync('base44/functions/stripeHealthCheck/entry.ts', 'utf8');
describe('Stripe diagnostics coverage and secret hygiene', () => {
  it('reports every module and bundle billing interval', () => {
    for (const key of ['PIPEKEEPER', 'WHISKEYKEEPER', 'CIGARKEEPER', 'WINEKEEPER', 'FOUNDERS', 'THREE_BUNDLE', 'FOUR_BUNDLE']) {
      for (const term of ['MONTHLY', 'ANNUAL']) {
        expect(diagnostics).toContain(`VITE_STRIPE_${key}_${term}`);
      }
    }
  });
  it('does not expose partial secret keys in responses', () => {
    expect(diagnostics).not.toContain('secretKey.slice(');
    expect(diagnostics).not.toContain('STRIPE_WEBHOOK_SECRET")!.slice(');
    expect(health).not.toContain('key.slice(');
    expect(health).not.toContain('keyLength: key.length');
  });
});
