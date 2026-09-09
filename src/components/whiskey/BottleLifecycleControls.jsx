import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Minus, Plus, Archive, ArchiveRestore, Package } from 'lucide-react';
import { QUERY_KEYS } from '@/lib/queryKeys';
import {
  planFinishUnit,
  planAddUnit,
  buildArchivePayload,
  buildUnarchivePayload,
  getInventoryCount,
} from '@/lib/collection/inventoryLifecycle';

/**
 * BottleLifecycleControls — Finish Bottle, Add Bottle, Archive/Unarchive.
 *
 * Mobile-first: all buttons are ≥44px touch targets.
 * Delete is intentionally NOT here — it remains on the detail page header
 * as a secondary, destructive action with confirmation.
 */
export default function BottleLifecycleControls({
  bottle,
  inventoryUnitCount = 0,
  hasInventoryUnits = false,
  onAfterChange,
  userEmail,
}) {
  const queryClient = useQueryClient();
  const [finishing, setFinishing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const currentCount = getInventoryCount(
    bottle,
    inventoryUnitCount,
    hasInventoryUnits,
    ['bottle_count', 'quantity']
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bottles(userEmail) });
    queryClient.invalidateQueries({ queryKey: ['inventory-units', bottle?.id] });
    queryClient.invalidateQueries({ queryKey: ['whiskey-inventory', userEmail] });
    queryClient.invalidateQueries({ queryKey: ['bottles-export', userEmail] });
    if (typeof onAfterChange === 'function') onAfterChange();
  };

  const handleFinishBottle = async () => {
    if (!bottle?.id || finishing) return;
    setFinishing(true);
    try {
      const plan = planFinishUnit(bottle, inventoryUnitCount, hasInventoryUnits, ['bottle_count', 'quantity']);

      if (plan.action === 'noop') {
        toast.info('No bottles to finish — inventory is already at zero.');
        return;
      }

      if (plan.action === 'delete_unit') {
        // Delete one inventory unit row (the oldest one)
        const units = await base44.entities.WhiskeyInventoryUnit.filter(
          { bottle_id: bottle.id },
          'created_date',
          1
        );
        if (units?.[0]?.id) {
          await base44.entities.WhiskeyInventoryUnit.delete(units[0].id);
        }
        toast.success('Bottle finished — inventory decreased. Record preserved.');
      } else if (plan.action === 'decrement_field' && plan.field) {
        await base44.entities.Bottle.update(bottle.id, {
          [plan.field]: plan.newCount,
        });
        toast.success('Bottle finished — inventory decreased. Record preserved.');
      }

      invalidate();
    } catch (e) {
      console.error('[BottleLifecycleControls] finish failed', e);
      toast.error('Failed to finish bottle. Please try again.');
    } finally {
      setFinishing(false);
    }
  };

  const handleAddBottle = async () => {
    if (!bottle?.id || adding) return;
    setAdding(true);
    try {
      const plan = planAddUnit(bottle, hasInventoryUnits, ['bottle_count', 'quantity']);

      const updates = {};

      if (plan.action === 'create_unit') {
        await base44.entities.WhiskeyInventoryUnit.create({
          bottle_id: bottle.id,
          bottle_name: bottle.name,
          status: 'drinking',
          fill_level: null,
          purchase_price: null,
          purchase_date: null,
        });
      } else if (plan.action === 'increment_field' && plan.field) {
        updates[plan.field] = plan.newCount;
      }

      // If archived and receiving new inventory, restore to collection
      if (plan.shouldUnarchive) {
        Object.assign(updates, buildUnarchivePayload());
        toast.success('Bottle added — restored to collection from archive.');
      } else {
        toast.success('Bottle added — inventory increased.');
      }

      if (Object.keys(updates).length > 0) {
        await base44.entities.Bottle.update(bottle.id, updates);
      }

      invalidate();
    } catch (e) {
      console.error('[BottleLifecycleControls] add failed', e);
      toast.error('Failed to add bottle. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleArchive = async () => {
    if (!bottle?.id || archiving) return;
    setArchiving(true);
    try {
      if (bottle.is_archived) {
        await base44.entities.Bottle.update(bottle.id, buildUnarchivePayload());
        toast.success('Restored to collection.');
      } else {
        await base44.entities.Bottle.update(bottle.id, buildArchivePayload());
        toast.success('Archived — history preserved. Find it under Archived.');
      }
      invalidate();
    } catch (e) {
      console.error('[BottleLifecycleControls] archive failed', e);
      toast.error('Failed to archive. Please try again.');
    } finally {
      setArchiving(false);
    }
  };

  const isArchived = bottle?.is_archived === true;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Finish Bottle — only show when inventory > 0 */}
      {currentCount > 0 && (
        <button
          type="button"
          onClick={handleFinishBottle}
          disabled={finishing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            minHeight: 44,
            minWidth: 44,
            background: 'rgba(163,92,92,0.15)',
            border: '1px solid rgba(163,92,92,0.35)',
            color: '#F0B4B4',
            opacity: finishing ? 0.5 : 1,
          }}
        >
          <Minus className="w-4 h-4" />
          {finishing ? 'Finishing…' : 'Finish Bottle'}
        </button>
      )}

      {/* Add Bottle — always available (0 → 1, or repurchase) */}
      <button
        type="button"
        onClick={handleAddBottle}
        disabled={adding}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{
          minHeight: 44,
          minWidth: 44,
          background: 'rgba(123,155,91,0.15)',
          border: '1px solid rgba(123,155,91,0.35)',
          color: '#9BBF7B',
          opacity: adding ? 0.5 : 1,
        }}
      >
        <Plus className="w-4 h-4" />
        {adding ? 'Adding…' : currentCount === 0 ? 'Add Bottle' : 'Add Bottle'}
      </button>

      {/* Archive / Unarchive */}
      <button
        type="button"
        onClick={handleArchive}
        disabled={archiving}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{
          minHeight: 44,
          minWidth: 44,
          background: isArchived ? 'rgba(180,140,75,0.15)' : 'rgba(255,255,255,0.04)',
          border: isArchived ? '1px solid rgba(180,140,75,0.35)' : '1px solid rgba(180,140,75,0.18)',
          color: isArchived ? '#D4A574' : 'rgba(224,216,200,0.7)',
          opacity: archiving ? 0.5 : 1,
        }}
      >
        {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
        {archiving ? '…' : isArchived ? 'Restore to Collection' : 'Archive'}
      </button>

      {/* Inventory status badge */}
      <div
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm"
        style={{
          minHeight: 44,
          background: currentCount > 0 ? 'rgba(123,155,91,0.08)' : 'rgba(255,255,255,0.03)',
          border: currentCount > 0 ? '1px solid rgba(123,155,91,0.2)' : '1px solid rgba(180,140,75,0.12)',
          color: currentCount > 0 ? '#9BBF7B' : 'rgba(224,216,200,0.5)',
        }}
      >
        <Package className="w-4 h-4" />
        {currentCount > 0 ? `${currentCount} bottle${currentCount === 1 ? '' : 's'}` : '0 bottles · Empty'}
      </div>
    </div>
  );
}