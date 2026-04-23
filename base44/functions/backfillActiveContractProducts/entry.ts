/**
 * Backfill ActiveContract.product, .modules, .amount_cents, .period_end
 * and populate UserEntitlement from trusted data.
 *
 * Sources:
 *   - Product/modules: User.paid_modules_csv / pipekeeper_paid etc.
 *   - Financials: matched Subscription row (via source_subscription_id or user_id+provider)
 *   - UserEntitlement: one row per user with union of all active contract modules
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PAGE_SIZE = 100;
const KNOWN_MODULES = new Set(['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper']);
const MODULE_ALIASES = {
  pk: 'pipekeeper', pipekeeper: 'pipekeeper', pipe: 'pipekeeper',
  wk: 'whiskeykeeper', whiskeykeeper: 'whiskeykeeper', whiskey: 'whiskeykeeper',
  ck: 'cigarkeeper', cigarkeeper: 'cigarkeeper', cigar: 'cigarkeeper',
  winekeeper: 'winekeeper', wine: 'winekeeper',
};

function norm(v) { return String(v ?? '').trim().toLowerCase(); }
function uniq(arr) { return [...new Set(arr)]; }

async function fetchAll(entity) {
  const out = [];
  let skip = 0;
  while (true) {
    let page = await entity.list(null, PAGE_SIZE, skip);
    if (typeof page === 'string') { try { page = JSON.parse(page); } catch { break; } }
    if (!Array.isArray(page) || page.length === 0) break;
    out.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return out;
}

async function fetchAllSafe(entity) {
  try { return await fetchAll(entity); } catch (e) {
    console.warn('[backfill] fetch failed:', e?.message);
    return [];
  }
}

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMoney(v) {
  if (v === null || v === undefined || v === '') return null;
  let n = Number(String(v).replace(/[$,\s]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  // convert dollars → cents if it looks like dollars (< 1000)
  return Math.round(n < 1000 ? n * 100 : n);
}

function getModulesFromUser(user) {
  const fromCsv = String(user.paid_modules_csv || '')
    .split(',').map((m) => MODULE_ALIASES[norm(m)] || norm(m))
    .filter((m) => KNOWN_MODULES.has(m));
  if (fromCsv.length > 0) return uniq(fromCsv);
  const out = [];
  if (user.pipekeeper_paid) out.push('pipekeeper');
  if (user.whiskeykeeper_paid) out.push('whiskeykeeper');
  if (user.cigarkeeper_paid) out.push('cigarkeeper');
  if (user.winekeeper_paid) out.push('winekeeper');
  return uniq(out);
}

function modulesToFamily(modules) {
  if (!modules || modules.length === 0) return 'unknown';
  if (modules.length === 1) return modules[0];
  // Multi-module = bundle; name it by content
  if (modules.includes('pipekeeper') && modules.includes('whiskeykeeper') && modules.includes('cigarkeeper')) return 'bundle';
  if (modules.includes('pipekeeper') && modules.includes('whiskeykeeper')) return 'bundle';
  return 'bundle';
}

function resolveInterval(subRow) {
  const v = norm(subRow.billing_interval || subRow.interval || subRow.plan_interval || '');
  if (['month', 'monthly', 'mo'].some((x) => v.includes(x))) return 'monthly';
  if (['year', 'annual', 'yr', 'yearly'].some((x) => v.includes(x))) return 'annual';
  return 'unknown';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me || me.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [rawUsers, rawContracts, rawSubscriptions, rawEntitlements] = await Promise.all([
      fetchAllSafe(base44.asServiceRole.entities.User),
      fetchAllSafe(base44.asServiceRole.entities.ActiveContract),
      fetchAllSafe(base44.asServiceRole.entities.Subscription),
      fetchAllSafe(base44.asServiceRole.entities.UserEntitlement),
    ]);

    const users = rawUsers.filter((u) => !u.is_disabled);
    const userById = new Map(users.map((u) => [String(u.id), u]));
    const userByEmail = new Map(users.map((u) => [norm(u.email), u]));

    // Index subscriptions by id for fast lookup (data is nested under .data in Base44 entity rows)
    const subById = new Map(rawSubscriptions.map((s) => [String(s.id), s]));
    // Also index by user_id for fallback — user_id lives in s.data.user_id
    const subsByUserId = new Map();
    for (const s of rawSubscriptions) {
      const sd = s.data || s;
      const uid = String(sd.user_id || s.user_id || '');
      if (!uid) continue;
      if (!subsByUserId.has(uid)) subsByUserId.set(uid, []);
      subsByUserId.get(uid).push(s);
    }

    const stats = {
      contractsTotal: rawContracts.length,
      contractsUpdatedProduct: 0,
      contractsUpdatedModules: 0,
      contractsUpdatedAmountCents: 0,
      contractsUpdatedPeriodEnd: 0,
      entitlementsCreated: 0,
      entitlementsUpdated: 0,
      errors: [],
    };

    // ── Pass 1: Patch ActiveContract rows ────────────────────────────────────
    const contractUpdatePromises = [];

    for (const contract of rawContracts) {
      const d = contract.data || contract;
      const userId = String(d.user_id || contract.user_id || '');
      const email = norm(d.user_email || contract.user_email || '');

      // Find user
      const user = userById.get(userId) || userByEmail.get(email);

      // Find matching subscription — data is nested under .data in Base44 entity rows
      const sourceSubId = String(d.source_subscription_id || '');
      let matchedSub = sourceSubId ? subById.get(sourceSubId) : null;
      if (!matchedSub && userId) {
        const userSubs = subsByUserId.get(userId) || [];
        // Pick best active sub
        matchedSub = userSubs.filter((s) => {
          const sd = s.data || s;
          const st = norm(sd.status || '');
          return st === 'active' || st === 'trialing';
        }).sort((a, b) => {
          const asd = a.data || a;
          const bsd = b.data || b;
          const aEnd = parseDate(asd.current_period_end || asd.renewal_date)?.getTime() || 0;
          const bEnd = parseDate(bsd.current_period_end || bsd.renewal_date)?.getTime() || 0;
          return bEnd - aEnd;
        })[0] || userSubs[0] || null;
      }

      const patch = {};
      let needsPatch = false;

      // ── Product + modules from User flags ───────────────────────────────
      const currentProduct = norm(d.product || '');
      const currentModules = Array.isArray(d.modules) ? d.modules : [];

      if (user) {
        const derivedModules = getModulesFromUser(user);
        const derivedProduct = modulesToFamily(derivedModules);

        if (derivedProduct !== 'unknown' && (currentProduct === 'unknown' || currentProduct === '' || !currentProduct)) {
          patch.product = derivedProduct;
          stats.contractsUpdatedProduct++;
          needsPatch = true;
        }

        if (derivedModules.length > 0 && currentModules.length === 0) {
          patch.modules = derivedModules;
          stats.contractsUpdatedModules++;
          needsPatch = true;
        }
      }

      // ── Financial fields from matched Subscription ───────────────────────
      if (matchedSub) {
        // Base44 entity rows nest all custom fields under .data
        const subData = matchedSub.data || matchedSub;
        const amount = parseMoney(subData.amount !== undefined ? subData.amount : (subData.renewal_amount || subData.price));
        const periodEnd = parseDate(subData.current_period_end || subData.renewal_date || subData.trial_end_date);
        const interval = resolveInterval(subData);

        const currentAmountCents = Number(d.amount_cents || 0);
        if (amount && amount > 0 && (currentAmountCents === 0 || !currentAmountCents)) {
          patch.amount_cents = amount;
          if (interval !== 'unknown') {
            patch.mrr_cents = interval === 'annual' ? Math.round(amount / 12) : amount;
            patch.billing_interval = interval === 'annual' ? 'annual' : 'monthly';
          }
          patch.amount_source = 'subscription_fallback';
          stats.contractsUpdatedAmountCents++;
          needsPatch = true;
        }

        const currentPeriodEnd = d.period_end;
        if (periodEnd && !currentPeriodEnd) {
          patch.period_end = periodEnd.toISOString();
          patch.period_end_source = 'subscription_fallback';
          stats.contractsUpdatedPeriodEnd++;
          needsPatch = true;
        }
      }

      if (needsPatch) {
        patch.normalized_at = new Date().toISOString();
        // Remove product_unknown from issues if we resolved it
        if (patch.product && patch.product !== 'unknown') {
          const issues = (d.issues || []).filter((i) => i !== 'product_unknown');
          if (!patch.amount_cents && (d.amount_cents === 0 || !d.amount_cents)) {
            // keep renewal_date_missing only if still missing
          }
          patch.issues = issues;
          patch.product_source = 'user_flags';
          patch.quality = (issues.length === 0) ? 'trusted' : 'inferred';
        }
        contractUpdatePromises.push(
          base44.asServiceRole.entities.ActiveContract.update(contract.id, patch)
            .catch((e) => stats.errors.push(`AC ${contract.id}: ${e?.message}`))
        );
      }
    }

    // Run all contract updates in batches of 20
    const BATCH = 20;
    for (let i = 0; i < contractUpdatePromises.length; i += BATCH) {
      await Promise.all(contractUpdatePromises.slice(i, i + BATCH));
    }

    console.log(`[backfill] Contract patches queued: ${contractUpdatePromises.length}`);

    // ── Pass 2: Build & upsert UserEntitlement rows ──────────────────────────
    // Build per-user module union from:
    // 1. User flags (authoritative)
    // 2. Active Subscription rows
    const userEntitlementMap = new Map(); // userId → { modules, mrr_cents, contracts }

    for (const user of users) {
      const userId = String(user.id);
      const email = norm(user.email || '');
      const modules = getModulesFromUser(user);
      if (modules.length === 0) continue;

      const userSubs = subsByUserId.get(userId) || [];
      const activeSubs = userSubs.filter((s) => {
        const sd = s.data || s;
        const st = norm(sd.status || '');
        return st === 'active' || st === 'trialing';
      });

      // Only create entitlements for users with active subscriptions OR explicit module flags
      const hasPaidAccess = activeSubs.length > 0 || user.has_paid_access ||
        user.pipekeeper_paid || user.whiskeykeeper_paid || user.cigarkeeper_paid || user.winekeeper_paid;
      if (!hasPaidAccess) continue;

      let totalMrrCents = 0;
      let primaryBillingInterval = 'unknown';
      let nextRenewal = null;

      for (const sub of activeSubs) {
        // Base44 entity rows nest custom fields under .data
        const sd = sub.data || sub;
        const amountCents = parseMoney(sd.amount !== undefined ? sd.amount : (sd.renewal_amount || sd.price)) || 0;
        const interval = resolveInterval(sd);
        const mrr = interval === 'annual' ? Math.round(amountCents / 12) : amountCents;
        totalMrrCents += mrr;
        if (interval !== 'unknown') primaryBillingInterval = interval;
        const renewal = parseDate(sd.current_period_end || sd.renewal_date);
        if (renewal && (!nextRenewal || renewal < nextRenewal)) nextRenewal = renewal;
      }

      userEntitlementMap.set(userId, {
        user_id: userId,
        user_email: email,
        has_access: true,
        modules,
        pipekeeper: modules.includes('pipekeeper'),
        whiskeykeeper: modules.includes('whiskeykeeper'),
        cigarkeeper: modules.includes('cigarkeeper'),
        winekeeper: modules.includes('winekeeper'),
        mrr_cents: totalMrrCents,
        contract_count: activeSubs.length,
        primary_product: modulesToFamily(modules),
        primary_provider: norm(activeSubs[0]?.provider || activeSubs[0]?.data?.provider || 'stripe'),
        primary_billing_interval: primaryBillingInterval,
        next_renewal_at: nextRenewal?.toISOString() || null,
        computed_at: new Date().toISOString(),
      });
    }

    // Index existing entitlements by user_id
    const existingEntitlements = new Map();
    for (const e of rawEntitlements) {
      const uid = String(e.user_id || e.data?.user_id || '');
      if (uid) existingEntitlements.set(uid, e);
    }

    const entitlementOps = [];
    for (const [userId, payload] of userEntitlementMap.entries()) {
      const existing = existingEntitlements.get(userId);
      if (existing) {
        entitlementOps.push(
          base44.asServiceRole.entities.UserEntitlement.update(existing.id, payload)
            .then(() => { stats.entitlementsUpdated++; })
            .catch((e) => stats.errors.push(`UE update ${userId}: ${e?.message}`))
        );
      } else {
        entitlementOps.push(
          base44.asServiceRole.entities.UserEntitlement.create(payload)
            .then(() => { stats.entitlementsCreated++; })
            .catch((e) => stats.errors.push(`UE create ${userId}: ${e?.message}`))
        );
      }
    }

    for (let i = 0; i < entitlementOps.length; i += BATCH) {
      await Promise.all(entitlementOps.slice(i, i + BATCH));
    }

    console.log(`[backfill] Entitlement ops: create=${stats.entitlementsCreated}, update=${stats.entitlementsUpdated}`);

    return Response.json({
      success: true,
      stats,
      userEntitlementRowsProcessed: userEntitlementMap.size,
      summary: `Patched ${stats.contractsUpdatedProduct} products, ${stats.contractsUpdatedModules} modules, ${stats.contractsUpdatedAmountCents} amounts, ${stats.contractsUpdatedPeriodEnd} period_ends. Created ${stats.entitlementsCreated} / updated ${stats.entitlementsUpdated} UserEntitlement rows.`,
    });

  } catch (error) {
    console.error('[backfillActiveContractProducts] fatal:', error);
    return Response.json({ error: error?.message }, { status: 500 });
  }
});