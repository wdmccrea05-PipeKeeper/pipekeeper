/**
 * RETIRED: createProSubscriptionForUser
 *
 * This function created a generic "Pro" subscription without module-specific
 * entitlement flags. It has been retired because:
 * - It wrote a global tier, not pipekeeper_paid / whiskeykeeper_paid / etc.
 * - It cannot correctly represent multi-module or bundle subscriptions.
 *
 * Use auditAndRepairModuleEntitlements instead, which resolves the correct
 * module flags from Subscription / ActiveContract records.
 */

Deno.serve(async (_req) => {
  return Response.json(
    {
      ok: false,
      error: 'RETIRED',
      message:
        'createProSubscriptionForUser has been retired. Use auditAndRepairModuleEntitlements to repair module-specific entitlements.',
      canonical: 'auditAndRepairModuleEntitlements',
    },
    { status: 410 }
  );
});