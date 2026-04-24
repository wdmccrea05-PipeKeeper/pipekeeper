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

// Extract price ID from various known fields
function extractPriceId(record) {
  if (!record) return null;
  
  // Direct fields
  if (record.price_id) return record.price_id;
  if (record.stripe_price_id) return record.stripe_price_id;
  if (record.productId) return record.productId;
  if (record.product_id) return record.product_id;
  
  // Metadata
  if (record.metadata) {
    const meta = typeof record.metadata === 'string' ? 
      JSON.parse(record.metadata) : record.metadata;
    if (meta.price_id) return meta.price_id;
    if (meta.stripe_price_id) return meta.stripe_price_id;
  }
  
  // Raw payload
  if (record.raw_payload) {
    try {
      const payload = typeof record.raw_payload === 'string' ? 
        JSON.parse(record.raw_payload) : record.raw_payload;
      if (payload.items?.[0]?.price?.id) return payload.items[0].price.id;
      if (payload.price_id) return payload.price_id;
    } catch {}
  }
  
  return null;
}

// Get active subscriptions from both sources
async function getActiveSubscriptions(base44, normalizedEmail, userId) {
  const active_statuses = ['active', 'trialing', 'past_due'];
  const allSubs = [];
  
  // Source 1: ActiveContract
  try {
    const activeContracts = await base44.asServiceRole.entities.ActiveContract.filter({
      is_active: true,
    });
    const matching = activeContracts.filter(ac => 
      (ac.user_email && ac.user_email.toLowerCase() === normalizedEmail) ||
      (ac.user_id === userId)
    );
    allSubs.push(...matching.map(ac => ({ ...ac, source: 'ActiveContract' })));
  } catch (err) {
    // Silent fail
  }
  
  // Source 2: Subscription
  try {
    const subs = await base44.asServiceRole.entities.Subscription.filter({
      user_email: normalizedEmail,
    });
    const matching = subs.filter(s => 
      active_statuses.includes(String(s.status || '').toLowerCase())
    );
    allSubs.push(...matching.map(s => ({ ...s, source: 'Subscription' })));
  } catch (err) {
    // Silent fail
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
        let users = await base44.asServiceRole.entities.User.filter({
          email: normalizedEmail,
        });

        if (users.length === 0) {
          report.needsManualReview.push({
            email: normalizedEmail,
            reason: 'User record not found',
          });
          continue;
        }

        const userRecord = users[0];
        const userId = userRecord.id;
        
        // Get active subscriptions from all sources
        const subscriptions = await getActiveSubscriptions(base44, normalizedEmail, userId);

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
        if (sources.has('Subscription')) report.sourceStats.subscriptionFound++;

        // Aggregate all modules from active subscriptions
        const allModules = new Set();
        const bundleDetected = [];
        const priceIds = [];

        for (const sub of subscriptions) {
          const priceId = extractPriceId(sub);
          if (priceId) {
            priceIds.push(priceId);
            const modules = PRICE_ID_TO_MODULES[priceId];
            
            if (!modules) {
              report.needsManualReview.push({
                email: normalizedEmail,
                reason: `Unknown price_id: ${priceId} (from ${sub.source})`,
              });
              continue;
            }

            if (modules.length > 1) {
              bundleDetected.push(modules.join(','));
            }

            modules.forEach(m => allModules.add(m));
          }
        }

        // If no modules resolved, flag for manual review
        if (allModules.size === 0) {
          report.needsManualReview.push({
            email: normalizedEmail,
            reason: `Found ${subscriptions.length} subscriptions but no recognizable price IDs: ${priceIds.join(', ')}`,
            sources: Array.from(sources),
          });
          continue;
        }

        // Build entitlement flags
        const updates = {
          pipekeeper_paid: allModules.has('pipekeeper'),
          whiskeykeeper_paid: allModules.has('whiskeykeeper'),
          cigarkeeper_paid: allModules.has('cigarkeeper'),
          paid_modules_csv: Array.from(allModules).sort().join(','),
          entitlement_sync_state: 'synced',
        };

        const changed = 
          userRecord.pipekeeper_paid !== updates.pipekeeper_paid ||
          userRecord.whiskeykeeper_paid !== updates.whiskeykeeper_paid ||
          userRecord.cigarkeeper_paid !== updates.cigarkeeper_paid ||
          userRecord.paid_modules_csv !== updates.paid_modules_csv;

        if (changed) {
          await base44.asServiceRole.entities.User.update(userRecord.id, updates);
          
          report.usersRepaired.push({
            email: normalizedEmail,
            modulesBefore: userRecord.paid_modules_csv || 'none',
            modulesAfter: updates.paid_modules_csv,
            bundleType: bundleDetected.length > 0 ? bundleDetected[0] : 'individual',
            sources: Array.from(sources),
            priceIds,
          });

          if (bundleDetected.length > 0) {
            report.bundleSubscriptions.push({
              email: normalizedEmail,
              bundles: bundleDetected,
            });
          }
        } else {
          report.usersRepaired.push({
            email: normalizedEmail,
            status: 'already synced',
            modules: updates.paid_modules_csv,
            sources: Array.from(sources),
          });
        }
      } catch (err) {
        report.errors.push({
          email,
          error: err.message || String(err),
        });
      }
    }

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});