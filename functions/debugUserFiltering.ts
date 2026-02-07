import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();

    if (!caller?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const customerId = body.stripeCustomerId || "cus_TuH1r3127kAoz8";
    const michaelEmail = "michael@woodburylawfl.com";
    const wmcreaEmail = "wmccrea@indario.com";

    const results = {
      caller: { id: caller.id, email: caller.email },
      tests: {},
    };

    // Test 1: Query by stripe_customer_id
    console.log(`[DEBUG] Test 1: Querying with stripe_customer_id: ${customerId}`);
    const byCustomerId = await base44.asServiceRole.entities.User.filter({
      stripe_customer_id: customerId,
    });
    results.tests.byCustomerId = {
      count: byCustomerId?.length || 0,
      users: byCustomerId?.map((u) => ({
        id: u.id,
        email: u.email,
        stripe_customer_id: u.stripe_customer_id,
      })) || [],
    };
    console.log(`[DEBUG] Got ${byCustomerId?.length || 0} users`);
    if (byCustomerId && byCustomerId.length > 0) {
      console.log(`[DEBUG] First user: ${byCustomerId[0].email}`);
    }

    // Test 2: Query by email (Michael)
    console.log(`[DEBUG] Test 2: Querying with email: ${michaelEmail}`);
    const byMichaelEmail = await base44.asServiceRole.entities.User.filter({
      email: michaelEmail,
    });
    results.tests.byMichaelEmail = {
      count: byMichaelEmail?.length || 0,
      users: byMichaelEmail?.map((u) => ({
        id: u.id,
        email: u.email,
        stripe_customer_id: u.stripe_customer_id,
      })) || [],
    };
    console.log(
      `[DEBUG] Got ${byMichaelEmail?.length || 0} users for Michael`
    );

    // Test 3: Query by email (wmccrea)
    console.log(`[DEBUG] Test 3: Querying with email: ${wmcreaEmail}`);
    const byWmcreaEmail = await base44.asServiceRole.entities.User.filter({
      email: wmcreaEmail,
    });
    results.tests.byWmcreaEmail = {
      count: byWmcreaEmail?.length || 0,
      users: byWmcreaEmail?.map((u) => ({
        id: u.id,
        email: u.email,
        stripe_customer_id: u.stripe_customer_id,
      })) || [],
    };
    console.log(`[DEBUG] Got ${byWmcreaEmail?.length || 0} users for wmccrea`);

    // Test 4: List all users (to see what's available)
    console.log(`[DEBUG] Test 4: Listing all users`);
    const allUsers = await base44.asServiceRole.entities.User.list();
    results.tests.allUsers = {
      count: allUsers?.length || 0,
      users: allUsers?.map((u) => ({
        id: u.id,
        email: u.email,
        stripe_customer_id: u.stripe_customer_id,
      })) || [],
    };
    console.log(`[DEBUG] Total users in system: ${allUsers?.length || 0}`);

    return Response.json(results);
  } catch (error) {
    console.error("[DEBUG] Error:", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
});