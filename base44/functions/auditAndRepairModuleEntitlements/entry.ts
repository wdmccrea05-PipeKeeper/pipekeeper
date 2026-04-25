import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Price ID to module mapping
const PRICE_ID_TO_MODULES = {
  'price_1SsDgEDycvQWC88PmdvlxFDa': ['pipekeeper'], // PipeKeeper Monthly
  'price_1SsDU6DycvQWC88PIwpmt7Oc': ['pipekeeper'], // PipeKeeper Annual
  'price_1TBfcdDycvQWC88PV0OV4t9B': ['whiskeykeeper'], // WhiskeyKeeper Monthly
  'price_1TBfd7DycvQWC88PHrCnHl1X': ['whiskeykeeper'], // WhiskeyKeeper Annual
  'price_1TBfbJDycvQWC88PIjsHAufT': ['cigarkeeper'], // CigarKeeper Monthly
  'price_1TBfaeDycvQWC88PkAHy3qIC': ['cigarkeeper'], // CigarKeeper Annual
  'price_1TKgGnDycvQWC88PwdJo75R5': ['pipekeeper', 'whiskeykeeper'], // Founders Bundle Monthly
  'price_1TBfhVDycvQWC88PdZ1jQNwX': ['pipekeeper', 'whiskeykeeper'], // Founders Bundle Annual
  'price_1TBfdyDycvQWC88PPKSN5uVJ': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], // 3-Module Bundle Monthly
  'price_1TBfekDycvQWC88P5nZsEr7j': ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'], // 3-Module Bundle Annual
};

