/**
 * grantReferralEarnedAccess
 *
 * Creates or activates a ReferralEarnedAccess record for free users.
 *
 * CREATE  (POST { rewardId })
 *   → creates ReferralEarnedAccess with status=pending_module_selection
 *   → sets ReferralReward.status = ready_to_apply
 *
 * ACTIVATE  (POST { accessId, module })
 *   → activates a pending record for the chosen module
 *   → synchronizes ALL canonical entitlement fields on the user
 *   → handles multiple rewards / overlap correctly
 *
 * Multiple-reward rules
 *   - Same module: extend end_at from the later of (now, existing end_at)
 *   - Different module: each module gets its own independent access window
 *   - Overlap: union of all active earned-access modules is reflected in user flags
 *
 * NON-REVENUE — never counted in billing reports.
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
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { rewardId, module: selectedModule, accessId } = body;

    // ─── ACTIVATE: called when user picks a module ────────────────────────────
    if (accessId && selectedModule) {
      if (!MODULES.includes(selectedModule)) {
        return Response.json({ error: 'invalid_module' }, { status: 400 });
      }

      const records = await base44.asServiceRole.entities.ReferralEarnedAccess.filter({ id: accessId }).catch(() => []);
      const record = records?.[0];
      if (!record) return Response.json({ error: 'access_record_not_found' }, { status: 404 });
      if (record.user_id !== (user.id || user.auth_user_id) && record.user_email !== user.email) {
        return Response.json({ error: 'forbidden' }, { status: 403 });
      }
      if (record.status === 'active') {
        return Response.json({ ok: true, alreadyActive: true, module: record.module });
      }

      const now = new Date().toISOString();

      // Multiple-reward overlap: if same module already has active earned access,
      // extend from that window's end rather than from now.
      const existingForModule = await base44.asServiceRole.entities.ReferralEarnedAccess.filter({
        user_id: record.user_id,
        module: selectedModule,
        status: 'active',
      }).catch(() => []);

      let startFrom = now;
      if (existingForModule?.length > 0) {
        const latestEnd = existingForModule.reduce((latest, a) => {
          return a.end_at && new Date(a.end_at) > new Date(latest) ? a.end_at : latest;
        }, now);
        startFrom = latestEnd;
      }

      const endAt = addMonths(startFrom, record.months_granted || 1);

      await base44.asServiceRole.entities.ReferralEarnedAccess.update(accessId, {
        module: selectedModule,
        status: 'active',
        start_at: now,
        end_at: endAt,
        activated_at: now,
      });

      // Sync all canonical entitlement fields
      await syncEntitlements(base44, record.user_id, record.user_email);

      return Response.json({ ok: true, activated: true, module: selectedModule, endAt });
    }

    // ─── CREATE: called from fulfillReferralReward for free users ────────────
    if (!rewardId) return Response.json({ error: 'rewardId required' }, { status: 400 });

    const rewards = await base44.asServiceRole.entities.ReferralReward.filter({ id: rewardId }).catch(() => []);
    const reward = rewards?.[0];
    if (!reward) return Response.json({ error: 'reward_not_found' }, { status: 404 });

    // Idempotency
    const existing = await base44.asServiceRole.entities.ReferralEarnedAccess.filter({
      source_reward_id: rewardId,
    });
    if (existing?.length > 0) {
      const rec = existing[0];
      return Response.json({ ok: true, alreadyGranted: true, accessId: rec.id, status: rec.status });
    }

    const now = new Date().toISOString();

    const newRecord = await base44.asServiceRole.entities.ReferralEarnedAccess.create({
      user_id: reward.user_id,
      user_email: reward.user_email,
      source_reward_id: rewardId,
      source_referral_event_id: reward.source_referral_event_id,
      reward_type: reward.reward_type,
      months_granted: reward.months_granted || 1,
      module: selectedModule || null,
      access_source: 'referral_reward',
      is_revenue: false,
      status: selectedModule ? 'active' : 'pending_module_selection',
      granted_at: now,
      start_at: selectedModule ? now : null,
      end_at: selectedModule ? addMonths(now, reward.months_granted || 1) : null,
      activated_at: selectedModule ? now : null,
    });

    await base44.asServiceRole.entities.ReferralReward.update(rewardId, {
      status: selectedModule ? 'applied' : 'ready_to_apply',
      applied_at: selectedModule ? now : null,
      provider_reward_reference: `referral_earned_access:${newRecord.id}`,
      failure_reason: null,
      metadata: JSON.stringify({
        access_source: 'referral_reward',
        access_record_id: newRecord.id,
        module: selectedModule || null,
        is_revenue: false,
        granted_at: now,
      }),
    });

    if (selectedModule) {
      await syncEntitlements(base44, reward.user_id, reward.user_email);
    }

    return Response.json({
      ok: true,
      accessId: newRecord.id,
      status: newRecord.status,
      module: selectedModule || null,
      requiresModuleSelection: !selectedModule,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── Canonical entitlement sync ───────────────────────────────────────────────
/**
 * Recomputes ALL access flags for a user from their live records.
 * Merges BOTH earned-access AND paid subscriptions into a single canonical state.
 *
 * This is the single source of truth for entitlement state.
 *
 * Writes:
 *   - {module}_paid flags (union of paid + earned modules)
 *   - has_paid_access
 *   - referral_earned_access / referral_earned_module / referral_earned_expires_at
 *   - entitlement_tier
 *   - paid_modules_csv
 *   - UserEntitlement entity row
 */
