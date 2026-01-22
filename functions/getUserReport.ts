import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireEntitlement } from './_auth/requireEntitlement.js';

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

    // Create a map of user email to best subscription (filter out incomplete)
    const subscriptionMap = new Map();
    
    // Group subscriptions by user email
    const subsByEmail = new Map();
    allSubscriptions.forEach(sub => {
      const email = sub.user_email;
      if (!subsByEmail.has(email)) {
        subsByEmail.set(email, []);
      }
      subsByEmail.get(email).push(sub);
    });
    
    // Pick best subscription for each user (ignore incomplete/incomplete_expired)
    subsByEmail.forEach((subs, email) => {
      const validSubs = subs.filter(s => {
        const status = (s.status || '').toLowerCase();
        return status !== 'incomplete' && status !== 'incomplete_expired';
      });
      
      if (validSubs.length === 0) return;
      
      // Rank: active > trialing > past_due > others
      const rank = (s) => {
        const st = (s.status || '').toLowerCase();
        if (st === 'active') return 5;
        if (st === 'trialing') return 4;
        if (st === 'past_due') return 3;
        return 2;
      };
      
      const best = validSubs.sort((a, b) => {
        const rDiff = rank(b) - rank(a);
        if (rDiff !== 0) return rDiff;
        
        const ea = new Date(a.current_period_end || 0).getTime();
        const eb = new Date(b.current_period_end || 0).getTime();
        return eb - ea;
      })[0];
      
      subscriptionMap.set(email, best);
    });

    // Categorize users
    const paidUsers = [];
    const freeUsers = [];

    allUsers.forEach(user => {
      const subscription = subscriptionMap.get(user.email);
      
      // Check if subscription grants premium access
      // 1. Check Subscription entity first
      let isPaid = subscription && 
        (subscription.status === 'active' || subscription.status === 'trialing') &&
        (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());
      
      // 2. Fallback to User entity fields (set by webhook)
      if (!isPaid && user.subscription_level === 'paid') {
        isPaid = true;
      }

      const userData = {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_date: user.created_date,
        subscription_status: subscription?.status || user.subscription_status || 'none',
        subscription_end: subscription?.current_period_end || null,
        billing_interval: subscription?.billing_interval || null
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