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

    // FOUNDERS_CUTOFF_DATE is set at the moment WhiskeyKeeper officially launches.
    // Any account created before that date qualifies for founders pricing.
    // If the env var is not set, the offer is not yet available.
    const cutoffStr = Deno.env.get('FOUNDERS_CUTOFF_DATE');
    if (!cutoffStr) {
      return Response.json({ isEligible: false, reason: 'offer_not_yet_active' });
    }

    const FOUNDERS_CUTOFF = new Date(cutoffStr);
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