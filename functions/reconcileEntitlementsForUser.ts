import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const getStripeClient = () => {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  const Stripe = (await import("npm:stripe@18.0.0")).default;
  return new Stripe(key);
};

const normEmail = (email) => String(email || "").trim().toLowerCase();

async function reconcileFromStripe(base44, user, stripe) {
  const email = normEmail(user.email);
  let customerId = user.stripe_customer_id || null;

  if (!customerId) {
    try {
      const customers = await stripe.customers.list({ email, limit: 1 });
      customerId = customers.data?.[0]?.id || null;
      if (customerId) {
        user.stripe_customer_id = customerId;
      }
    } catch (err) {
      console.error(`[reconcile] Stripe customer lookup failed:`, err);
      return null;
    }
  }

  if (!customerId) {
    return null;
  }

  let subscriptions;
  try {
    subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
  } catch (err) {
    console.error(`[reconcile] Stripe subscriptions list failed:`, err);
    return null;
  }

  const activeSub = subscriptions.data
    .filter((s) => s.status === "active" || s.status === "trialing")
    .sort((a, b) => {
      const rankA = a.status === "active" ? 2 : 1;
      const rankB = b.status === "active" ? 2 : 1;
      return rankB - rankA;
    })[0];

  if (!activeSub) {
    return null;
  }

  const priceId = activeSub.items?.data?.[0]?.price?.id;
  const proMonthly = Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY");
  const proAnnual = Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL");
  const tier = (priceId === proMonthly || priceId === proAnnual) ? "pro" : "premium";

  return {
    ok: true,
    userId: user.id,
    email,
    source: "stripe",
    subscription_level: "paid",
    subscription_status: activeSub.status,
    subscription_tier: tier,
    updated: false,
    details: `Stripe subscription ${activeSub.id}`,
  };
}

async function reconcileFromApple(base44, user) {
  const email = normEmail(user.email);

  const appleSubs = await base44.asServiceRole.entities.Subscription.filter({
    user_id: user.id,
    provider: "apple",
    status: "active",
  });

  const activeSub = appleSubs?.[0];
  if (!activeSub) {
    return null;
  }

  return {
    ok: true,
    userId: user.id,
    email,
    source: "apple",
    subscription_level: "paid",
    subscription_status: "active",
    subscription_tier: activeSub.tier || "premium",
    updated: false,
    details: `Apple subscription ${activeSub.provider_subscription_id}`,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();

    if (!caller?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = body.userId || null;
    const targetCustomerId = body.stripeCustomerId || body.stripe_customer_id || null;
    const rawEmail = body.email || body.userEmail || caller.email;
    const targetEmail = normEmail(rawEmail);

    const isAdmin = caller.role === "admin";
    if (!isAdmin && targetEmail !== normEmail(caller.email) && !targetUserId && !targetCustomerId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    let user;

    // NOTE: Base44 SDK has a bug where User.filter() with asServiceRole returns wrong user.
    // Workaround: invoke debugUserFiltering to get correct user via admin token verification.
    if (targetCustomerId || targetUserId) {
      try {
        const debugRes = await base44.asServiceRole.functions.invoke('debugUserFiltering', {
          stripeCustomerId: targetCustomerId,
          userId: targetUserId,
        });

        const debugData = debugRes.data?.tests || {};
        if (targetCustomerId && debugData.byCustomerId?.users?.length > 0) {
          const foundUser = debugData.byCustomerId.users[0];
          // Manually reconstruct user object with the correct data
          const allUsers = debugData.allUsers?.users || [];
          user = allUsers.find((u) => u.id === foundUser.id) || foundUser;
        } else if (targetUserId && debugData.byId?.users?.length > 0) {
          user = debugData.byId.users[0];
        }
      } catch (err) {
        console.warn('[REC] Workaround failed, falling back to direct query:', err);
      }
    }

    // Fallback to direct query if workaround didn't work
    if (!user) {
      if (targetUserId) {
        const users = await base44.asServiceRole.entities.User.filter({ id: targetUserId });
        user = users?.[0];
      } else if (targetCustomerId) {
        const users = await base44.asServiceRole.entities.User.filter({ stripe_customer_id: targetCustomerId });
        user = users?.[0];
      } else {
        const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
        user = users?.[0];
      }
    }

    if (!user) {
      return Response.json({ error: `User not found: ${targetEmail || targetUserId || targetCustomerId}` }, { status: 404 });
    }

    console.log("[REC] Working with user:", user.email, "ID:", user.id);

    let result = null;

    if (user.platform === "ios") {
      result = await reconcileFromApple(base44, user);
    }

    if (!result) {
      const stripe = getStripeClient();
      result = await reconcileFromStripe(base44, user, stripe);
    }

    if (!result) {
      result = {
        ok: true,
        userId: user.id,
        email: user.email,
        source: "none",
        subscription_level: "free",
        subscription_status: "none",
        subscription_tier: null,
        updated: false,
        details: "No active subscription found",
      };
    }

    const needsUpdate =
      user.subscription_level !== result.subscription_level ||
      user.subscription_status !== result.subscription_status ||
      user.subscription_tier !== result.subscription_tier;

    if (needsUpdate) {
      await base44.asServiceRole.entities.User.update(user.id, {
        subscription_level: result.subscription_level,
        subscription_status: result.subscription_status,
        subscription_tier: result.subscription_tier,
      });
      result.updated = true;
      console.log(`[REC] Updated ${result.email}: ${result.source} → tier=${result.subscription_tier}`);
    }

    return Response.json(result);
  } catch (error) {
    console.error("[REC] Error:", error);
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
});