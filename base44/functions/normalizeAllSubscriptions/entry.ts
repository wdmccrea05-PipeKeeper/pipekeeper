/**
 * normalizeAllSubscriptions
 *
 * Admin-only backfill pipeline that repairs ALL subscription records in the DB.
 *
 * For each record it:
 *   1. Resolves price_id → planKey → modules/interval/amount from PLAN_CATALOG env map
 *   2. Falls back to Stripe live lookup for records with a provider_subscription_id
 *   3. Falls back to amount inference (known price points) for any remainder
 *   4. Writes canonical fields back: planKey, modules_csv, product_kind, billing_interval, amount
 *   5. Records source_confidence + source_trace on every row
 *
 * POST /normalizeAllSubscriptions
 * Body: { dryRun?: boolean, limit?: number }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

// ─── PLAN_CATALOG env map ────────────────────────────────────────────────────

function buildPriceMap() {
  const e = Deno.env;
  return {
    [e.get('VITE_STRIPE_PIPEKEEPER_MONTHLY') || '']:    { planKey: 'pipekeeper_pro_monthly',        modules: ['pipekeeper'],                                          interval: 'month', price: 2.99  },
    [e.get('VITE_STRIPE_PIPEKEEPER_ANNUAL') || '']:     { planKey: 'pipekeeper_pro_annual',          modules: ['pipekeeper'],                                          interval: 'year',  price: 29.99 },
    [e.get('VITE_STRIPE_WHISKEYKEEPER_MONTHLY') || '']: { planKey: 'whiskeykeeper_pro_monthly',      modules: ['whiskeykeeper'],                                       interval: 'month', price: 2.99  },
    [e.get('VITE_STRIPE_WHISKEYKEEPER_ANNUAL') || '']:  { planKey: 'whiskeykeeper_pro_annual',       modules: ['whiskeykeeper'],                                       interval: 'year',  price: 29.99 },
    [e.get('VITE_STRIPE_CIGARKEEPER_MONTHLY') || '']:   { planKey: 'cigarkeeper_pro_monthly',        modules: ['cigarkeeper'],                                         interval: 'month', price: 2.99  },
    [e.get('VITE_STRIPE_CIGARKEEPER_ANNUAL') || '']:    { planKey: 'cigarkeeper_pro_annual',         modules: ['cigarkeeper'],                                         interval: 'year',  price: 29.99 },
    [e.get('VITE_STRIPE_WINEKEEPER_MONTHLY') || '']:    { planKey: 'winekeeper_pro_monthly',         modules: ['winekeeper'],                                          interval: 'month', price: 2.99  },
    [e.get('VITE_STRIPE_WINEKEEPER_ANNUAL') || '']:     { planKey: 'winekeeper_pro_annual',          modules: ['winekeeper'],                                          interval: 'year',  price: 29.99 },
    [e.get('VITE_STRIPE_THREE_BUNDLE_MONTHLY') || '']:  { planKey: 'three_module_bundle_monthly',    modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],           interval: 'month', price: 7.99  },
    [e.get('VITE_STRIPE_THREE_BUNDLE_ANNUAL') || '']:   { planKey: 'three_module_bundle_annual',     modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],           interval: 'year',  price: 79.99 },
    [e.get('VITE_STRIPE_FOUR_BUNDLE_MONTHLY') || '']:   { planKey: 'four_module_bundle_monthly',     modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], interval: 'month', price: 8.99  },
    [e.get('VITE_STRIPE_FOUR_BUNDLE_ANNUAL') || '']:    { planKey: 'four_module_bundle_annual',      modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], interval: 'year',  price: 89.99 },
    [e.get('VITE_STRIPE_FOUNDERS_MONTHLY') || '']:      { planKey: 'founders_bundle_monthly',        modules: ['pipekeeper', 'whiskeykeeper'],                          interval: 'month', price: 4.99  },
    [e.get('VITE_STRIPE_FOUNDERS_ANNUAL') || '']:       { planKey: 'founders_bundle_annual',         modules: ['pipekeeper', 'whiskeykeeper'],                          interval: 'year',  price: 49.99 },
  };
}

// ─── Amount inference (known price points) ───────────────────────────────────

function inferFromAmount(amount) {
  const a = parseFloat(Number(amount).toFixed(2));
  if (a === 1.99)  return { interval: 'month', modules: null,                                                      isBundle: false, label: 'Legacy Premium'            };
  if (a === 19.99) return { interval: 'year',  modules: null,                                                      isBundle: false, label: 'Legacy Premium Annual'     };
  if (a === 2.99)  return { interval: 'month', modules: null,                                                      isBundle: false, label: 'Pro'                       };
  if (a === 29.99) return { interval: 'year',  modules: null,                                                      isBundle: false, label: 'Pro Annual'                };
  if (a === 4.99)  return { interval: 'month', modules: ['pipekeeper', 'whiskeykeeper'],                           isBundle: true,  label: 'Founders Bundle (PK+WK)'   };
  if (a === 49.99) return { interval: 'year',  modules: ['pipekeeper', 'whiskeykeeper'],                           isBundle: true,  label: 'Founders Bundle Annual'    };
  if (a === 7.99)  return { interval: 'month', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],            isBundle: true,  label: '3-Module Bundle'           };
  if (a === 79.99) return { interval: 'year',  modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'],            isBundle: true,  label: '3-Module Bundle Annual'    };
  if (a === 8.99)  return { interval: 'month', modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], isBundle: true, label: '4-Module Bundle'          };
  if (a === 89.99) return { interval: 'year',  modules: ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'], isBundle: true, label: '4-Module Bundle Annual'   };
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function norm(v) { return String(v ?? '').trim().toLowerCase(); }

function modulesFromPlanKey(planKey) {
  const k = norm(planKey);
  if (k.startsWith('pipekeeper_'))    return ['pipekeeper'];
  if (k.startsWith('whiskeykeeper_')) return ['whiskeykeeper'];
  if (k.startsWith('cigarkeeper_'))   return ['cigarkeeper'];
  if (k.startsWith('winekeeper_'))    return ['winekeeper'];
  if (k.includes('three_module'))     return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper'];
  if (k.includes('four_module'))      return ['pipekeeper', 'whiskeykeeper', 'cigarkeeper', 'winekeeper'];
  if (k.includes('founders'))         return ['pipekeeper', 'whiskeykeeper'];
  return [];
}

function productKindFromModules(modules) {
  if (!modules || modules.length === 0) return 'unknown';
  if (modules.length > 1) return 'bundle';
  return 'single';
}

function bundleNameFromPlanKey(planKey) {
  const k = norm(planKey || '');
  if (k.includes('founders'))     return 'Founders Bundle';
  if (k.includes('three_module')) return '3-Module Bundle';
  if (k.includes('four_module'))  return '4-Module Bundle';
  return null;
}

// ─── Core resolution logic ───────────────────────────────────────────────────

/**
 * Resolve canonical billing fields for a raw subscription record.
 * Returns { patch, confidence, trace } or null if nothing changed.
 */
