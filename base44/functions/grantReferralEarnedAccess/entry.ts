/**
 * grantReferralEarnedAccess
 *
 * Creates a ReferralEarnedAccess record for a free user who earned a referral reward
 * but has no active Stripe or iOS subscription.
 *
 * Flow:
 *   1. Creates ReferralEarnedAccess with status=pending_module_selection
 *   2. If module is provided immediately, activates it and updates user entitlements
 *   3. Updates ReferralReward status to 'ready_to_apply'
 *
 * Also used as a PATCH endpoint: calling with { accessId, module } activates a
 * pending_module_selection record and grants entitlement to the chosen module.
 *
 * This is NON-REVENUE access — never counted in billing or subscription reports.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MODULES = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];

function addMonths(date, months) {
  const d = new Date(date);
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

    // ─── PATCH: activate a pending access record with a module choice ─────────
    if (accessId && selectedModule) {
      if (!MODULES.includes(selectedModule)) {
        return Response.json({ error: 'invalid_module' }, { status: 400 });
      }

      const records = await base44.asServiceRole.entities.ReferralEarnedAccess.filter({ id: accessId });
      const record = records?.[0];
      if (!record) return Response.json({ error: 'access_record_not_found' }, { status: 404 });
      if (record.user_id !== user.id && record.user_email !== user.email) {
        return Response.json({ error: 'forbidden' }, { status: 403 });
      }
      if (record.status === 'active') {
        return Response.json({ ok: true, alreadyActive: true, module: record.module });
      }

      const now = new Date().toISOString();
      const endAt = addMonths(now, record.months_granted || 1);

      await base44.asServiceRole.entities.ReferralEarnedAccess.update(accessId, {
        module: selectedModule,
        status: 'active',
        start_at: now,
        end_at: endAt,
        activated_at: now,
      });

      // Grant module access on user entity
      await grantModuleAccess(base44, record.user_id, record.user_email, selectedModule, endAt);

      return Response.json({ ok: true, activated: true, module: selectedModule, endAt });
    }

    // ─── CREATE: called from fulfillReferralReward for free users ────────────
    if (!rewardId) return Response.json({ error: 'rewardId required' }, { status: 400 });

    const rewards = await base44.asServiceRole.entities.ReferralReward.filter({ id: rewardId });
    const reward = rewards?.[0];
    if (!reward) return Response.json({ error: 'reward_not_found' }, { status: 404 });

    // Idempotency: check if already granted
    const existing = await base44.asServiceRole.entities.ReferralEarnedAccess.filter({
      source_reward_id: rewardId,
    });
    if (existing?.length > 0) {
      const rec = existing[0];
      return Response.json({ ok: true, alreadyGranted: true, accessId: rec.id, status: rec.status });
    }

    const now = new Date().toISOString();

    // Create the access record — pending module selection unless one was supplied
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

    // Update reward → ready_to_apply (access exists, waiting for module selection or already active)
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
      const endAt = addMonths(now, reward.months_granted || 1);
      await grantModuleAccess(base44, reward.user_id, reward.user_email, selectedModule, endAt);
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

/**
 * Write module access flag and referral-earned entitlement onto the user record.
 * Also creates/updates a UserEntitlement row so access checks work without
 * changing the Subscription entity (keeping revenue data clean).
 */
async function grantModuleAccess(base44, userId, userEmail, module, endAt) {
  const moduleField = `${module}_paid`;

  // Update user's module entitlement flag
  try {
    await base44.asServiceRole.auth.updateUser(userId, {
      [moduleField]: true,
      has_paid_access: true,
      referral_earned_access: true,
      referral_earned_module: module,
      referral_earned_expires_at: endAt,
    });
  } catch (e) {
    console.warn('[grantReferralEarnedAccess] Could not update user flags:', e?.message);
  }

  // Upsert UserEntitlement row
  try {
    const existing = await base44.asServiceRole.entities.UserEntitlement.filter({ user_id: userId });
    const entitlementData = {
      user_id: userId,
      user_email: userEmail,
      has_access: true,
      modules: [module],
      [module]: true,
      primary_product: module,
      primary_provider: 'referral',
      computed_at: new Date().toISOString(),
    };

    if (existing?.length > 0) {
      const current = existing[0];
      const mergedModules = [...new Set([...(current.modules || []), module])];
      await base44.asServiceRole.entities.UserEntitlement.update(current.id, {
        ...entitlementData,
        modules: mergedModules,
        [module]: true,
      });
    } else {
      await base44.asServiceRole.entities.UserEntitlement.create(entitlementData);
    }
  } catch (e) {
    console.warn('[grantReferralEarnedAccess] Could not upsert UserEntitlement:', e?.message);
  }
}