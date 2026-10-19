/**
 * Legacy bundle migration endpoint — fail closed.
 *
 * Never cancel a paid subscription before the replacement is confirmed.
 * Existing customers must use a verified migration workflow; this endpoint
 * intentionally makes no Stripe mutations and no local entitlement changes.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({
      success: false,
      code: 'SAFE_UPGRADE_REQUIRED',
      error: 'Automatic bundle migrations are not yet supported. Your existing subscription remains active. Contact support for assistance.',
    }, { status: 409 });
  } catch (error) {
    console.error('[handleBundleUpgrade] authentication failure', error);
    return Response.json({ success: false, error: 'Unable to verify account' }, { status: 500 });
  }
});
