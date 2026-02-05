import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';


Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run this
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get all subscriptions for this email
    const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
      user_email: email.toLowerCase().trim()
    });

    // Get user record if exists
    const users = await base44.asServiceRole.entities.User.filter({
      email: email.toLowerCase().trim()
    });

    const userRecord = users.length > 0 ? users[0] : null;

    // Analyze subscription status
    const analysis = {
      email,
      userFound: !!userRecord,
      userId: userRecord?.id,
      subscriptionsCount: subscriptions.length,
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        provider: sub.provider,
        status: sub.status,
        tier: sub.tier,
        trialEndDate: sub.trial_end_date,
        currentPeriodEnd: sub.current_period_end,
        createdDate: sub.created_date,
        updatedDate: sub.updated_date
      })),
      activeSubscriptions: subscriptions.filter(s => 
        ['active', 'trialing'].includes(s.status)
      ).length,
      isPro: subscriptions.some(s => s.tier === 'pro' && ['active', 'trialing'].includes(s.status)),
      isPremium: subscriptions.some(s => s.tier === 'premium' && ['active', 'trialing'].includes(s.status)),
      recommendation: null
    };

    // Generate recommendation
    if (analysis.activeSubscriptions === 0 && analysis.subscriptionsCount > 0) {
      analysis.recommendation = 'User has past subscriptions but none are active. Check if subscription cancellation/expiry occurred unintentionally.';
    } else if (analysis.subscriptionsCount === 0) {
      analysis.recommendation = 'No subscription records found. User may need to restart subscription or subscription sync failed.';
    } else if (analysis.activeSubscriptions > 0) {
      analysis.recommendation = 'Active subscription(s) found. User should have access.';
    }

    return Response.json({ success: true, analysis });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});