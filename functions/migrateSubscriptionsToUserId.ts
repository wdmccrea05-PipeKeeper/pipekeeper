import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from "npm:stripe@17.5.0";

const normEmail = (email: string) => String(email || "").trim().toLowerCase();

function getStripeKeyPrefix() {
  const key = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();
  if (!key) return "missing";
  if (key.startsWith("sk_")) return "sk";
  if (key.startsWith("rk_")) return "rk";
  if (key.startsWith("mk_")) return "mk";
  if (key.startsWith("pk_")) return "pk";
  return "other";
}

function maskError(msg: string) {
  return String(msg).replace(/(sk|rk|pk|mk)_[A-Za-z0-9_]+/g, (m) => `${m.slice(0, 4)}…${m.slice(-4)}`);
}

export default async (req: Request) => {
  const keyPrefix = getStripeKeyPrefix();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'FORBIDDEN',
        keyPrefix 
      }), {
        status: 403,
        headers: { "content-type": "application/json" }
      });
    }

    // Validate Stripe before proceeding
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
    if (!stripeKey || (keyPrefix !== "sk" && keyPrefix !== "rk")) {
      return new Response(JSON.stringify({
        ok: false,
        error: "STRIPE_SECRET_KEY_INVALID",
        keyPrefix,
        message: "STRIPE_SECRET_KEY must start with sk_ or rk_"
      }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // HARD STOP: Verify Stripe auth
    try {
      await stripe.balance.retrieve();
    } catch (e) {
      return new Response(JSON.stringify({
        ok: false,
        error: "STRIPE_AUTH_FAILED",
        keyPrefix,
        stripeSanityOk: false,
        message: "Stripe authentication failed. Migration requires valid Stripe access.",
        details: maskError(String(e?.message || e))
      }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false;
    const limit = Math.min(body.limit || 500, 1000);

    let scanned = 0;
    let skippedApple = 0;
    let normalizedEmails = 0;
    let usersCreated = 0;
    let subsLinkedToUserId = 0;
    let usersUpdated = 0;
    let noAuthUser = 0;
    let conflicts = 0;

    const createdUsers: any[] = [];
    const linkedSubs: any[] = [];
    const noAuthUserRecords: any[] = [];
    const errors: string[] = [];

    const allSubs = await base44.asServiceRole.entities.Subscription.list('-created_date', limit);
    
    const authUserByEmail = new Map();
    try {
      const authUsers = await base44.asServiceRole.auth.listUsers?.() || [];
      authUsers.forEach((u: any) => {
        if (u.email) {
          authUserByEmail.set(normEmail(u.email), u);
        }
      });
    } catch (e) {
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

      if (emailRaw !== emailLower) {
        normalizedEmails++;
        if (!dryRun) {
          await base44.asServiceRole.entities.Subscription.update(sub.id, {
            user_email: emailLower
          });
        }
      }

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
        if (noAuthUserRecords.length < 10) {
          noAuthUserRecords.push({ email: emailLower, sub_id: sub.id });
        }
        continue;
      }

      subsLinkedToUserId++;
      if (linkedSubs.length < 10) {
        linkedSubs.push({
          sub_id: sub.id,
          auth_user_id: authUserId,
          email: emailLower
        });
      }

      if (!dryRun) {
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          user_id: authUserId,
          user_email: emailLower,
          provider: 'stripe',
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
          if (createdUsers.length < 10) {
            createdUsers.push({ email: emailLower, entity_user_id: newEntityUser.id });
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

    return new Response(JSON.stringify({
      ok: true,
      keyPrefix,
      stripeSanityOk: true,
      dryRun,
      scanned,
      skippedApple,
      normalizedEmails,
      usersCreated,
      subsLinkedToUserId,
      usersUpdated,
      noAuthUser,
      conflicts,
      errors,
      samples: {
        createdUsers: createdUsers.slice(0, 10),
        linkedSubs: linkedSubs.slice(0, 10),
        noAuthUserRecords: noAuthUserRecords.slice(0, 10)
      }
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      ok: false,
      error: "MIGRATION_FAILED",
      keyPrefix: getStripeKeyPrefix(),
      message: maskError(String(error?.message || error))
    }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
};