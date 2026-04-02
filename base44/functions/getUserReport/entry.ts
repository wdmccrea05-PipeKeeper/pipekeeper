import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const PAGE = 50;
    const fetchAll = async (entity) => {
      const results = [];
      let skip = 0;
      while (true) {
        let page = await entity.list(null, PAGE, skip);
        if (typeof page === 'string') {
          try { page = JSON.parse(page); } catch { break; }
        }
        if (!Array.isArray(page) || page.length === 0) break;
        results.push(...page);
        if (page.length < PAGE) break;
        skip += PAGE;
      }
      return results;
    };

    const [allUsers, allSubscriptions] = await Promise.all([
      fetchAll(base44.asServiceRole.entities.User),
      fetchAll(base44.asServiceRole.entities.Subscription),
    ]);

    // Build subscription lookup maps
    const subsByEmail = new Map();
    const subsByUserId = new Map();

    allSubscriptions.forEach(sub => {
      if (sub.user_id) {
        if (!subsByUserId.has(sub.user_id)) subsByUserId.set(sub.user_id, []);
        subsByUserId.get(sub.user_id).push(sub);
      }
      if (sub.user_email) {
        const email = normEmail(sub.user_email);
        if (!subsByEmail.has(email)) subsByEmail.set(email, []);
        subsByEmail.get(email).push(sub);
      }
    });

    const rankSub = (s) => {
      const st = (s.status || '').toLowerCase();
      if (st === 'active') return 5;
      if (st === 'trialing' || st === 'trial') return 4;
      if (st === 'incomplete') return 3;
      if (st === 'past_due') return 2;
      return 1;
    };

    const pickBestSub = (subs) => {
      const valid = subs.filter(s => {
        const st = (s.status || '').toLowerCase();
        return st !== 'incomplete_expired';
      });
      if (!valid.length) return null;
      return [...valid].sort((a, b) => {
        const rDiff = rankSub(b) - rankSub(a);
        if (rDiff !== 0) return rDiff;
        const tierA = (a.tier || '').toLowerCase();
        const tierB = (b.tier || '').toLowerCase();
        if (tierB === 'pro' && tierA !== 'pro') return 1;
        if (tierA === 'pro' && tierB !== 'pro') return -1;
        return new Date(b.created_date || 0) - new Date(a.created_date || 0);
      })[0];
    };

    // Build subscription map per user (by id or email)
    const subscriptionMap = new Map();
    subsByUserId.forEach((subs, uid) => {
      const best = pickBestSub(subs);
      if (best) subscriptionMap.set(uid, best);
    });
    subsByEmail.forEach((subs, email) => {
      if (!subscriptionMap.has(email)) {
        const best = pickBestSub(subs);
        if (best) subscriptionMap.set(email, best);
      }
    });

    const paidUsers = [];
    const freeUsers = [];

    // Deduplicate users by email
    const seenEmails = new Set();
    const uniqueUsers = allUsers.filter(u => {
      const email = normEmail(u.email);
      if (!email || seenEmails.has(email)) return false;
      seenEmails.add(email);
      return true;
    });

    uniqueUsers.forEach(u => {
      const email = normEmail(u.email);
      if (!email) return;

      const subscription = subscriptionMap.get(u.id) || subscriptionMap.get(email);

      let isPaid = false;
      let effectiveStatus = 'none';
      let effectiveTier = 'none';

      if (subscription) {
        const subStatus = (subscription.status || '').toLowerCase();
        const notExpired = !subscription.current_period_end || new Date(subscription.current_period_end) > new Date();
        const isActiveStatus = ['active', 'trialing', 'trial', 'incomplete'].includes(subStatus);
        if (isActiveStatus && notExpired) {
          isPaid = true;
          effectiveStatus = subscription.status;
          effectiveTier = subscription.tier || 'premium';
        } else {
          effectiveStatus = subscription.status;
        }
      }

      // Fallback: check user.data entitlement fields
      if (!isPaid && u.data) {
        const entitlementTier = (u.data.entitlement_tier || '').toLowerCase();
        const subscriptionTier = (u.data.subscription_tier || '').toLowerCase();
        if (['premium', 'pro'].includes(entitlementTier)) {
          isPaid = true;
          effectiveTier = entitlementTier;
          effectiveStatus = u.data.subscription_status || 'active';
        } else if (!entitlementTier && ['premium', 'pro'].includes(subscriptionTier)) {
          isPaid = true;
          effectiveTier = subscriptionTier;
          effectiveStatus = u.data.subscription_status || 'active';
        }
      }

      const userData = {
        email,
        full_name: u.full_name || '',
        role: u.role || 'user',
        platform: u.data?.platform || u.platform || 'web',
        created_date: u.created_date,
        subscription_status: effectiveStatus,
        subscription_tier: effectiveTier,
        subscription_end: subscription?.current_period_end || null,
        billing_interval: subscription?.billing_interval || null,
      };

      if (isPaid) {
        paidUsers.push(userData);
      } else {
        freeUsers.push(userData);
      }
    });

    const totalUsers = uniqueUsers.length;
    const paidCount = paidUsers.length;
    const freeCount = freeUsers.length;
    const paidPercentage = totalUsers === 0 ? '0.0' : ((paidCount / totalUsers) * 100).toFixed(1);

    const premiumCount = paidUsers.filter(u => (u.subscription_tier || '').toLowerCase() !== 'pro').length;
    const proCount = paidUsers.filter(u => (u.subscription_tier || '').toLowerCase() === 'pro').length;

    return Response.json({
      summary: { total_users: totalUsers, paid_users: paidCount, free_users: freeCount, paid_percentage: paidPercentage, premium_users: premiumCount, pro_users: proCount },
      paid_users: paidUsers.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()),
      free_users: freeUsers.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});