// Resolve modules from a canonical plan key string
function modulesFromPlanKey(planKey) {
  const key = String(planKey || '').toLowerCase();
  if (key.startsWith('pipekeeper_'))    return ['pipekeeper'];
  if (key.startsWith('whiskeykeeper_')) return ['whiskeykeeper'];
  if (key.startsWith('cigarkeeper_'))   return ['cigarkeeper'];
  if (key.startsWith('winekeeper_'))    return ['winekeeper'];
  if (key.includes('three_module') || key.includes('bundle_3')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
  if (key.includes('four_module')  || key.includes('bundle_4')) return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  if (key.includes('founders'))         return ['pipekeeper', 'whiskeykeeper'];
  return [];
}

// Extract price ID from various known fields across record types
function extractPriceId(record) {
  if (!record) return null;

  // Direct fields
  if (record.price_id) return record.price_id;
  if (record.stripe_price_id) return record.stripe_price_id;
  if (record.productId) return record.productId;
  if (record.product_id) return record.product_id;

  // Metadata (object or JSON string)
  if (record.metadata) {
    try {
      const meta = typeof record.metadata === 'string'
        ? JSON.parse(record.metadata)
        : record.metadata;
      if (meta && typeof meta === 'object') {
        if (meta.price_id) return meta.price_id;
        if (meta.stripe_price_id) return meta.stripe_price_id;
      }
    } catch { /* ignore */ }
  }

  // Raw payload — Stripe webhook style (items.data[0].price.id) and flat style
  if (record.raw_payload) {
    try {
      const payload = typeof record.raw_payload === 'string'
        ? JSON.parse(record.raw_payload)
        : record.raw_payload;
      if (payload?.items?.data?.[0]?.price?.id) return payload.items.data[0].price.id;
      if (payload?.items?.[0]?.price?.id)        return payload.items[0].price.id;
      if (payload?.price_id)                     return payload.price_id;
    } catch { /* ignore */ }
  }

  return null;
}

// Resolve modules from a record, trying price ID first then plan_key then csv
function resolveModulesFromRecord(record) {
  // 1. Price ID (most authoritative)
  const priceId = extractPriceId(record);
  if (priceId && PRICE_ID_TO_MODULES[priceId]) {
    return { modules: PRICE_ID_TO_MODULES[priceId], resolvedVia: `price_id:${priceId}` };
  }

  // 2. Plan key
  const planKey = String(record.plan_key || record.planKey || '').trim();
  if (planKey) {
    const fromKey = modulesFromPlanKey(planKey);
    if (fromKey.length > 0) return { modules: fromKey, resolvedVia: `plan_key:${planKey}` };
  }

  // 3. modules_csv
  const csv = String(record.modules_csv || '').trim();
  if (csv) {
    const mods = csv.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
    if (mods.length > 0) return { modules: mods, resolvedVia: 'modules_csv' };
  }

  // 4. primary_module
  const primary = String(record.primary_module || '').trim().toLowerCase();
  if (primary && primary !== 'unknown') return { modules: [primary], resolvedVia: 'primary_module' };

  return { modules: [], resolvedVia: null };
}

// Get active subscriptions from all sources with broad identity matching
async function getActiveSubscriptions(base44, normalizedEmail, userId, stripeCustomerId) {
  const active_statuses = ['active', 'trialing', 'past_due'];
  const seen = new Set();
  const allSubs = [];

  const addSub = (sub, source) => {
    const key = sub.id || JSON.stringify(sub);
    if (!seen.has(key)) {
      seen.add(key);
      allSubs.push({ ...sub, source });
    }
  };

  // Source 1: ActiveContract — broad identity match
  try {
    const activeContracts = await base44.asServiceRole.entities.ActiveContract.filter({
      is_active: true,
    });
    for (const ac of (activeContracts || [])) {
      const emailMatch = ac.user_email && ac.user_email.toLowerCase() === normalizedEmail;
      const idMatch    = ac.user_id === userId;
      if (emailMatch || idMatch) addSub(ac, 'ActiveContract');
    }
  } catch { /* ActiveContract may not exist */ }

  // Source 2: Subscription by user_email
  try {
    const subs = await base44.asServiceRole.entities.Subscription.filter({ user_email: normalizedEmail });
    for (const s of (subs || [])) {
      if (active_statuses.includes(String(s.status || '').toLowerCase())) addSub(s, 'Subscription');
    }
  } catch { /* ignore */ }

  // Source 3: Subscription by user_id
  if (userId) {
    try {
      const subs = await base44.asServiceRole.entities.Subscription.filter({ user_id: userId });
      for (const s of (subs || [])) {
        if (active_statuses.includes(String(s.status || '').toLowerCase())) addSub(s, 'Subscription');
      }
    } catch { /* ignore */ }
  }

  // Source 4: Subscription by customer_email (alternate field)
  try {
    const subs = await base44.asServiceRole.entities.Subscription.filter({ customer_email: normalizedEmail });
    for (const s of (subs || [])) {
      if (active_statuses.includes(String(s.status || '').toLowerCase())) addSub(s, 'Subscription');
    }
  } catch { /* ignore */ }

  // Source 5: Subscription by stripe_customer_id (if known)
  if (stripeCustomerId) {
    try {
      const subs = await base44.asServiceRole.entities.Subscription.filter({ stripe_customer_id: stripeCustomerId });
      for (const s of (subs || [])) {
        if (active_statuses.includes(String(s.status || '').toLowerCase())) addSub(s, 'Subscription');
      }
    } catch { /* ignore */ }
  }

  return allSubs;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { emails } = await req.json();
    if (!Array.isArray(emails) || emails.length === 0) {
      return Response.json({ error: 'emails array required' }, { status: 400 });
    }

    const report = {
      usersRepaired: [],
      missingModuleFlags: [],
      bundleSubscriptions: [],
      needsManualReview: [],
      sourceStats: {
        activeContractFound: 0,
        subscriptionFound: 0,
        stripeRecords: 0,
      },
      totalProcessed: emails.length,
      errors: [],
    };

    for (const email of emails) {
      try {
        const normalizedEmail = email.trim().toLowerCase();

        // Get user record first
        const users = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });

        if (users.length === 0) {
          report.needsManualReview.push({ email: normalizedEmail, reason: 'User record not found' });
          continue;
        }

        const userRecord = users[0];
        const userId = userRecord.id;
        const stripeCustomerId = userRecord.stripe_customer_id || null;

        // Get active subscriptions from all sources
        const subscriptions = await getActiveSubscriptions(base44, normalizedEmail, userId, stripeCustomerId);

        if (subscriptions.length === 0) {
          report.needsManualReview.push({
            email: normalizedEmail,
            reason: 'No active subscriptions found in any source',
          });
          continue;
        }

        // Track source distribution
        const sources = new Set(subscriptions.map(s => s.source));
        if (sources.has('ActiveContract')) report.sourceStats.activeContractFound++;
        if (sources.has('Subscription'))   report.sourceStats.subscriptionFound++;

        // Aggregate modules from all active subscriptions
        const allModules = new Set();
        const bundleDetected = [];
        const priceIds = [];
        let hasUnresolvable = false;

        for (const sub of subscriptions) {
          const { modules, resolvedVia } = resolveModulesFromRecord(sub);

          const priceId = extractPriceId(sub);
          if (priceId) priceIds.push(priceId);

          if (modules.length > 0) {
            if (modules.length > 1) bundleDetected.push(modules.join(','));
            modules.forEach(m => allModules.add(m));
          } else {
            hasUnresolvable = true;
            console.warn(`[auditAndRepairModuleEntitlements] Could not resolve modules for sub ${sub.id || '?'} (email=${normalizedEmail}, source=${sub.source}, priceId=${priceId || 'none'}, resolvedVia=${resolvedVia || 'none'})`);
          }
        }

        // SAFE RULE: if active subscription exists but price ID unresolved,
        // do NOT clear existing module flags — mark for review instead.
        if (allModules.size === 0 && hasUnresolvable) {
          const existingPaid = [
            userRecord.pipekeeper_paid    && 'pipekeeper',
            userRecord.whiskeykeeper_paid && 'whiskeykeeper',
            userRecord.cigarkeeper_paid   && 'cigarkeeper',
            userRecord.winekeeper_paid    && 'winekeeper',
          ].filter(Boolean);

          await base44.asServiceRole.entities.User.update(userRecord.id, {
            entitlement_sync_state: 'needs_review',
          });

          report.needsManualReview.push({
            email: normalizedEmail,
            reason: `Found ${subscriptions.length} active subscription(s) but price ID unresolvable: [${priceIds.join(', ')}]`,
            sources: Array.from(sources),
            existingPaidModules: existingPaid,
          });
          continue;
        }

        if (allModules.size === 0) {
          report.needsManualReview.push({
            email: normalizedEmail,
            reason: `Found ${subscriptions.length} subscriptions but no recognizable price IDs: ${priceIds.join(', ')}`,
            sources: Array.from(sources),
          });
          continue;
        }

        // Build entitlement flags — include winekeeper_paid
        const updates = {
          pipekeeper_paid:    allModules.has('pipekeeper'),
          whiskeykeeper_paid: allModules.has('whiskeykeeper'),
          cigarkeeper_paid:   allModules.has('cigarkeeper'),
          winekeeper_paid:    allModules.has('winekeeper'),
          paid_modules_csv:   Array.from(allModules).sort().join(','),
          entitlement_sync_state: hasUnresolvable ? 'needs_review' : 'synced',
        };

        const changed =
          userRecord.pipekeeper_paid    !== updates.pipekeeper_paid    ||
          userRecord.whiskeykeeper_paid !== updates.whiskeykeeper_paid ||
          userRecord.cigarkeeper_paid   !== updates.cigarkeeper_paid   ||
          userRecord.winekeeper_paid    !== updates.winekeeper_paid    ||
          userRecord.paid_modules_csv   !== updates.paid_modules_csv;

        if (changed) {
          await base44.asServiceRole.entities.User.update(userRecord.id, updates);

          report.usersRepaired.push({
            email: normalizedEmail,
            modulesBefore: userRecord.paid_modules_csv || 'none',
            modulesAfter:  updates.paid_modules_csv,
            bundleType:    bundleDetected.length > 0 ? bundleDetected[0] : 'individual',
            sources:       Array.from(sources),
            priceIds,
            syncState:     updates.entitlement_sync_state,
          });

          if (bundleDetected.length > 0) {
            report.bundleSubscriptions.push({ email: normalizedEmail, bundles: bundleDetected });
          }
        } else {
          report.usersRepaired.push({
            email: normalizedEmail,
            status:   'already synced',
            modules:  updates.paid_modules_csv,
            sources:  Array.from(sources),
            syncState: updates.entitlement_sync_state,
          });
        }
      } catch (err) {
        report.errors.push({ email, error: err.message || String(err) });
      }
    }

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});