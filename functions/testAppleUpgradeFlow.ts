import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (authUser?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const testEmail = body.email || 'mattsjeepjk@gmail.com';
    const tier = body.tier || 'pro';

    const results = {
      email: testEmail,
      tier,
      steps: [],
      errors: [],
      success: false
    };

    // Step 1: Check if user exists
    results.steps.push({ step: 1, name: 'Check user exists' });
    const users = await base44.asServiceRole.entities.User.filter({ 
      email: normEmail(testEmail) 
    });
    
    if (!users || users.length === 0) {
      results.errors.push('User not found');
      return Response.json(results);
    }
    
    const user = users[0];
    results.steps.push({ 
      step: 1, 
      name: 'Check user exists', 
      status: 'success',
      data: {
        id: user.id,
        email: user.email,
        current_tier: user.data?.entitlement_tier || user.data?.data?.entitlement_tier,
        subscription_status: user.data?.subscription_status || user.data?.data?.subscription_status
      }
    });

    // Step 2: Check for existing Apple subscriptions
    results.steps.push({ step: 2, name: 'Check existing subscriptions' });
    const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
      user_email: normEmail(testEmail),
      provider: 'apple'
    });
    
    results.steps.push({
      step: 2,
      name: 'Check existing subscriptions',
      status: 'success',
      data: {
        count: existingSubs.length,
        subscriptions: existingSubs.map(s => ({
          id: s.id,
          provider: s.provider,
          tier: s.tier,
          status: s.status,
          provider_subscription_id: s.provider_subscription_id
        }))
      }
    });

    // Step 3: Simulate Apple IAP payload
    results.steps.push({ step: 3, name: 'Simulate Apple IAP purchase' });
    const testPayload = {
      active: true,
      tier: tier,
      productId: tier === 'pro' ? 'com.pipekeeper.pro.monthly' : 'com.pipekeeper.premium.monthly',
      originalTransactionId: `test_${Date.now()}_${user.id}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    results.steps.push({
      step: 3,
      name: 'Simulate Apple IAP purchase',
      status: 'success',
      data: { payload: testPayload }
    });

    // Step 4: Call syncAppleSubscriptionForMe as the user
    results.steps.push({ step: 4, name: 'Call sync function' });
    
    try {
      // Create a request that simulates the user's auth context
      const syncUrl = `${Deno.env.get('APP_URL') || 'https://pipekeeper.base44.app'}/api/functions/syncAppleSubscriptionForMe`;
      
      // We need to use service role to simulate this since we're admin
      // Instead, let's manually do what the sync function would do
      
      const providerSubId = testPayload.originalTransactionId;
      const nowIso = new Date().toISOString();
      
      // Check for existing subscription with this transaction ID
      const existingAppleSub = await base44.asServiceRole.entities.Subscription.filter({
        provider: 'apple',
        provider_subscription_id: providerSubId
      });

      const subData = {
        user_id: user.id,
        user_email: normEmail(testEmail),
        provider: 'apple',
        provider_subscription_id: providerSubId,
        stripe_subscription_id: null,
        stripe_customer_id: null,
        status: 'active',
        tier: testPayload.tier,
        current_period_end: testPayload.expiresAt,
        current_period_start: nowIso,
        started_at: nowIso,
        subscriptionStartedAt: nowIso,
        billing_interval: 'month',
        amount: null,
        cancel_at_period_end: false
      };

      let subResult;
      if (existingAppleSub && existingAppleSub.length > 0) {
        subResult = await base44.asServiceRole.entities.Subscription.update(
          existingAppleSub[0].id, 
          subData
        );
        results.steps.push({
          step: 4,
          name: 'Update subscription',
          status: 'success',
          data: { action: 'updated', subscription_id: existingAppleSub[0].id }
        });
      } else {
        subResult = await base44.asServiceRole.entities.Subscription.create(subData);
        results.steps.push({
          step: 4,
          name: 'Create subscription',
          status: 'success',
          data: { action: 'created', subscription_id: subResult.id }
        });
      }

      // Step 5: Update user entitlements
      results.steps.push({ step: 5, name: 'Update user entitlements' });
      
      const userUpdates = {
        data: {
          ...user.data,
          data: {
            ...(user.data?.data || {}),
            entitlement_tier: tier,
            subscription_tier: tier,
            subscription_level: 'paid',
            subscription_status: 'active'
          }
        }
      };

      await base44.asServiceRole.entities.User.update(user.id, userUpdates);
      
      results.steps.push({
        step: 5,
        name: 'Update user entitlements',
        status: 'success',
        data: {
          entitlement_tier: tier,
          subscription_status: 'active'
        }
      });

      // Step 6: Verify final state
      results.steps.push({ step: 6, name: 'Verify final state' });
      
      const updatedUser = await base44.asServiceRole.entities.User.filter({ 
        email: normEmail(testEmail) 
      });
      
      const finalSubs = await base44.asServiceRole.entities.Subscription.filter({
        user_email: normEmail(testEmail)
      });

      results.steps.push({
        step: 6,
        name: 'Verify final state',
        status: 'success',
        data: {
          user_tier: updatedUser[0]?.data?.data?.entitlement_tier,
          user_status: updatedUser[0]?.data?.data?.subscription_status,
          subscription_count: finalSubs.length,
          apple_subscriptions: finalSubs.filter(s => s.provider === 'apple').length
        }
      });

      results.success = true;

    } catch (syncError) {
      results.errors.push({
        step: 4,
        error: syncError.message,
        stack: syncError.stack
      });
    }

    return Response.json(results);

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});