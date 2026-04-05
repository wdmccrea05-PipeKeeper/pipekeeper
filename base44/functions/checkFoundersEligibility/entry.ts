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

    // Check for active or past PipeKeeper subscription started before cutoff
    const subscriptions = await base44.entities.Subscription.filter({
      user_email: email,
    });

    let isEligible = false;

    for (const sub of subscriptions) {
      const startDate = new Date(sub.subscriptionStartedAt || sub.started_at || sub.current_period_start);
      
      // Eligible only if subscription is currently active (not canceled) and started before founders cutoff
      if (startDate < FOUNDERS_CUTOFF && 
          (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due')) {
        isEligible = true;
        break;
      }
    }

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