async function resolveCanonical(raw, priceMap, stripe) {
  const trace = [];
  let planKey = null;
  let modules = null;
  let interval = null;
  let amount = null;
  let confidence = 'low';

  // ── Step 1: price_id → env PLAN_CATALOG map ──────────────────────────────
  const rawPriceId = raw.price_id || raw.stripe_price_id || null;
  if (rawPriceId && priceMap[rawPriceId]) {
    const entry = priceMap[rawPriceId];
    planKey   = entry.planKey;
    modules   = entry.modules;
    interval  = entry.interval;
    amount    = raw.amount > 0 ? raw.amount : entry.price;
    confidence = 'high';
    trace.push(`price_id_map:${rawPriceId}→${planKey}`);
  }

  // ── Step 2: existing planKey in DB → PLAN_CATALOG ────────────────────────
  if (!modules && raw.planKey) {
    const fromPlanKey = modulesFromPlanKey(raw.planKey);
    if (fromPlanKey.length > 0) {
      planKey   = raw.planKey;
      modules   = fromPlanKey;
      confidence = 'high';
      trace.push(`db_planKey:${planKey}`);
    }
  }

  // ── Step 3: modules_csv already in DB ────────────────────────────────────
  if (!modules && raw.modules_csv) {
    const csv = String(raw.modules_csv).split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
    if (csv.length > 0 && csv[0] !== 'unknown') {
      modules   = csv;
      confidence = 'medium';
      trace.push(`db_modules_csv:${csv.join(',')}`);
    }
  }

  // ── Step 4: Live Stripe lookup ────────────────────────────────────────────
  const stripeSubId = raw.provider_subscription_id || raw.stripe_subscription_id;
  if ((!modules || !interval) && stripeSubId && stripe) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubId, {
        expand: ['items.data.price'],
      });
      const item    = stripeSub.items?.data?.[0];
      const priceId = item?.price?.id;
      if (priceId && priceMap[priceId]) {
        const entry = priceMap[priceId];
        planKey   = entry.planKey;
        modules   = entry.modules;
        interval  = entry.interval;
        amount    = item.price.unit_amount ? item.price.unit_amount / 100 : entry.price;
        confidence = 'high';
        trace.push(`stripe_live_price:${priceId}→${planKey}`);
      } else if (priceId) {
        // Price ID from Stripe but not in our map — extract interval at least
        const stripeInterval = item?.price?.recurring?.interval;
        if (stripeInterval && !interval) {
          interval = stripeInterval;
          trace.push(`stripe_interval:${interval}`);
        }
        if (!amount && item?.price?.unit_amount) {
          amount = item.price.unit_amount / 100;
          trace.push(`stripe_amount:${amount}`);
        }
        confidence = 'medium';
      }
    } catch (err) {
      trace.push(`stripe_lookup_failed:${err.message?.slice(0, 60)}`);
    }
  }

  // ── Step 5: Amount inference ──────────────────────────────────────────────
  const rawAmount = Number(raw.amount || raw.renewal_amount || 0);
  if (!modules || !interval) {
    const inf = rawAmount > 0 ? inferFromAmount(rawAmount) : null;
    if (inf) {
      if (!interval) {
        interval = inf.interval;
        trace.push(`amount_inference_interval:${rawAmount}→${interval}`);
      }
      if (!modules && inf.modules) {
        modules   = inf.modules;
        confidence = confidence === 'high' ? 'high' : 'medium';
        trace.push(`amount_inference_modules:${rawAmount}→${inf.modules.join(',')}`);
      }
    }
  }

  // ── Step 6: billing_interval field in DB ─────────────────────────────────
  if (!interval) {
    const bi = norm(raw.billing_interval || raw.billing_period || '');
    if (bi === 'month' || bi === 'monthly') { interval = 'month'; trace.push('db_interval:month'); }
    else if (bi === 'year' || bi === 'annual' || bi === 'yearly') { interval = 'year'; trace.push('db_interval:year'); }
  }

  // ── Step 7: period-length inference for interval ─────────────────────────
  if (!interval && raw.current_period_start && raw.current_period_end) {
    const start = new Date(raw.current_period_start);
    const end   = new Date(raw.current_period_end);
    if (!isNaN(start) && !isNaN(end)) {
      const days = Math.round((end - start) / 86400000);
      if (days >= 300)           { interval = 'year';  trace.push(`period_inference:${days}d→year`); }
      else if (days >= 20 && days <= 45) { interval = 'month'; trace.push(`period_inference:${days}d→month`); }
    }
  }

  // ── Compute final patch fields ────────────────────────────────────────────
  if (!modules) modules = [];

  const productKind  = productKindFromModules(modules);
  const modulesCsv   = modules.length > 0 ? modules.join(',') : null;
  const bundleName   = planKey ? bundleNameFromPlanKey(planKey) : null;
  const finalAmount  = amount || (rawAmount > 0 ? rawAmount : null);

  // Only patch if we're actually adding/changing something meaningful
  // A record needs patching if ANY canonical field is missing or wrong
  const existingModules = raw.modules_csv && raw.modules_csv !== 'unknown' ? raw.modules_csv : null;
  const needsPatch =
    (modules.length > 0 && existingModules !== modulesCsv) ||
    (interval && raw.billing_interval !== interval && raw.billing_interval !== 'month' && raw.billing_interval !== 'year') ||
    (planKey && raw.planKey !== planKey) ||
    (productKind !== 'unknown' && raw.product_kind !== productKind) ||
    (finalAmount && (!raw.amount || Number(raw.amount) === 0)) ||
    // Always patch if modules are still missing regardless of other fields
    (!existingModules && modules.length > 0);

  if (!needsPatch) return null;

  const patch = {
    ...(planKey      ? { planKey }                        : {}),
    ...(modulesCsv   ? { modules_csv: modulesCsv }        : {}),
    ...(modules[0]   ? { primary_module: modules[0] }     : {}),
    ...(modules.length > 0 ? { module_count: modules.length } : {}),
    ...(productKind !== 'unknown' ? { product_kind: productKind } : {}),
    ...(bundleName   ? { bundle_name: bundleName }        : {}),
    ...(interval     ? { billing_interval: interval, billing_period: interval } : {}),
    ...(finalAmount  ? { amount: finalAmount, renewal_amount: finalAmount } : {}),
    source_confidence: confidence,
    source_trace: trace.join(' | '),
    normalized_at: new Date().toISOString(),
  };

  return { patch, confidence, trace };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (authUser?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch {}
    const dryRun = body.dryRun !== false; // default: dryRun=true for safety
    const maxRows = Math.min(Number(body.limit) || 500, 1000);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    let stripe = null;
    if (stripeKey) {
      try {
        stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
        await stripe.balance.retrieve(); // sanity check
      } catch {
        stripe = null; // proceed without live Stripe lookups
      }
    }

    const priceMap = buildPriceMap();
    // Remove empty-key entries
    delete priceMap[''];

    // Fetch all subscription records (paginated)
    const allSubs = [];
    let skip = 0;
    const PAGE = 100;
    while (allSubs.length < maxRows) {
      const page = await base44.asServiceRole.entities.Subscription.list(null, PAGE, skip);
      if (!Array.isArray(page) || page.length === 0) break;
      allSubs.push(...page);
      if (page.length < PAGE) break;
      skip += PAGE;
    }

    console.log(`[normalizeAllSubscriptions] Loaded ${allSubs.length} subscription records`);

    // Count before state
    const before = {
      total: allSubs.length,
      missingModules:  allSubs.filter(s => !s.modules_csv || s.modules_csv === 'unknown').length,
      missingInterval: allSubs.filter(s => !s.billing_interval).length,
      missingAmount:   allSubs.filter(s => !s.amount || Number(s.amount) === 0).length,
      missingPlanKey:  allSubs.filter(s => !s.planKey).length,
    };

    let repaired = 0;
    let skipped = 0;
    let errors = 0;
    const sampleRepairs = [];
    const sampleErrors = [];

    for (const raw of allSubs) {
      try {
        const result = await resolveCanonical(raw, priceMap, stripe);
        if (!result) { skipped++; continue; }

        const { patch, confidence, trace } = result;

        if (!dryRun) {
          await base44.asServiceRole.entities.Subscription.update(raw.id, patch);
        }

        repaired++;
        if (sampleRepairs.length < 5) {
          sampleRepairs.push({
            id: raw.id,
            user_email: raw.user_email,
            before: {
              modules_csv:      raw.modules_csv,
              billing_interval: raw.billing_interval,
              amount:           raw.amount,
              planKey:          raw.planKey,
              product_kind:     raw.product_kind,
            },
            after: patch,
            confidence,
            trace: trace.join(' | '),
          });
        }
      } catch (err) {
        errors++;
        if (sampleErrors.length < 5) sampleErrors.push({ id: raw.id, error: err.message });
      }
    }

    // Count after state (approximate — not re-fetching)
    const after = {
      repaired,
      skipped,
      errors,
    };

    console.log(`[normalizeAllSubscriptions] Done: repaired=${repaired} skipped=${skipped} errors=${errors} dryRun=${dryRun}`);

    return Response.json({
      ok: true,
      dryRun,
      stripeAvailable: !!stripe,
      priceMapKeys: Object.keys(priceMap).filter(k => k).length,
      before,
      after,
      sampleRepairs,
      sampleErrors,
      summary: dryRun
        ? `DRY RUN — ${repaired} records would be repaired. Run with dryRun=false to apply.`
        : `APPLIED — ${repaired} records repaired out of ${allSubs.length} total.`,
    });

  } catch (error) {
    console.error('[normalizeAllSubscriptions] FATAL:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});