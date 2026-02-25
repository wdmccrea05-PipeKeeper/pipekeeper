import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.email) {
      return Response.json({ error: 'Unauthorized - must be logged in' }, { status: 401 });
    }
    
    console.log(`[testCheckoutAsUser] Testing checkout for ${user.email}`);
    
    // Test creating a checkout session
    try {
      const checkoutResult = await base44.functions.invoke('createCheckoutSession', {
        tier: 'premium',
        interval: 'monthly'
      });
      
      console.log('[testCheckoutAsUser] Checkout result:', checkoutResult);
      
      return Response.json({
        ok: true,
        user: user.email,
        checkoutTest: {
          success: checkoutResult.data?.ok || false,
          url: checkoutResult.data?.url || null,
          error: checkoutResult.data?.error || null
        }
      });
    } catch (error) {
      console.error('[testCheckoutAsUser] Checkout failed:', error);
      return Response.json({
        ok: false,
        user: user.email,
        checkoutTest: {
          success: false,
          error: error?.message || String(error)
        }
      });
    }
  } catch (error) {
    console.error('[testCheckoutAsUser] Error:', error);
    return Response.json({
      ok: false,
      error: error?.message || String(error)
    }, { status: 500 });
  }
});