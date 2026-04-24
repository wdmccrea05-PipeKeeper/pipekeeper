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
      totalProcessed: emails.length,
      errors: [],
    };

    for (const email of emails) {
      try {
        const normalizedEmail = email.trim().toLowerCase();
        
        // Fetch active subscriptions for this user (via email or user_id)
        let subscriptions = await base44.asServiceRole.entities.ActiveContract.filter({
          user_email: normalizedEmail,
          is_active: true,
        });

        if (subscriptions.length === 0) {
          report.needsManualReview.push({
            email: normalizedEmail,
            reason: 'No active subscriptions found',
          });
          continue;
        }

        // Aggregate all modules from active subscriptions
        const allModules = new Set();
        const bundleDetected = [];

        for (const sub of subscriptions) {
          const modules = PRICE_ID_TO_MODULES[sub.provider_subscription_id] || 
                          PRICE_ID_TO_MODULES[sub.price_id];
          
          if (!modules) {
            report.needsManualReview.push({
              email: normalizedEmail,
              reason: `Unknown price_id: ${sub.price_id || sub.provider_subscription_id}`,
            });
            continue;
          }

          if (modules.length > 1) {
            bundleDetected.push(modules.join(','));
          }

          modules.forEach(m => allModules.add(m));
        }

        // Build entitlement flags
        const updates = {
          pipekeeper_paid: allModules.has('pipekeeper'),
          whiskeykeeper_paid: allModules.has('whiskeykeeper'),
          cigarkeeper_paid: allModules.has('cigarkeeper'),
          paid_modules_csv: Array.from(allModules).sort().join(','),
          entitlement_sync_state: 'synced',
        };

        // Fetch user and check current state
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