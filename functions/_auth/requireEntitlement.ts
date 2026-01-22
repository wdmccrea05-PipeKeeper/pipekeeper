import { buildEntitlements } from '../../components/utils/entitlements.js';

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

  // Fetch subscription
  const subscriptions = await base44.entities.Subscription.filter({ user_email: user.email });
  const subscription = subscriptions?.[0];

  // Determine if paid and pro
  const isPaidSubscriber = !!(
    subscription?.status === 'active' || subscription?.status === 'trialing'
  );
  const isProSubscriber = false; // TODO: Add Pro tier detection when implemented

  // Build entitlements
  const entitlements = buildEntitlements({
    isPaidSubscriber,
    isProSubscriber,
    subscriptionStartedAt: subscription?.current_period_start || user?.created_date || null,
  });

  // Check the feature
  if (!entitlements.canUse(feature)) {
    const err = new Error(`Upgrade required to use this feature: ${feature}`);
    err.status = 402;
    throw err;
  }

  return entitlements;
}