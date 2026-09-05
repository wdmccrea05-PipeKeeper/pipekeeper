/* eslint-disable */
import { describe, it, expect } from 'vitest';
import { detectDuplicateConflicts, shouldBlockNewSubscription } from '../../base44/shared/duplicateSubscriptionGuard.ts';

describe('duplicateSubscriptionGuard', () => {
  describe('detectDuplicateConflicts', () => {
    it('returns no conflicts for a single active subscription', () => {
      const subs = [
        { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' }
      ];
      const conflicts = detectDuplicateConflicts(subs);
      expect(conflicts).toHaveLength(0);
    });

    it('returns no conflicts for empty list', () => {
      expect(detectDuplicateConflicts([])).toHaveLength(0);
    });

    it('detects monthly + annual conflict and recommends keeping annual', () => {
      const subs = [
        { id: 'monthly1', provider: 'stripe', status: 'active', billing_interval: 'month', primary_module: 'pipekeeper', created_date: '2026-01-01' },
        { id: 'annual1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_end: '2027-01-01', created_date: '2026-02-01' }
      ];
      const conflicts = detectDuplicateConflicts(subs);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('monthly_plus_annual');
      expect(conflicts[0].keep_subscription_id).toBe('annual1');
      expect(conflicts[0].terminate_subscription_ids).toContain('monthly1');
      expect(conflicts[0].severity).toBe('high');
    });

    it('detects multiple monthly subscriptions for same module', () => {
      const subs = [
        { id: 'm1', provider: 'stripe', status: 'active', billing_interval: 'month', primary_module: 'pipekeeper', created_date: '2026-01-01' },
        { id: 'm2', provider: 'stripe', status: 'active', billing_interval: 'month', primary_module: 'pipekeeper', created_date: '2026-03-01' }
      ];
      const conflicts = detectDuplicateConflicts(subs);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('multiple_active_same_interval');
      expect(conflicts[0].requires_admin_review).toBe(true);
    });

    it('detects multiple annual subscriptions for same module', () => {
      const subs = [
        { id: 'a1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_end: '2027-06-01', created_date: '2026-01-01' },
        { id: 'a2', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_end: '2027-01-01', created_date: '2026-02-01' }
      ];
      const conflicts = detectDuplicateConflicts(subs);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('multiple_active_same_interval');
      // Should keep the one with the longest period end
      expect(conflicts[0].keep_subscription_id).toBe('a1');
    });

    it('does not flag subscriptions for different modules', () => {
      const subs = [
        { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' },
        { id: '2', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'whiskeykeeper' }
      ];
      const conflicts = detectDuplicateConflicts(subs);
      expect(conflicts).toHaveLength(0);
    });

    it('ignores canceled/expired subscriptions', () => {
      const subs = [
        { id: '1', provider: 'stripe', status: 'canceled', billing_interval: 'month', primary_module: 'pipekeeper' },
        { id: '2', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' }
      ];
      const conflicts = detectDuplicateConflicts(subs);
      expect(conflicts).toHaveLength(0);
    });

    it('auto-resolves cross-provider monthly+annual when single annual exists', () => {
      const subs = [
        { id: 'apple_m', provider: 'apple', status: 'active', billing_interval: 'month', primary_module: 'pipekeeper' },
        { id: 'stripe_a', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper', current_period_end: '2027-01-01' }
      ];
      const conflicts = detectDuplicateConflicts(subs);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('monthly_plus_annual');
      expect(conflicts[0].requires_admin_review).toBe(false);
    });
  });

  describe('shouldBlockNewSubscription', () => {
    it('blocks duplicate monthly checkout when monthly already active', () => {
      const existing = [
        { id: '1', provider: 'stripe', status: 'active', billing_interval: 'month', primary_module: 'pipekeeper' }
      ];
      const result = shouldBlockNewSubscription(existing, 'month', 'pipekeeper');
      expect(result.block).toBe(true);
      expect(result.existingSubscriptionId).toBe('1');
    });

    it('blocks duplicate annual checkout when annual already active', () => {
      const existing = [
        { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' }
      ];
      const result = shouldBlockNewSubscription(existing, 'year', 'pipekeeper');
      expect(result.block).toBe(true);
    });

    it('blocks monthly checkout when annual already active (downgrade prevention)', () => {
      const existing = [
        { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'pipekeeper' }
      ];
      const result = shouldBlockNewSubscription(existing, 'month', 'pipekeeper');
      expect(result.block).toBe(true);
      expect(result.reason).toContain('annual');
    });

    it('allows annual checkout when monthly already active (upgrade)', () => {
      const existing = [
        { id: '1', provider: 'stripe', status: 'active', billing_interval: 'month', primary_module: 'pipekeeper' }
      ];
      const result = shouldBlockNewSubscription(existing, 'year', 'pipekeeper');
      expect(result.block).toBe(false);
      expect(result.reason).toContain('Upgrade');
    });

    it('allows checkout when no existing subscription for same module', () => {
      const existing = [
        { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'whiskeykeeper' }
      ];
      const result = shouldBlockNewSubscription(existing, 'year', 'pipekeeper');
      expect(result.block).toBe(false);
    });

    it('allows checkout when existing subscription is for different module', () => {
      const existing = [
        { id: '1', provider: 'stripe', status: 'active', billing_interval: 'year', primary_module: 'whiskeykeeper' }
      ];
      const result = shouldBlockNewSubscription(existing, 'month', 'pipekeeper');
      expect(result.block).toBe(false);
    });

    it('ignores canceled subscriptions when checking for duplicates', () => {
      const existing = [
        { id: '1', provider: 'stripe', status: 'canceled', billing_interval: 'month', primary_module: 'pipekeeper' }
      ];
      const result = shouldBlockNewSubscription(existing, 'month', 'pipekeeper');
      expect(result.block).toBe(false);
    });

    it('allows checkout when no existing subscriptions at all', () => {
      const result = shouldBlockNewSubscription([], 'year', 'pipekeeper');
      expect(result.block).toBe(false);
    });
  });
});