// functions/adminNormalizeUsers.js
// ADMIN-ONLY: One-time user normalization - consolidate duplicates by email
// Includes dry-run mode for safety

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const normEmail = (email) => String(email || "").trim().toLowerCase();

function scoreUser(u) {
  const tier = (u.subscription_tier || "").toLowerCase();
  const status = (u.subscription_status || "").toLowerCase();

  let s = 0;
  if (status === "active" && tier === "pro") s += 1000;
  if (status === "active" && tier === "premium") s += 800;
  if (u.isFoundingMember) s += 500;
  if ((u.stripe_customer_id || "").startsWith("cus_")) s += 200;
  if (u.updated_at) s += 50;
  if (u.created_at) s += 10;
  return s;
}

function pickCanonical(users) {
  if (!users.length) return null;
  return users
    .slice()
    .sort((a, b) => scoreUser(b) - scoreUser(a))[0];
}

function pickProvider(users) {
  const anyStripe = users.some(u =>
    (u.stripe_customer_id || "").startsWith("cus_") ||
    (u.platform || "").toLowerCase() === "web" ||
    (u.subscription_provider || "").toLowerCase() === "stripe"
  );
  const anyApple = users.some(u =>
    (u.subscription_provider || "").toLowerCase() === "apple" ||
    (u.platform || "").toLowerCase() === "ios"
  );

  if (anyStripe) return "stripe";
  if (anyApple) return "apple";
  const existingProvider = (users[0]?.subscription_provider || "").toLowerCase();
  return existingProvider && existingProvider !== "unknown" ? existingProvider : null;
}

function pickStripeCustomerId(users) {
  // Prefer active subscription
  const active = users.find(u =>
    (u.subscription_status || "").toLowerCase() === "active" &&
    (u.stripe_customer_id || "").startsWith("cus_")
  );
  if (active?.stripe_customer_id) return active.stripe_customer_id;

  // Fallback to any cus_
  const anyCus = users.find(u => (u.stripe_customer_id || "").startsWith("cus_"));
  return anyCus?.stripe_customer_id || "";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin check
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }

    // Parse query params
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";
    const targetEmail = url.searchParams.get("email") || null;

    console.log(`[adminNormalizeUsers] Starting... dryRun=${dryRun}, targetEmail=${targetEmail}`);

    // 1) Load all users
    const allUsers = [];
    try {
      const users = await base44.asServiceRole.entities.User.list();
      if (Array.isArray(users)) {
        allUsers.push(...users);
      }
    } catch (e) {
      console.warn("[adminNormalizeUsers] Could not load User entities:", e?.message);
    }

    console.log(`[adminNormalizeUsers] Loaded ${allUsers.length} users`);

    // 2) Group by email
    const groups = new Map();
    for (const u of allUsers) {
      const e = normEmail(u.email);
      if (!e) continue;
      
      // If targetEmail specified, only process that one
      if (targetEmail && e !== normEmail(targetEmail)) continue;
      
      if (!groups.has(e)) groups.set(e, []);
      groups.get(e).push(u);
    }

    console.log(`[adminNormalizeUsers] Found ${groups.size} email groups`);

    const results = [];
    let totalMerged = 0;

    // 3) Process duplicates
    for (const [email, users] of groups.entries()) {
      if (users.length <= 1) {
        console.log(`[adminNormalizeUsers] Email "${email}": 1 user (no merge needed)`);
        continue;
      }

      console.log(`[adminNormalizeUsers] Email "${email}": ${users.length} duplicates found`);

      const canonical = pickCanonical(users);
      const provider = pickProvider(users);
      const stripeCustomerId = provider === "stripe" ? pickStripeCustomerId(users) : "";

      const dupes = users.filter(u => u.id !== canonical.id);

      console.log(`[adminNormalizeUsers] Canonical: id=${canonical.id}, provider=${provider}, cus=${stripeCustomerId || "none"}`);

      // In dry-run, just log what would happen
      if (dryRun) {
        console.log(`[adminNormalizeUsers] DRY RUN: Would merge ${dupes.length} duplicates into ${canonical.id}`);
        results.push({
          email,
          canonicalId: canonical.id,
          provider,
          stripeCustomerId,
          mergedCount: dupes.length,
          status: "dry_run",
        });
        continue;
      }

      // 4) Update canonical user
      try {
        await base44.asServiceRole.entities.User.update(canonical.id, {
          subscription_provider: provider,
          stripe_customer_id: stripeCustomerId || canonical.stripe_customer_id || "",
          platform: provider === "stripe" ? "web" : canonical.platform,
        });
        console.log(`[adminNormalizeUsers] Updated canonical user ${canonical.id}`);
      } catch (e) {
        console.error(`[adminNormalizeUsers] Failed to update canonical ${canonical.id}:`, e?.message);
      }

      // 5) Reassign entity ownership - PipeKeeper entities
      const entityReassignments = [
        { entity: "Pipe", field: "user_id" },
        { entity: "TobaccoBlend", field: "user_id" },
        { entity: "SmokingLog", field: "user_id" },
        { entity: "CellarLog", field: "user_id" },
        { entity: "PipeMaintenanceLog", field: "user_id" },
        { entity: "TobaccoContainer", field: "user_email" },
        { entity: "UserConnection", field: "follower_email" },
        { entity: "UserConnection", field: "following_email" },
        { entity: "Comment", field: "commenter_email" },
      ];

      for (const dupe of dupes) {
        for (const { entity, field } of entityReassignments) {
          try {
            const query = { [field]: field === "user_id" ? dupe.id : dupe.email };
            const owned = await base44.asServiceRole.entities[entity]?.filter(query);
            
            if (!owned || !Array.isArray(owned)) continue;

            for (const item of owned) {
              const updateValue = field === "user_id" ? canonical.id : canonical.email;
              await base44.asServiceRole.entities[entity].update(item.id, {
                [field]: updateValue,
              });
            }
            
            if (owned.length > 0) {
              console.log(`[adminNormalizeUsers] Reassigned ${owned.length} ${entity} from ${dupe.id} to ${canonical.id}`);
            }
          } catch (e) {
            console.warn(`[adminNormalizeUsers] Could not reassign ${entity}:`, e?.message);
          }
        }
      }

      // 6) Mark duplicates as merged/disabled
      for (const dupe of dupes) {
        try {
          await base44.asServiceRole.entities.User.update(dupe.id, {
            merged_into_user_id: canonical.id,
            is_disabled: true,
            subscription_provider: provider,
          });
          console.log(`[adminNormalizeUsers] Disabled dupe ${dupe.id} (merged into ${canonical.id})`);
        } catch (e) {
          console.error(`[adminNormalizeUsers] Failed to disable ${dupe.id}:`, e?.message);
        }
      }

      results.push({
        email,
        canonicalId: canonical.id,
        provider,
        stripeCustomerId,
        mergedCount: dupes.length,
        status: "merged",
      });

      totalMerged += dupes.length;
    }

    const mode = dryRun ? "DRY_RUN" : "EXECUTED";
    const summary = {
      mode,
      totalEmails: groups.size,
      totalMerged,
      results,
    };

    console.log(`[adminNormalizeUsers] ${mode} complete: merged ${totalMerged} users`);

    return new Response(JSON.stringify(summary, null, 2), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("[adminNormalizeUsers] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
});