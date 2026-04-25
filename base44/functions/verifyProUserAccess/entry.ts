/**
 * RETIRED: verifyProUserAccess
 *
 * This function verified users against a global "tier=pro" check, which is
 * incompatible with the canonical module-specific entitlement system.
 * Checking tier=pro alone does not confirm which modules are unlocked.
 *
 * For per-module access verification, use the canonical functions in
 * src/components/utils/moduleEntitlements.jsx (hasModuleProAccess,
 * getModulesWithProAccess) or the auditAndRepairModuleEntitlements admin tool.
 */

Deno.serve(async (_req) => {
  return Response.json(
    {
      ok: false,
      error: 'RETIRED',
      message:
        'verifyProUserAccess has been retired. Use auditAndRepairModuleEntitlements to audit module-specific entitlements, or the canonical moduleEntitlements helpers on the frontend.',
      canonical: 'auditAndRepairModuleEntitlements',
    },
    { status: 410 }
  );
});