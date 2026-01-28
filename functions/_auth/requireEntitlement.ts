import { buildEntitlements } from './entitlements.ts';

const normEmail = (email) => String(email || "").trim().toLowerCase();

/**
 * Checks if the user has a given entitlement.
 * Uses user_id first (account-linked), then email fallback (legacy Stripe).
 * Throws an error with status 402 if not.
 */
export async function requireEntitlement(base44, user, feature) {
  if (!user?.email) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  const userId = user.id;
  const emailLower = normEmail(user.email);

  // PRIORITY 1: Query by user_id (account-linked subscriptions - Apple + modern Stripe)
  let subscription = null;
  
  if (userId) {
    const byUserId = await base44.entities.Subscription.filter({ 
      user_id: userId 
    });
    
    // Find active/trialing subscription
    subscription = byUserId?.find(s => 
      s.status === 'active' || s.status === 'trialing' || s.status === 'incomplete'
    );
    
    if (subscription) {
      console.log(`[requireEntitlement] Found subscription by user_id=${userId}: ${subscription.provider}/${subscription.provider_subscription_id}`);
    }
  }

  // PRIORITY 2: Fallback to email for legacy Stripe subscriptions
  if (!subscription) {
    const byEmail = await base44.entities.Subscription.filter({ 
      user_email: emailLower,
      provider: 'stripe'
    });
    
    subscription = byEmail?.find(s => 
      s.status === 'active' || s.status === 'trialing' || s.status === 'incomplete'
    );
    
    if (subscription) {
      console.log(`[requireEntitlement] Found legacy Stripe subscription by email=${emailLower}`);
    }
  }

  // Determine if paid and pro
  const isPaidSubscriber = !!(subscription);
  const isProSubscriber = !!(isPaidSubscriber && subscription?.tier === 'pro');

  // Build entitlements
  const entitlements = buildEntitlements({
    isPaidSubscriber,
    isProSubscriber,
    subscriptionStartedAt: subscription?.started_at || subscription?.current_period_start || user?.created_date || null,
    isFreeGrandfathered: user?.isFreeGrandfathered || false,
  });

  // Check the feature
  if (!entitlements.canUse(feature)) {
    const err = new Error(`Upgrade required to use this feature: ${feature}`);
    err.status = 402;
    throw err;
  }

  return entitlements;
}