import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch all subscriptions
        const subscriptions = await base44.asServiceRole.entities.Subscription.list();

        let updated = 0;
        let skipped = 0;
        const errors = [];

        for (const sub of subscriptions) {
            // Skip if billing_interval already exists
            if (sub.billing_interval) {
                skipped++;
                continue;
            }

            // Skip if missing required date fields
            if (!sub.current_period_start || !sub.current_period_end) {
                errors.push({ id: sub.id, reason: 'Missing period dates' });
                continue;
            }

            try {
                const startDate = new Date(sub.current_period_start);
                const endDate = new Date(sub.current_period_end);
                const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));

                let interval = null;
                if (diffDays >= 335 && diffDays <= 395) {
                    interval = 'year';
                } else if (diffDays >= 28 && diffDays <= 35) {
                    interval = 'month';
                }

                if (interval) {
                    await base44.asServiceRole.entities.Subscription.update(sub.id, {
                        billing_interval: interval
                    });
                    updated++;
                } else {
                    errors.push({ id: sub.id, reason: `Unusual interval: ${diffDays} days` });
                }
            } catch (err) {
                errors.push({ id: sub.id, reason: err.message });
            }
        }

        return Response.json({
            success: true,
            total: subscriptions.length,
            updated,
            skipped,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});