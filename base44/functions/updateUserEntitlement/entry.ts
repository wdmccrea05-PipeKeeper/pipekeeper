/**
 * RETIRED: updateUserEntitlement
 *
 * This function set a global entitlement_tier / subscription_tier field on the
 * User record. It is incompatible with the module-specific entitlement system,
 * which tracks access via pipekeeper_paid / whiskeykeeper_paid / cigarkeeper_paid
 * / winekeeper_paid / paid_modules_csv flags.
 *
 * Setting a global tier without writing module flags causes the canonical
 * moduleEntitlements resolver (hasModuleProAccess) to treat the user as free.
 *
 * Use auditAndRepairModuleEntitlements to set correct module flags from
 * Subscription / ActiveContract records.
 */

// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== 'function') {
  throw new Error('FATAL: Invalid runtime - Base44 requires Deno.serve');
}

Deno.serve(async (_req) => {
  return Response.json(
    {
      ok: false,
      error: 'RETIRED',
      message:
        'updateUserEntitlement has been retired. It wrote a global tier without module-specific flags. Use auditAndRepairModuleEntitlements to repair pipekeeper_paid / whiskeykeeper_paid / cigarkeeper_paid flags.',
      canonical: 'auditAndRepairModuleEntitlements',
    },
    { status: 410 }
  );
});