async function syncEntitlements(base44, userId, userEmail) {
  const nowTs = new Date();

  // ─── Load all earned-access records ───────────────────────────────────────────
  const allEarned = await base44.asServiceRole.entities.ReferralEarnedAccess.filter({
    user_id: userId,
  }).catch(() => []);

  const activeEarned = (allEarned || []).filter(a =>
    a.status === 'active' && a.end_at && new Date(a.end_at) > nowTs
  );

  const earnedModules = [...new Set(activeEarned.map(a => a.module).filter(Boolean))];

  const latestEarnedExpiry = activeEarned.reduce((latest, a) => {
    if (!a.end_at) return latest;
    return !latest || new Date(a.end_at) > new Date(latest) ? a.end_at : latest;
  }, null);

  const primaryEarnedModule = activeEarned.length > 0
    ? activeEarned.sort((a, b) => new Date(b.end_at) - new Date(a.end_at))[0].module
    : null;

  // ─── Load all paid subscriptions ──────────────────────────────────────────────
  const paidContracts = await base44.asServiceRole.entities.ActiveContract.filter({
    user_id: userId,
    is_active: true,
  }).catch(() => []);

  const hasPaidSub = (paidContracts || []).length > 0;
  const paidModules = hasPaidSub
    ? (paidContracts || []).flatMap(c => c.modules || []).filter(Boolean)
    : [];

  // ─── Compute union of all active modules ──────────────────────────────────────
  const allActiveModules = [...new Set([...earnedModules, ...paidModules])];
  const hasAnyAccess = allActiveModules.length > 0 || hasPaidSub;

  // ─── Build user patch (canonical access state) ───────────────────────────────
  const userPatch = {
    has_paid_access: hasAnyAccess,
    referral_earned_access: earnedModules.length > 0,
    referral_earned_module: primaryEarnedModule || null,
    referral_earned_expires_at: latestEarnedExpiry || null,
    entitlement_tier: hasAnyAccess ? 'premium' : 'free',
    paid_modules_csv: allActiveModules.join(',') || null,
  };

  // Per-module paid flags — union of paid + earned
  for (const mod of MODULES) {
    userPatch[`${mod}_paid`] = allActiveModules.includes(mod);
  }

  // Apply to user record
  try {
    await base44.asServiceRole.auth.updateUser(userId, userPatch);
  } catch (e) {
    console.warn('[syncEntitlements] Could not update user:', e?.message);
  }

  // ─── Upsert UserEntitlement row ──────────────────────────────────────────────
  try {
    const existing = await base44.asServiceRole.entities.UserEntitlement.filter({ user_id: userId });
    const entitlementData = {
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
      await base44.asServiceRole.entities.UserEntitlement.update(existing[0].id, entitlementData);
    } else {
      await base44.asServiceRole.entities.UserEntitlement.create(entitlementData);
    }
  } catch (e) {
    console.warn('[syncEntitlements] Could not upsert UserEntitlement:', e?.message);
  }
}