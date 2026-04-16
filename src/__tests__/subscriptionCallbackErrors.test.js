import { describe, it, expect } from 'vitest';
import { parseSubscriptionCallbackError } from '@/lib/billing/subscriptionCallbackErrors';

function params(values = {}) {
  return new URLSearchParams(values);
}

describe('parseSubscriptionCallbackError', () => {
  it('returns null when no callback error is present', () => {
    expect(parseSubscriptionCallbackError(params())).toBeNull();
  });

  it('normalizes entitlement/app lookup errors to a friendly message', () => {
    const message = parseSubscriptionCallbackError(
      params({ error: 'Entitlement grant failed: App not found' })
    );
    expect(message).toContain('could not activate your subscription');
  });

  it('normalizes other callback errors to a generic message', () => {
    const message = parseSubscriptionCallbackError(
      params({ error_description: 'unexpected callback failure' })
    );
    expect(message).toContain('could not complete subscription activation');
  });
});
