// Runtime guard: Enforce Deno environment
if (typeof Deno?.serve !== "function") {
  throw new Error("FATAL: Invalid runtime - Base44 requires Deno.serve");
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getStripeClient, stripeSanityCheck, safeStripeError } from "./_utils/stripe.js";

const normEmail = (email) => String(email || "").trim().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ 
        ok: false, 
        error: 'FORBIDDEN',
        message: 'Admin access required'
      }, { status: 403 });
    }

    // Initialize Stripe with validation
    let stripe;
    try {
      stripe = getStripeClient();
      await stripeSanityCheck(stripe);
    } catch (e) {
      return Response.json({
        ok: false,
        error: "STRIPE_INIT_FAILED",
        message: safeStripeError(e)
      }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false;
    const batchSize = Math.min(body.batchSize || 500, 1000);

    let scanned = 0;
    let skippedApple = 0;
    let linked = 0;
    let usersCreated = 0;
    let usersUpdated = 0;
    let noAuthUser = 0;
    let conflicts = 0;

    const samples = {
      linked: [] as any[],
      created: [] as any[],
      noAuth: [] as any[]
    };
    const errors: string[] = [];

    const allSubs = await base44.asServiceRole.entities.Subscription.list('-created_date', batchSize);
    
    const authUserByEmail = new Map();
    try {
      const authUsers = await base44.asServiceRole.auth.listUsers?.() || [];
      authUsers.forEach((u: any) => {
        if (u.email) {
          authUserByEmail.set(normEmail(u.email), u);
        }
      });
    } catch (e: any) {
      errors.push(`Could not list auth users: ${e?.message}`);
    }
    
    const allEntityUsers = await base44.asServiceRole.entities.User.list();
    const entityUserByEmail = new Map();
    allEntityUsers.forEach((u: any) => {
      if (u.email) {
        entityUserByEmail.set(normEmail(u.email), u);
      }
    });

    for (const sub of allSubs) {
      scanned++;

      if (sub.provider === 'apple') {
        skippedApple++;
        continue;
      }

      if (sub.user_id) {
        continue;
      }

      const emailRaw = sub.user_email;
      if (!emailRaw) {
        continue;
      }

      const emailLower = normEmail(emailRaw);

      let authUserId = null;
      const authUserFromMap = authUserByEmail.get(emailLower);
      if (authUserFromMap?.id) {
        authUserId = authUserFromMap.id;
      }
      
      if (!authUserId) {
        try {
          const authUserDirect = await base44.asServiceRole.auth.getUserByEmail?.(emailLower);
          if (authUserDirect?.id) {
            authUserId = authUserDirect.id;
            authUserByEmail.set(emailLower, authUserDirect);
          }
        } catch (e) {
          // No auth user
        }
      }
      
      if (!authUserId) {
        noAuthUser++;
        if (samples.noAuth.length < 10) {
          samples.noAuth.push({ email: emailLower, sub_id: sub.id });
        }
        continue;
      }

      linked++;
      if (samples.linked.length < 10) {
        samples.linked.push({
          sub_id: sub.id,
          auth_user_id: authUserId,
          email: emailLower
        });
      }

      if (!dryRun) {
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          user_id: authUserId,
          user_email: emailLower,
          provider: sub.provider || 'stripe',
          provider_subscription_id: sub.stripe_subscription_id || sub.provider_subscription_id
        });

        let entityUser = entityUserByEmail.get(emailLower);
        
        if (!entityUser) {
          const newEntityUser = await base44.asServiceRole.entities.User.create({
            email: emailLower,
            full_name: `User ${emailLower}`,
            role: 'user',
            subscription_level: 'paid',
            platform: 'web'
          });
          entityUser = newEntityUser;
          entityUserByEmail.set(emailLower, newEntityUser);
          usersCreated++;
          if (samples.created.length < 10) {
            samples.created.push({ email: emailLower, entity_user_id: newEntityUser.id });
          }
        }
        
        const isPaid = sub.status === 'active' || sub.status === 'trialing';
        await base44.asServiceRole.entities.User.update(entityUser.id, {
          subscription_level: isPaid ? 'paid' : 'free',
          subscription_status: sub.status,
          stripe_customer_id: sub.stripe_customer_id || entityUser.stripe_customer_id
        });
        usersUpdated++;
      }
    }

    return Response.json({
      ok: true,
      dryRun,
      scanned,
      skippedApple,
      linked,
      usersCreated,
      usersUpdated,
      noAuthUser,
      conflicts,
      errors,
      samples
    });
  } catch (error) {
    return Response.json({ 
      ok: false,
      error: "MIGRATION_FAILED",
      message: safeStripeError(error)
    }, { status: 500 });
  }
});