/**
 * Backfill Apple subscription modules using the expanded product ID resolver.
 *
 * Re-resolves plan_key, modules_csv, module_count, product_kind, and
 * primary_module for all Apple Subscription records that have a product_id
 * or a recognizable plan_key. Also updates the User record's paid flags
 * and UserEntitlement.
 *
 * Admin-only. Safe to re-run.
 *
 * NOTE: resolveAppleProductId and modulesFromPlanKey are inlined here because
 * Base44 functions can't import from ../_shared/. Keep in sync with
 * _shared/subscriptionNormalizer/entry.ts.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const normEmail = (email: string) => String(email || '').trim().toLowerCase();
const ALL_MODULES = ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];

function uniqueModules(modules: string[]) {
  return [...new Set((modules || []).map((m) => String(m || '').trim().toLowerCase()).filter(Boolean))];
}

// ── Inlined from _shared/subscriptionNormalizer/entry.ts ──────────────────────
function modulesFromPlanKey(planKey: string): string[] {
  const key = String(planKey || '').toLowerCase();
  if (key.startsWith('pipekeeper_'))    return ['pipekeeper'];
  if (key.startsWith('whiskeykeeper_')) return ['whiskeykeeper'];
  if (key.startsWith('cigarkeeper_'))   return ['cigarkeeper'];
  if (key.startsWith('winekeeper_'))    return ['winekeeper'];
  if (key.includes('three_module'))     return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
  if (key.includes('four_module'))      return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  if (key.includes('founders'))         return ['pipekeeper', 'whiskeykeeper'];
  return [];
}

function resolveAppleProductId(productId: string): {
  planKey: string;
  modules: string[];
  productKind: string;
} | null {
  const product = String(productId || '').trim().toLowerCase();
  if (!product) return null;
  const isAnnual = product.includes('annual') || product.includes('year');

  // 4-module / all-modules bundle
  if (product.includes('all_module') || product.includes('allmodule') ||
      product.includes('four_module') || product.includes('fourmodule') ||
      product.includes('4_module') || product.includes('4module') ||
      (product.includes('bundle') && product.includes('wine'))) {
    return {
      planKey: isAnnual ? 'four_module_bundle_annual' : 'four_module_bundle_monthly',
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'],
      productKind: 'bundle_4',
    };
  }

  // 3-module bundle
  if (product.includes('three_module') || product.includes('threemodule') ||
      product.includes('3_module') || product.includes('3module') ||
      (product.includes('bundle') && !product.includes('wine') && !product.includes('founders'))) {
    return {
      planKey: isAnnual ? 'three_module_bundle_annual' : 'three_module_bundle_monthly',
      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],
      productKind: 'bundle_3',
    };
  }

  // Founders bundle (2 modules: PK + WK)
  if (product.includes('founders')) {
    return {
      planKey: isAnnual ? 'founders_bundle_annual' : 'founders_bundle_monthly',
      modules: ['pipekeeper', 'whiskeykeeper'],
      productKind: 'founders',
    };
  }

  // Single modules
  if (product.includes('whiskey')) return { planKey: isAnnual ? 'whiskeykeeper_pro_annual' : 'whiskeykeeper_pro_monthly', modules: ['whiskeykeeper'], productKind: 'single' };
  if (product.includes('cigar'))   return { planKey: isAnnual ? 'cigarkeeper_pro_annual' : 'cigarkeeper_pro_monthly', modules: ['cigarkeeper'], productKind: 'single' };
  if (product.includes('wine'))    return { planKey: isAnnual ? 'winekeeper_pro_annual' : 'winekeeper_pro_monthly', modules: ['winekeeper'], productKind: 'single' };
  if (product.includes('pipe') || product.includes('pipekeeper')) return { planKey: isAnnual ? 'pipekeeper_pro_annual' : 'pipekeeper_pro_monthly', modules: ['pipekeeper'], productKind: 'single' };

  return null;
}
// ── End inlined ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all Apple subscriptions
    const allAppleSubs = await base44.asServiceRole.entities.Subscription.filter({ provider: 'apple' });

    const stats = {
      total: allAppleSubs.length,
      resolved: 0,
      alreadyCorrect: 0,
      unresolvable: 0,
      usersUpdated: 0,
      entitlementsUpdated: 0,
      details: [] as any[],
    };

    for (const sub of allAppleSubs) {
      const productId = String(sub.product_id || '');
      const planKey = String(sub.plan_key || sub.planKey || '');
      const email = normEmail(sub.user_email || '');

      // Try to resolve modules: product_id first, then plan_key
      let resolvedModules: string[] = [];
      let resolvedPlanKey = '';
      let resolvedProductKind = '';

      if (productId) {
        const appleResolved = resolveAppleProductId(productId);
        if (appleResolved) {
          resolvedModules = appleResolved.modules;
          resolvedPlanKey = appleResolved.planKey;
          resolvedProductKind = appleResolved.productKind;
        }
      }

      if (resolvedModules.length === 0 && planKey) {
        const fromKey = modulesFromPlanKey(planKey);
        if (fromKey.length > 0) {
          resolvedModules = fromKey;
          resolvedPlanKey = planKey;
        }
      }

      const currentModules = String(sub.modules_csv || '')
        .split(',').map((m) => m.trim().toLowerCase()).filter(Boolean);

      if (resolvedModules.length === 0) {
        stats.unresolvable++;
        stats.details.push({
          email,
          subId: sub.id,
          status: 'unresolvable',
          productId: productId || '(none)',
          planKey: planKey || '(none)',
        });
        continue;
      }

      // Check if already correct
      const currentSorted = [...currentModules].sort().join(',');
      const resolvedSorted = [...resolvedModules].sort().join(',');
      if (currentSorted === resolvedSorted && sub.module_count === resolvedModules.length) {
        stats.alreadyCorrect++;
        continue;
      }

      // Update the Subscription record
      const subUpdate: Record<string, any> = {
        plan_key: resolvedPlanKey,
        planKey: resolvedPlanKey,
        modules_csv: resolvedModules.join(','),
        module_count: resolvedModules.length,
        product_kind: resolvedProductKind || sub.product_kind || null,
        primary_module: resolvedModules[0] || null,
      };
      if (productId) subUpdate.product_id = productId;

      await base44.asServiceRole.entities.Subscription.update(sub.id, subUpdate);
      stats.resolved++;

      // Update the User record
      if (email) {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        const user = users?.[0];
        if (user) {
          const userUpdate: Record<string, any> = {
            paid_modules_csv: resolvedModules.join(','),
            has_paid_access: true,
            entitlement_tier: resolvedModules.length > 1 ? `bundle_${resolvedModules.length}` : 'pro',
            subscription_provider: 'apple',
            subscription_status: sub.status === 'active' ? 'active' : sub.status,
          };
          for (const mod of ALL_MODULES) {
            userUpdate[`${mod}_paid`] = resolvedModules.includes(mod);
          }
          await base44.asServiceRole.entities.User.update(user.id, userUpdate);
          stats.usersUpdated++;

          // Update UserEntitlement
          try {
            const existingEnt = await base44.asServiceRole.entities.UserEntitlement.filter({ user_id: user.id });
            const entData = {
              user_id: user.id,
              user_email: email,
              has_access: true,
              modules: resolvedModules,
              pipekeeper: resolvedModules.includes('pipekeeper'),
              whiskeykeeper: resolvedModules.includes('whiskeykeeper'),
              cigarkeeper: resolvedModules.includes('cigarkeeper'),
              winekeeper: resolvedModules.includes('winekeeper'),
              primary_product: resolvedModules.length > 1 ? 'bundle' : resolvedModules[0],
              primary_provider: 'apple',
              computed_at: new Date().toISOString(),
            };
            if (existingEnt?.length > 0) {
              await base44.asServiceRole.entities.UserEntitlement.update(existingEnt[0].id, entData);
            } else {
              await base44.asServiceRole.entities.UserEntitlement.create(entData);
            }
            stats.entitlementsUpdated++;
          } catch (entErr) {
            console.warn(`[backfillApple] UserEntitlement update failed for ${email}:`, entErr);
          }
        }
      }

      stats.details.push({
        email,
        subId: sub.id,
        status: 'resolved',
        productId: productId || '(none)',
        planKey: resolvedPlanKey,
        modules: resolvedModules,
      });
    }

    return Response.json({
      success: true,
      stats: {
        total: stats.total,
        resolved: stats.resolved,
        alreadyCorrect: stats.alreadyCorrect,
        unresolvable: stats.unresolvable,
        usersUpdated: stats.usersUpdated,
        entitlementsUpdated: stats.entitlementsUpdated,
      },
      details: stats.details,
    });
  } catch (error) {
    console.error('[backfillAppleSubscriptionModules] fatal:', error);
    return Response.json({ error: error?.message }, { status: 500 });
  }
});