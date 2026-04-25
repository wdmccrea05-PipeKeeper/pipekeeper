/**
 * RETIRED: subscriptionSync
 *
 * This function wrote generic subscription_status / subscription_tier /
 * subscription_level fields to UserProfile without setting module-specific
 * flags (pipekeeper_paid, whiskeykeeper_paid, etc.).
 *
 * Writing these generic fields alone does not grant module Pro access through
 * the canonical moduleEntitlements resolver.
 *
 * Module flags are now managed exclusively via:
 * - stripeWebhook (on payment events)
 * - reconcileEntitlementsOnLogin (on login)
 * - auditAndRepairModuleEntitlements (admin repair)
 */

Deno.serve(async (_req) => {
  return Response.json(
    {
      ok: false,
      error: 'RETIRED',
      message:
        'subscriptionSync has been retired. It wrote generic subscription fields without module-specific flags. Module entitlements are now managed by stripeWebhook, reconcileEntitlementsOnLogin, and auditAndRepairModuleEntitlements.',
      canonical: 'auditAndRepairModuleEntitlements',
    },
    { status: 410 }
  );
});