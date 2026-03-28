import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Use small page size - SDK serializes large responses as strings causing issues
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

    const allProfiles = await fetchAll(base44.asServiceRole.entities.UserProfile);
    const allSubscriptions = await fetchAll(base44.asServiceRole.entities.Subscription);
    const allUsers = await fetchAll(base44.asServiceRole.entities.User);
    const userByEmail = new Map();
    allUsers.forEach(u => {
      if (u.email) userByEmail.set(normEmail(u.email), u);
    });

    const subscriptionMap = new Map();
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

    const processSubs = (subs, key) => {
      const validSubs = subs.filter(s => {
        const status = (s.status || '').toLowerCase();
        return status !== 'incomplete_expired';
      });
      if (validSubs.length === 0) return;

      const rank = (s) => {
        const st = (s.status || '').toLowerCase();
        if (st === 'active') return 5;
        if (st === 'trialing') return 4;
        if (st === 'incomplete') return 3;
        if (st === 'past_due') return 2;
        return 1;
      };

      const best = [...validSubs].sort((a, b) => {
        const rDiff = rank(b) - rank(a);
        if (rDiff !== 0) return rDiff;
        const tierA = (a.tier || '').toLowerCase();
        const tierB = (b.tier || '').toLowerCase();
        if (tierB === 'pro' && tierA !== 'pro') return 1;
        if (tierA === 'pro' && tierB !== 'pro') return -1;
        const ca = new Date(a.created_date || 0).getTime();
        const cb = new Date(b.created_date || 0).getTime();
        return cb - ca;
      })[0];

      subscriptionMap.set(key, best);
    };

    subsByUserId.forEach(processSubs);
    subsByEmail.forEach(processSubs);

    const paidUsers = [];
    const freeUsers = [];

    // Deduplicate profiles by email (keep the earliest created)
    const seenEmails = new Set();
    const uniqueProfiles = allProfiles.filter(profile => {
      const email = normEmail(profile.user_email || profile.created_by);
      if (!email || seenEmails.has(email)) return false;
      seenEmails.add(email);
      return true;
    });

    // Iterate over UserProfile records — these ARE the app's users
    // user_email may be empty; fall back to created_by (platform-populated auth email)
    uniqueProfiles.forEach(profile => {
      const email = normEmail(profile.user_email || profile.created_by);
      if (!email) return;

      const u = userByEmail.get(email) || {};
      const subscription = subscriptionMap.get(u.id) || subscriptionMap.get(email);

      let isPaid = false;
      let effectiveStatus = 'none';
      let effectiveTier = 'none';

      if (subscription) {
        const subStatus = (subscription.status || '').toLowerCase();
        const subTier = subscription.tier || 'premium';
        const subPeriodEnd = subscription.current_period_end;
        const isActiveStatus = ['active', 'trialing', 'trial', 'incomplete'].includes(subStatus);
        const notExpired = !subPeriodEnd || new Date(subPeriodEnd) > new Date();
        if (isActiveStatus && notExpired) {
          isPaid = true;
          effectiveStatus = subscription.status;
          effectiveTier = subTier;
        } else {
          effectiveStatus = subscription.status;
        }
      }

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
        email: email,
        full_name: u.full_name || profile.display_name || '',
        role: u.role || 'user',
        platform: u.data?.platform || u.platform || 'web',
        created_date: profile.created_date || u.created_date,
        subscription_status: effectiveStatus,
        subscription_tier: effectiveTier,
        subscription_end: subscription?.current_period_end || null,
        billing_interval: subscription?.billing_interval || null
      };

      if (isPaid) {
        paidUsers.push(userData);
      } else {
        freeUsers.push(userData);
      }
    });

    const totalUsers = uniqueProfiles.length;
    const paidCount = paidUsers.length;
    const freeCount = freeUsers.length;
    const paidPercentage = totalUsers === 0 ? '0.0' : ((paidCount / totalUsers) * 100).toFixed(1);

    const sortedPaid = paidUsers.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    const sortedFree = freeUsers.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    return Response.json({
      summary: { total_users: totalUsers, paid_users: paidCount, free_users: freeCount, paid_percentage: paidPercentage },
      paid_users: sortedPaid,
      free_users: sortedFree,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});