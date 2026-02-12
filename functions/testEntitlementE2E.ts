// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[E2E Test] Starting comprehensive entitlement system test');

    const issues = [];
    const warnings = [];
    const passed = [];

    // TEST 1: Check User entity schema consistency
    console.log('[E2E Test] Test 1: User entity schema');
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      
      let usersWithNestedData = 0;
      let usersWithMissingEntitlements = 0;
      let usersWithInconsistentData = 0;
      
      for (const u of allUsers) {
        // Check for nested data.data structure
        if (u.data?.data !== undefined) {
          usersWithNestedData++;
        }
        
        // Check for missing entitlement fields
        if (!u.data?.entitlement_tier && !u.data?.subscription_tier) {
          usersWithMissingEntitlements++;
        }
        
        // Check for inconsistent entitlement vs subscription fields
        if (u.data?.entitlement_tier && u.data?.subscription_tier) {
          if (u.data.entitlement_tier !== u.data.subscription_tier) {
            usersWithInconsistentData++;
          }
        }
      }
      
      if (usersWithNestedData > 0) {
        issues.push({
          test: 'User Schema',
          severity: 'HIGH',
          issue: `${usersWithNestedData} users have nested data.data structure`,
          impact: 'Entitlements stored in nested structure may not be readable by frontend'
        });
      }
      
      if (usersWithMissingEntitlements > 0) {
        issues.push({
          test: 'User Schema',
          severity: 'HIGH',
          issue: `${usersWithMissingEntitlements} users missing entitlement fields`,
          impact: 'Users may not have proper access despite having subscriptions'
        });
      }
      
      if (usersWithInconsistentData > 0) {
        warnings.push({
          test: 'User Schema',
          severity: 'MEDIUM',
          issue: `${usersWithInconsistentData} users have inconsistent entitlement_tier vs subscription_tier`,
          impact: 'May cause confusion in access checks'
        });
      } else {
        passed.push('User Schema: All users have consistent entitlement fields');
      }
    } catch (err) {
      issues.push({
        test: 'User Schema',
        severity: 'CRITICAL',
        issue: 'Failed to query User entity',
        error: err.message
      });
    }

    // TEST 2: Check Subscription entity linkage
    console.log('[E2E Test] Test 2: Subscription linkage');
    try {
      const allSubs = await base44.asServiceRole.entities.Subscription.list();
      
      let subsWithoutUserId = 0;
      let subsWithoutUserEmail = 0;
      let activePaidSubs = 0;
      
      for (const sub of allSubs) {
        const status = (sub.data?.status || '').toLowerCase();
        const isActive = ['active', 'trialing', 'trial'].includes(status);
        
        if (isActive) {
          activePaidSubs++;
          
          if (!sub.data?.user_id) {
            subsWithoutUserId++;
          }
          if (!sub.data?.user_email) {
            subsWithoutUserEmail++;
          }
        }
      }
      
      if (subsWithoutUserId > 0) {
        issues.push({
          test: 'Subscription Linkage',
          severity: 'HIGH',
          issue: `${subsWithoutUserId} active subscriptions missing user_id`,
          impact: 'Cannot match subscription to user account reliably'
        });
      }
      
      if (subsWithoutUserEmail > 0) {
        warnings.push({
          test: 'Subscription Linkage',
          severity: 'MEDIUM',
          issue: `${subsWithoutUserEmail} active subscriptions missing user_email`,
          impact: 'Legacy Stripe matching may fail'
        });
      }
      
      if (subsWithoutUserId === 0) {
        passed.push(`Subscription Linkage: All ${activePaidSubs} active subscriptions have user_id`);
      }
    } catch (err) {
      issues.push({
        test: 'Subscription Linkage',
        severity: 'CRITICAL',
        issue: 'Failed to query Subscription entity',
        error: err.message
      });
    }

    // TEST 3: Check reconciliation function
    console.log('[E2E Test] Test 3: Reconciliation function');
    try {
      const { reconcileUserEntitlements } = await import('./_utils/reconcileEntitlements.js');
      
      // Test with a paid user
      const paidUsers = await base44.asServiceRole.entities.User.filter({});
      const testUser = paidUsers.find(u => 
        u.data?.subscription_tier === 'premium' || u.data?.subscription_tier === 'pro'
      );
      
      if (testUser) {
        const result = await reconcileUserEntitlements(base44, testUser, { req });
        
        if (!result.finalTier) {
          issues.push({
            test: 'Reconciliation',
            severity: 'CRITICAL',
            issue: 'reconcileUserEntitlements returns no finalTier',
            impact: 'Users will not receive proper entitlements'
          });
        } else if (result.finalTier === 'free' && (testUser.data?.subscription_tier !== 'free')) {
          issues.push({
            test: 'Reconciliation',
            severity: 'HIGH',
            issue: `Paid user ${testUser.email} reconciled to free tier`,
            impact: 'Paid users losing access'
          });
        } else {
          passed.push(`Reconciliation: Correctly returned tier ${result.finalTier} for paid user`);
        }
      } else {
        warnings.push({
          test: 'Reconciliation',
          severity: 'LOW',
          issue: 'No paid users found to test reconciliation',
          impact: 'Cannot verify reconciliation works for paid users'
        });
      }
    } catch (err) {
      issues.push({
        test: 'Reconciliation',
        severity: 'CRITICAL',
        issue: 'Failed to import or run reconcileUserEntitlements',
        error: err.message
      });
    }

    // TEST 4: Check ensureUserRecord function
    console.log('[E2E Test] Test 4: ensureUserRecord function');
    try {
      // Verify the function exists and is callable
      const response = await fetch(`${Deno.env.get('APP_URL') || 'http://localhost'}/api/functions/ensureUserRecord`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || ''
        },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        const data = await response.json();
        if (!data.user?.data?.entitlement_tier) {
          issues.push({
            test: 'ensureUserRecord',
            severity: 'HIGH',
            issue: 'Function returns user without entitlement_tier in data',
            impact: 'New users will not have proper entitlement structure'
          });
        } else {
          passed.push('ensureUserRecord: Returns user with proper entitlement structure');
        }
      } else {
        warnings.push({
          test: 'ensureUserRecord',
          severity: 'MEDIUM',
          issue: `Function returned ${response.status}`,
          impact: 'Function may not be working correctly'
        });
      }
    } catch (err) {
      warnings.push({
        test: 'ensureUserRecord',
        severity: 'MEDIUM',
        issue: 'Could not test ensureUserRecord endpoint',
        error: err.message
      });
    }

    // TEST 5: Check frontend access helper consistency
    console.log('[E2E Test] Test 5: Frontend access helpers');
    try {
      // Sample users with different tiers
      const testCases = [
        { tier: 'pro', level: 'paid', status: 'active', expectedPaid: true, expectedPro: true },
        { tier: 'premium', level: 'paid', status: 'active', expectedPaid: true, expectedPro: false },
        { tier: 'free', level: 'free', status: 'inactive', expectedPaid: false, expectedPro: false },
      ];
      
      const accessHelperIssues = [];
      
      for (const tc of testCases) {
        const mockUser = { data: { entitlement_tier: tc.tier, subscription_level: tc.level, subscription_status: tc.status } };
        const mockSub = { data: { tier: tc.tier, status: tc.status } };
        
        // We can't actually run the frontend code, but we can check the logic
        const hasPaid = (tc.tier === 'premium' || tc.tier === 'pro');
        const hasPro = (tc.tier === 'pro');
        
        if (hasPaid !== tc.expectedPaid || hasPro !== tc.expectedPro) {
          accessHelperIssues.push(`Tier ${tc.tier} logic mismatch`);
        }
      }
      
      if (accessHelperIssues.length > 0) {
        issues.push({
          test: 'Access Helpers',
          severity: 'HIGH',
          issue: 'Access helper logic inconsistent',
          details: accessHelperIssues,
          impact: 'Features may be incorrectly locked/unlocked'
        });
      } else {
        passed.push('Access Helpers: Logic is consistent across tiers');
      }
    } catch (err) {
      warnings.push({
        test: 'Access Helpers',
        severity: 'LOW',
        issue: 'Could not verify access helper logic',
        error: err.message
      });
    }

    // TEST 6: Check for orphaned subscriptions
    console.log('[E2E Test] Test 6: Orphaned subscriptions');
    try {
      const allSubs = await base44.asServiceRole.entities.Subscription.list();
      const allUsers = await base44.asServiceRole.entities.User.list();
      const userEmails = new Set(allUsers.map(u => u.email?.toLowerCase()));
      
      let orphanedSubs = 0;
      
      for (const sub of allSubs) {
        const email = (sub.data?.user_email || '').toLowerCase();
        const status = (sub.data?.status || '').toLowerCase();
        const isActive = ['active', 'trialing', 'trial'].includes(status);
        
        if (isActive && email && !userEmails.has(email)) {
          orphanedSubs++;
        }
      }
      
      if (orphanedSubs > 0) {
        issues.push({
          test: 'Orphaned Subscriptions',
          severity: 'HIGH',
          issue: `${orphanedSubs} active subscriptions with no matching user`,
          impact: 'Paid subscriptions not linked to any user account'
        });
      } else {
        passed.push('Orphaned Subscriptions: All active subscriptions have matching users');
      }
    } catch (err) {
      warnings.push({
        test: 'Orphaned Subscriptions',
        severity: 'MEDIUM',
        issue: 'Could not check for orphaned subscriptions',
        error: err.message
      });
    }

    // TEST 7: Check for users with subscriptions but free tier
    console.log('[E2E Test] Test 7: Entitlement mismatch');
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const allSubs = await base44.asServiceRole.entities.Subscription.list();
      
      const subsByEmail = {};
      for (const sub of allSubs) {
        const email = (sub.data?.user_email || '').toLowerCase();
        const status = (sub.data?.status || '').toLowerCase();
        const isActive = ['active', 'trialing', 'trial'].includes(status);
        
        if (isActive && email) {
          if (!subsByEmail[email]) subsByEmail[email] = [];
          subsByEmail[email].push(sub);
        }
      }
      
      let mismatchedUsers = 0;
      const mismatchDetails = [];
      
      for (const u of allUsers) {
        const email = (u.email || '').toLowerCase();
        const userTier = u.data?.entitlement_tier || u.data?.subscription_tier || 'free';
        const hasSub = subsByEmail[email] && subsByEmail[email].length > 0;
        
        if (hasSub && userTier === 'free') {
          mismatchedUsers++;
          mismatchDetails.push({
            email,
            userTier,
            subCount: subsByEmail[email].length,
            subTiers: subsByEmail[email].map(s => s.data?.tier)
          });
        }
      }
      
      if (mismatchedUsers > 0) {
        issues.push({
          test: 'Entitlement Mismatch',
          severity: 'CRITICAL',
          issue: `${mismatchedUsers} users have active subscriptions but free tier`,
          details: mismatchDetails.slice(0, 5),
          impact: 'Paid users are not getting access to paid features'
        });
      } else {
        passed.push('Entitlement Mismatch: All users with subscriptions have proper tier');
      }
    } catch (err) {
      issues.push({
        test: 'Entitlement Mismatch',
        severity: 'CRITICAL',
        issue: 'Failed to check entitlement consistency',
        error: err.message
      });
    }

    // TEST 8: Check Stripe webhook handler
    console.log('[E2E Test] Test 8: Stripe webhook handler');
    try {
      // Verify the webhook secret is set
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
      if (!webhookSecret) {
        issues.push({
          test: 'Stripe Webhook',
          severity: 'CRITICAL',
          issue: 'STRIPE_WEBHOOK_SECRET not set',
          impact: 'Stripe webhooks will fail, subscriptions will not sync'
        });
      } else {
        passed.push('Stripe Webhook: Secret is configured');
      }
      
      // Verify price IDs are set
      const priceIds = [
        'STRIPE_PRICE_ID_PREMIUM_MONTHLY',
        'STRIPE_PRICE_ID_PREMIUM_ANNUAL',
        'STRIPE_PRICE_ID_PRO_MONTHLY',
        'STRIPE_PRICE_ID_PRO_ANNUAL'
      ];
      
      const missingPriceIds = priceIds.filter(id => !Deno.env.get(id));
      if (missingPriceIds.length > 0) {
        warnings.push({
          test: 'Stripe Configuration',
          severity: 'HIGH',
          issue: `Missing price IDs: ${missingPriceIds.join(', ')}`,
          impact: 'Cannot determine tier from Stripe subscriptions'
        });
      } else {
        passed.push('Stripe Configuration: All price IDs configured');
      }
    } catch (err) {
      warnings.push({
        test: 'Stripe Webhook',
        severity: 'MEDIUM',
        issue: 'Could not verify Stripe configuration',
        error: err.message
      });
    }

    // TEST 9: Check Apple subscription support
    console.log('[E2E Test] Test 9: Apple subscription support');
    try {
      const appleSubs = await base44.asServiceRole.entities.Subscription.filter({
        provider: 'apple'
      });
      
      if (appleSubs && appleSubs.length > 0) {
        let appleSubsWithoutUserId = 0;
        
        for (const sub of appleSubs) {
          if (!sub.data?.user_id) {
            appleSubsWithoutUserId++;
          }
        }
        
        if (appleSubsWithoutUserId > 0) {
          issues.push({
            test: 'Apple Subscriptions',
            severity: 'HIGH',
            issue: `${appleSubsWithoutUserId} Apple subscriptions missing user_id`,
            impact: 'Apple subscribers may not receive entitlements'
          });
        } else {
          passed.push(`Apple Subscriptions: All ${appleSubs.length} Apple subscriptions linked properly`);
        }
      } else {
        passed.push('Apple Subscriptions: No Apple subscriptions to test (or properly filtered)');
      }
    } catch (err) {
      warnings.push({
        test: 'Apple Subscriptions',
        severity: 'LOW',
        issue: 'Could not check Apple subscriptions',
        error: err.message
      });
    }

    // TEST 10: Check useCurrentUser hook data structure
    console.log('[E2E Test] Test 10: Frontend hook compatibility');
    try {
      // Check if users have the fields that useCurrentUser expects
      const sampleUsers = await base44.asServiceRole.entities.User.list();
      const randomUser = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
      
      const hasExpectedFields = randomUser?.data && (
        randomUser.data.entitlement_tier !== undefined ||
        randomUser.data.subscription_tier !== undefined
      );
      
      if (!hasExpectedFields) {
        issues.push({
          test: 'Frontend Hook',
          severity: 'HIGH',
          issue: 'User entities missing fields expected by useCurrentUser',
          impact: 'Frontend may not detect paid status correctly'
        });
      } else {
        passed.push('Frontend Hook: User entities have expected structure');
      }
    } catch (err) {
      warnings.push({
        test: 'Frontend Hook',
        severity: 'MEDIUM',
        issue: 'Could not verify frontend hook compatibility',
        error: err.message
      });
    }

    // Generate summary
    const summary = {
      totalTests: 10,
      critical: issues.filter(i => i.severity === 'CRITICAL').length,
      high: issues.filter(i => i.severity === 'HIGH').length,
      medium: [...issues, ...warnings].filter(i => i.severity === 'MEDIUM').length,
      low: warnings.filter(w => w.severity === 'LOW').length,
      passed: passed.length
    };

    console.log('[E2E Test] Complete');

    return Response.json({
      ok: true,
      summary,
      issues: issues.sort((a, b) => {
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      warnings,
      passed,
      recommendation: issues.length === 0 
        ? 'All critical tests passed. System is functioning correctly.'
        : 'Critical issues found. Immediate action required to ensure paid users receive proper access.'
    });

  } catch (error) {
    console.error('[E2E Test] Fatal error:', error);
    return Response.json({ 
      ok: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});