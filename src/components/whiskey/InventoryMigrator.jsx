import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';

/**
 * Silently migrates legacy Bottle records (bottle_count field) to WhiskeyInventoryUnit records.
 * Runs once per session per user. Safe to include anywhere in the whiskey module.
 */
export default function InventoryMigrator() {
  const { user } = useCurrentUser();

  useEffect(() => {
    if (!user?.email) return;
    const sessionKey = `wk_inventory_migrated_${user.email}`;
    if (sessionStorage.getItem(sessionKey)) return;

    let cancelled = false;

    (async () => {
      try {
        // Find unmigrated bottles with bottle_count > 0
        const bottles = await base44.entities.Bottle.filter({ created_by: user.email });
        const unmigrated = bottles.filter(b => !b.inventory_migrated && (b.bottle_count || 1) >= 1);

        for (const bottle of unmigrated) {
          if (cancelled) break;
          const count = Number(bottle.bottle_count) || 1;
          const hasOpen = bottle.fill_level && bottle.fill_level !== 'Full' && bottle.fill_level !== 'Empty';

          // Check if any inventory units already exist for this bottle
          const existing = await base44.entities.WhiskeyInventoryUnit.filter({ bottle_id: bottle.id });
          if (existing.length > 0) {
            // Already has units, just mark migrated
            await base44.entities.Bottle.update(bottle.id, {
              inventory_migrated: true,
              average_market_value: bottle.average_market_value || bottle.purchase_price || null,
            });
            continue;
          }

          // Create units
          const units = [];
          if (hasOpen) {
            // One open bottle
            units.push({
              bottle_id: bottle.id,
              bottle_name: bottle.name,
              status: 'open',
              fill_level: bottle.fill_level === 'Empty' ? 'Almost Empty' : bottle.fill_level,
              purchase_price: bottle.purchase_price || null,
              purchase_date: bottle.purchase_date || null,
              opened_date: bottle.opened_date || null,
            });
            // Remaining as drinking stock
            for (let i = 1; i < count; i++) {
              units.push({
                bottle_id: bottle.id,
                bottle_name: bottle.name,
                status: 'drinking',
                purchase_price: bottle.purchase_price || null,
                purchase_date: bottle.purchase_date || null,
              });
            }
          } else {
            // All unopened
            for (let i = 0; i < count; i++) {
              units.push({
                bottle_id: bottle.id,
                bottle_name: bottle.name,
                status: 'drinking',
                purchase_price: bottle.purchase_price || null,
                purchase_date: bottle.purchase_date || null,
              });
            }
          }

          await base44.entities.WhiskeyInventoryUnit.bulkCreate(units);
          await base44.entities.Bottle.update(bottle.id, {
            inventory_migrated: true,
            average_market_value: bottle.average_market_value || bottle.purchase_price || null,
          });
        }

        if (!cancelled) {
          sessionStorage.setItem(sessionKey, 'true');
        }
      } catch (e) {
        // Non-fatal — will retry next session
        console.warn('[InventoryMigrator] Migration failed (non-fatal):', e?.message);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.email]);

  return null;
}