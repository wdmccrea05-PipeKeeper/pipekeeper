import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// CSV field escaping
function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only protection
    if (user?.role !== 'admin') {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }

    // Fetch all users
    const users = await base44.asServiceRole.entities.User.list();

    // Build CSV
    const header = 'email,entitlement_tier,subscription_tier,subscription_status,subscription_level,stripe_customer_id,created_at,updated_at';
    const rows = [];

    // Sort by email ascending
    const sorted = (users || []).sort((a, b) => {
      const emailA = String(a.email || '').toLowerCase().trim();
      const emailB = String(b.email || '').toLowerCase().trim();
      return emailA.localeCompare(emailB);
    });

    for (const u of sorted) {
      const email = String(u.email || '').toLowerCase().trim();
      const entitlementTier = String(u.entitlement_tier || '').toLowerCase().trim();
      const subscriptionTier = String(u.subscription_tier || '').toLowerCase().trim();
      const subscriptionStatus = String(u.subscription_status || '').toLowerCase().trim();
      const subscriptionLevel = String(u.subscription_level || '').toLowerCase().trim();
      const stripeCustomerId = String(u.stripe_customer_id || '').trim();
      const createdAt = u.created_at || '';
      const updatedAt = u.updated_at || '';

      const row = [
        escapeCsvField(email),
        escapeCsvField(entitlementTier),
        escapeCsvField(subscriptionTier),
        escapeCsvField(subscriptionStatus),
        escapeCsvField(subscriptionLevel),
        escapeCsvField(stripeCustomerId),
        escapeCsvField(createdAt),
        escapeCsvField(updatedAt),
      ].join(',');

      rows.push(row);
    }

    const csv = [header, ...rows].join('\n');

    return Response.json({ csv });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});