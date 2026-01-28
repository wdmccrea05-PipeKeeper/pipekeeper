import { buildEntitlements } from './entitlements.ts';

const normEmail = (email) => String(email || "").trim().toLowerCase();

/**
 * Checks if the user has a given entitlement.
 * Throws an error with status 402 if not.
 */
export async function requireEntitlement(base44, user, feature) {
  if (!user?.email) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  const emailLower = normEmail(user.email);

  // Fetch subscription with normalized email
  const subscriptions = await base44.entities.Subscription.filter({ user_email: emailLower });
  const subscription = subscriptions?.[0];

  // Determine if paid and pro
  const isPaidSubscriber = !!(
    subscription?.status === 'active' || subscription?.status === 'trialing' || subscription?.status === 'incomplete'
  );
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