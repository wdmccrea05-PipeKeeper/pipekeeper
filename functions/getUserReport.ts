import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireEntitlement } from './_auth/requireEntitlement.ts';

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only access
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all users and subscriptions
    const [allUsers, allSubscriptions] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Subscription.list()
    ]);

    // Create a map of normalized user email to best subscription (filter out incomplete_expired)
    const subscriptionMap = new Map();
    
    // Group subscriptions by normalized user email
    const subsByEmail = new Map();
    allSubscriptions.forEach(sub => {
      const email = normEmail(sub.user_email);
      if (!subsByEmail.has(email)) {
        subsByEmail.set(email, []);
      }
      subsByEmail.get(email).push(sub);
    });
    
    // Pick best subscription for each user (ignore only incomplete_expired)
    subsByEmail.forEach((subs, email) => {
      // Filter out incomplete_expired only
      const validSubs = subs.filter(s => {
        const status = (s.data?.status || s.status || '').toLowerCase();
        return status !== 'incomplete_expired';
      });
      
      if (validSubs.length === 0) return;
      
      // Rank: active > trialing > incomplete > past_due > others
      const rank = (s) => {
        const st = (s.data?.status || s.status || '').toLowerCase();
        if (st === 'active') return 5;
        if (st === 'trialing') return 4;
        if (st === 'incomplete') return 3;
        if (st === 'past_due') return 2;
        return 1;
      };
      
      // Sort and pick best
      const best = [...validSubs].sort((a, b) => {
        const rDiff = rank(b) - rank(a);
        if (rDiff !== 0) return rDiff;
        
        // If same rank, pick newest by created_date
        const ca = new Date(a.created_date || 0).getTime();
        const cb = new Date(b.created_date || 0).getTime();
        return cb - ca;
      })[0];
      
      subscriptionMap.set(email, best);
    });

    // Categorize users
    const paidUsers = [];
    const freeUsers = [];

    allUsers.forEach(user => {
      const email = normEmail(user.email);
      const subscription = subscriptionMap.get(email);
      
      // Check if subscription grants premium access
      // 1. Check Subscription entity first
      const subStatus = subscription?.data?.status || subscription?.status;
      const subPeriodEnd = subscription?.data?.current_period_end || subscription?.current_period_end;
      let isPaid = subscription && 
        (subStatus === 'active' || subStatus === 'trialing' || subStatus === 'incomplete') &&
        (!subPeriodEnd || new Date(subPeriodEnd) > new Date());
      
      // 2. Fallback to User entity fields (for Apple IAP or webhook-synced users)
      if (!isPaid && user.subscription_level === 'paid') {
        isPaid = true;
      }

      const userData = {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        platform: user.platform || 'unknown',
        created_date: user.created_date,
        subscription_status: subscription?.data?.status || subscription?.status || user.subscription_status || 'none',
        subscription_end: subscription?.data?.current_period_end || subscription?.current_period_end || null,
        billing_interval: subscription?.data?.billing_interval || subscription?.billing_interval || null
      };

      if (isPaid) {
        paidUsers.push(userData);
      } else {
        freeUsers.push(userData);
      }
    });

    return Response.json({
      summary: {
        total_users: allUsers.length,
        paid_users: paidUsers.length,
        free_users: freeUsers.length,
        paid_percentage: ((paidUsers.length / allUsers.length) * 100).toFixed(1)
      },
      paid_users: paidUsers.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
      free_users: freeUsers.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});