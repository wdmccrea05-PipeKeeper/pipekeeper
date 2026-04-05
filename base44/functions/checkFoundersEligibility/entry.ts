import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Check if user is eligible for Founders Bundle
 * Eligible if: existing PipeKeeper user (paid subscription before cutoff date)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.email.toLowerCase().trim();
    const FOUNDERS_CUTOFF = new Date('2026-02-01T00:00:00.000Z');

    // Any account (free or paid) created before the founders cutoff is eligible
    const accountCreatedDate = new Date(user.created_date);
    const isEligible = accountCreatedDate < FOUNDERS_CUTOFF;

    const subscriptions = await base44.entities.Subscription.filter({ user_email: email });

    return Response.json({
      isEligible,
      eligibleDate: FOUNDERS_CUTOFF.toISOString(),
      subscriptionCount: subscriptions.length,
    });
  } catch (error) {
    console.error('Founders eligibility check error:', error);
    return Response.json(
      { error: error.message || 'Failed to check eligibility' },
      { status: 500 }
    );
  }
});