/**
 * expireReferralEarnedAccess
 *
 * Scheduled job — runs daily (or on-demand) to expire ReferralEarnedAccess records
 * whose end_at has passed. For each expired record it:
 *
 *   1. Marks the record status = 'expired'
 *   2. Recomputes ALL module flags for the affected user via syncEntitlements logic:
 *      - Checks if any OTHER active earned-access or paid subscription remains
 *      - If no other active access: clears {module}_paid, has_paid_access,
 *        referral_earned_*, entitlement_tier → 'free', paid_modules_csv → null
 *      - If other active access remains: removes only the expired module,
 *        keeps remaining modules active
 *   3. Updates UserEntitlement accordingly
 *
 * Safe to re-run — already-expired records are skipped.
 * Admin-only when called directly; automation calls it without a user.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MODULES = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];

function addMonths(fromDate, months) {
  const d = new Date(fromDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both admin users and automation (no user context)
    let isAutomation = false;
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch {
      // No user context — assume automation invocation
      isAutomation = true;
    }

    const now = new Date();

    // Find all active records whose end_at has passed
    const activeRecords = await base44.asServiceRole.entities.ReferralEarnedAccess.filter({
      status: 'active',
    });

    const expired = (activeRecords || []).filter(r => r.end_at && new Date(r.end_at) <= now);

    if (expired.length === 0) {
      return Response.json({ ok: true, expired: 0, message: 'No expired records found' });
    }

    // Group by user_id so we do one entitlement sync per user
    const byUser = {};
    for (const record of expired) {
      await base44.asServiceRole.entities.ReferralEarnedAccess.update(record.id, {
        status: 'expired',
      });
      if (!byUser[record.user_id]) {
        byUser[record.user_id] = { userId: record.user_id, userEmail: record.user_email };
      }
    }

    let synced = 0;
    for (const { userId, userEmail } of Object.values(byUser)) {
      await recomputeEntitlementsAfterExpiry(base44, userId, userEmail, now);
      synced++;
    }

    return Response.json({
      ok: true,
      expired: expired.length,
      usersResynced: synced,
      isAutomation,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Recomputes all entitlement flags for a user after one or more earned-access records expire.
 * Checks all remaining active records AND any paid subscriptions to determine final state.
 */
async function recomputeEntitlementsAfterExpiry(base44, userId, userEmail, now) {
  const nowTs = now || new Date();

  // Remaining active earned-access records (not expired)
  const allEarned = await base44.asServiceRole.entities.ReferralEarnedAccess.filter({
    user_id: userId,
    status: 'active',
  }).catch(() => []);
  const stillActiveEarned = (allEarned || []).filter(a =>
    a.end_at && new Date(a.end_at) > nowTs
  );
  const earnedModules = [...new Set(stillActiveEarned.map(a => a.module).filter(Boolean))];

  // Check for any paid subscription
  const paidContracts = await base44.asServiceRole.entities.ActiveContract.filter({
    user_id: userId,
    is_active: true,
  }).catch(() => []);
  const hasPaidSub = (paidContracts || []).length > 0;

  // Union of all still-active modules
  const paidModules = hasPaidSub
    ? (paidContracts || []).flatMap(c => c.modules || []).filter(Boolean)
    : [];
  const allActiveModules = [...new Set([...earnedModules, ...paidModules])];
  const hasAnyAccess = allActiveModules.length > 0 || hasPaidSub;

  const latestEarnedExpiry = stillActiveEarned.reduce((latest, a) => {
    if (!a.end_at) return latest;
    return !latest || new Date(a.end_at) > new Date(latest) ? a.end_at : latest;
  }, null);

  const primaryEarnedModule = stillActiveEarned.length > 0
    ? stillActiveEarned.sort((a, b) => new Date(b.end_at) - new Date(a.end_at))[0].module
    : null;

  const userPatch = {
    has_paid_access: hasAnyAccess,
    referral_earned_access: earnedModules.length > 0,
    referral_earned_module: primaryEarnedModule || null,
    referral_earned_expires_at: latestEarnedExpiry || null,
    entitlement_tier: hasAnyAccess ? 'premium' : 'free',
    paid_modules_csv: allActiveModules.join(',') || null,
  };

  for (const mod of MODULES) {
    userPatch[`${mod}_paid`] = allActiveModules.includes(mod);
  }

  try {
    await base44.asServiceRole.auth.updateUser(userId, userPatch);
  } catch (e) {
    console.warn(`[expireReferralEarnedAccess] Could not update user ${userId}:`, e?.message);
  }

  // Update UserEntitlement
  try {
    const existing = await base44.asServiceRole.entities.UserEntitlement.filter({ user_id: userId });
    const entData = {
      user_id: userId,
      user_email: userEmail,
      has_access: hasAnyAccess,
      modules: allActiveModules,
      pipekeeper: allActiveModules.includes('pipekeeper'),
      whiskeykeeper: allActiveModules.includes('whiskeykeeper'),
      cigarkeeper: allActiveModules.includes('cigarkeeper'),
      winekeeper: allActiveModules.includes('winekeeper'),
      primary_product: allActiveModules[0] || null,
      primary_provider: hasPaidSub ? (paidContracts[0]?.provider || null) : (earnedModules.length > 0 ? 'referral' : null),
      computed_at: nowTs.toISOString(),
    };

    if (existing?.length > 0) {
      await base44.asServiceRole.entities.UserEntitlement.update(existing[0].id, entData);
    } else {
      await base44.asServiceRole.entities.UserEntitlement.create(entData);
    }
  } catch (e) {
    console.warn(`[expireReferralEarnedAccess] Could not update UserEntitlement for ${userId}:`, e?.message);
  }
}