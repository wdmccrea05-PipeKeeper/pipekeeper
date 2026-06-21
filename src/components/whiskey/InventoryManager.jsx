import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Shield, Droplets, X } from 'lucide-react';
import WhiskeyKeeperIcon from '@/components/icons/WhiskeyKeeperIcon';
import { toast } from 'sonner';
import { getBottleUnitValue } from '@/components/utils/whiskeyValueHelpers';
import { useCurrency } from '@/lib/currency/useCurrency';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { useTranslation } from '@/components/i18n/safeTranslation';

const STATUS_CONFIG = {
  reserve: {
    label: 'Reserve',
    color: '#D4AF37',
    bg: 'rgba(212,175,55,0.12)',
    border: 'rgba(212,175,55,0.3)',
    Icon: Shield,
    description: 'Collection only — not for drinking',
  },
  drinking: {
    label: 'Drinking Stock',
    color: '#7B9B5B',
    bg: 'rgba(123,155,91,0.12)',
    border: 'rgba(123,155,91,0.3)',
    Icon: WhiskeyKeeperIcon,
    description: 'Unopened — ready for future sessions',
  },
  open: {
    label: 'Open',
    color: '#A35C5C',
    bg: 'rgba(163,92,92,0.12)',
    border: 'rgba(163,92,92,0.3)',
    Icon: Droplets,
    description: 'Currently being consumed',
  },
};

const FILL_LEVELS = ['Full', 'High', 'Medium', 'Low', 'Almost Empty'];

const FILL_MULTIPLIER = {
  Full: 1.0,
  High: 0.75,
  Medium: 0.5,
  Low: 0.25,
  'Almost Empty': 0.1,
};

function UnitRow({ unit, marketValue, onDelete, onUpdate }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(unit.status || 'drinking');
  const [fillLevel, setFillLevel] = useState(unit.fill_level || 'Full');
  const { formatFromBase } = useCurrency();
  const cfg = STATUS_CONFIG[unit.status] || STATUS_CONFIG.drinking;
  const Icon = cfg.Icon;

  const handleSave = () => {
    onUpdate(unit.id, { status, fill_level: status === 'open' ? fillLevel : null });
    setEditing(false);
  };

  const unitValue = marketValue
    ? unit.status === 'open'
      ? Math.round(marketValue * (FILL_MULTIPLIER[unit.fill_level] || 1))
      : Math.round(marketValue)
    : null;

  return (
    <div
      className="rounded-lg px-4 py-3 flex items-center justify-between gap-3"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />
        <div className="min-w-0">
          {editing ? (
            <div className="flex flex-col gap-2">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 text-xs w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reserve">{t("auto.components_whiskey_InventoryManager.reserve_18cqag")}</SelectItem>
                  <SelectItem value="drinking">{t("auto.components_whiskey_InventoryManager.drinking_stock_1jnzr0")}</SelectItem>
                  <SelectItem value="open">{t("auto.components_whiskey_InventoryManager.open_yjzwpj")}</SelectItem>
                </SelectContent>
              </Select>
              {status === 'open' && (
                <Select value={fillLevel} onValueChange={setFillLevel}>
                  <SelectTrigger className="h-8 text-xs w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILL_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={handleSave}>{t("auto.components_whiskey_InventoryManager.save_yk2ng4")}</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>{t("auto.components_whiskey_InventoryManager.cancel_1bin7k")}</Button>
              </div>
            </div>
          ) : (
            <div>
              <span className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
              {unit.status === 'open' && unit.fill_level && (
                <span className="text-xs ml-2" style={{ color: 'rgba(224,216,200,0.6)' }}>· {unit.fill_level}</span>
              )}
              {unit.purchase_date && (
                <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.45)' }}>
                  {t("auto.components_whiskey_InventoryManager.purchased_120nfe")} {new Date(unit.purchase_date).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {unitValue != null && (
          <span className="text-xs font-semibold" style={{ color: 'rgba(212,175,55,0.8)' }}>{formatFromBase(unitValue)}</span>
        )}
        {!editing && (
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setEditing(true)}>{t("auto.components_whiskey_InventoryManager.edit_yjrxfv")}</Button>
        )}
        <button
          onClick={() => onDelete(unit.id)}
          className="text-red-400/60 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function InventoryManager({ bottle, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const { formatFromBase } = useCurrency();
  const [addStatus, setAddStatus] = useState('drinking');
  const [addFill, setAddFill] = useState('Full');
  const [addPrice, setAddPrice] = useState('');
  const [addDate, setAddDate] = useState('');
  const [addQty, setAddQty] = useState('1');
  const [adding, setAdding] = useState(false);

  const { data: units = [], isLoading } = useQuery({
    queryKey: ['inventory-units', bottle.id],
    queryFn: async () => {
      const r = await base44.entities.WhiskeyInventoryUnit.filter({ bottle_id: bottle.id });
      return Array.isArray(r) ? r : [];
    },
    enabled: !!bottle.id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory-units', bottle.id] });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bottles(user?.email) });
  };

  const handleAdd = async () => {
    const qty = Math.max(1, Math.min(99, parseInt(addQty) || 1));
    setAdding(true);
    try {
      const creates = Array.from({ length: qty }, () =>
        base44.entities.WhiskeyInventoryUnit.create({
          bottle_id: bottle.id,
          bottle_name: bottle.name,
          status: addStatus,
          fill_level: addStatus === 'open' ? addFill : null,
          purchase_price: addPrice ? Number(addPrice) : null,
          purchase_date: addDate || null,
        })
      );
      await Promise.all(creates);
      invalidate();
      setAddPrice('');
      setAddDate('');
      setAddQty('1');
      toast.success(qty === 1 ? 'Bottle unit added' : `${qty} bottle units added`);
    } catch (e) {
      console.error('[InventoryManager] failed to add units', e);
      toast.error(t("auto.components_whiskey_InventoryManager.failed_to_add_bottle_unit_please_1wjdbp"));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (unitId) => {
    try {
      await base44.entities.WhiskeyInventoryUnit.delete(unitId);
      invalidate();
      toast.success(t("auto.components_whiskey_InventoryManager.bottle_unit_removed_bjto69"));
    } catch (e) {
      console.error('[InventoryManager] failed to delete unit', e);
      toast.error(t("auto.components_whiskey_InventoryManager.failed_to_remove_bottle_unit_please_1jczj9"));
    }
  };

  const handleUpdate = async (unitId, data) => {
    try {
      await base44.entities.WhiskeyInventoryUnit.update(unitId, data);
      invalidate();
      toast.success(t("auto.components_whiskey_InventoryManager.updated_187ypr"));
    } catch (e) {
      console.error('[InventoryManager] failed to update unit', e);
      toast.error(t("auto.components_whiskey_InventoryManager.failed_to_update_bottle_unit_please_1bm4qm"));
    }
  };

  const marketValue = getBottleUnitValue(bottle);

  // Inventory counts
  const reserveCount = units.filter(u => u.status === 'reserve').length;
  const drinkingCount = units.filter(u => u.status === 'drinking').length;
  const openCount = units.filter(u => u.status === 'open').length;

  // Total inventory value
  const totalValue = units.reduce((sum, u) => {
    if (!marketValue) return sum;
    const mult = u.status === 'open' ? (FILL_MULTIPLIER[u.fill_level] || 1) : 1;
    return sum + marketValue * mult;
  }, 0);

  return (
    <div
      className="rounded-2xl p-6 space-y-6"
      style={{
        background: 'linear-gradient(135deg, rgba(28,20,14,0.98), rgba(22,15,10,0.99))',
        border: '1px solid rgba(180,140,75,0.25)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold" style={{ color: '#F5F1E7' }}>{t("auto.components_whiskey_InventoryManager.inventory_808our")}</h3>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(224,216,200,0.6)' }}>{bottle.name}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-[#E0D8C8]/50 hover:text-[#E0D8C8]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Summary strip */}
      {units.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: units.length, color: '#D4A574' },
            { label: 'Reserve', value: reserveCount, color: '#D4AF37' },
            { label: 'Drinking', value: drinkingCount, color: '#7B9B5B' },
            { label: 'Open', value: openCount, color: '#A35C5C' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs" style={{ color: 'rgba(180,140,75,0.6)' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Value summary */}
      {totalValue > 0 && (
        <div
          className="rounded-lg px-4 py-3 flex items-center justify-between"
          style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}
        >
          <span className="text-sm" style={{ color: 'rgba(212,175,55,0.8)' }}>{t("auto.components_whiskey_InventoryManager.inventory_value_4q8j74")}</span>
          <span className="text-lg font-bold" style={{ color: '#D4AF37' }}>{formatFromBase(Math.round(totalValue))}</span>
        </div>
      )}

      {/* Units list */}
      <div className="space-y-2">
        {isLoading && (
          <p className="text-sm text-center py-4" style={{ color: 'rgba(224,216,200,0.4)' }}>{t("auto.components_whiskey_InventoryManager.loading_z2ifzh")}</p>
        )}
        {!isLoading && units.length === 0 && (
          <p className="text-sm text-center py-4" style={{ color: 'rgba(224,216,200,0.4)' }}>
            {t("auto.components_whiskey_InventoryManager.no_bottle_units_yet_add_your_12lw9w")}
          </p>
        )}
        {units.map(unit => (
          <UnitRow
            key={unit.id}
            unit={unit}
            marketValue={marketValue}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        ))}
      </div>

      {/* Add unit */}
      <div
        className="rounded-lg p-4 space-y-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(120,90,65,0.2)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(180,140,75,0.7)' }}>{t("auto.components_whiskey_InventoryManager.add_bottle_unit_1dqaw6")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'rgba(224,216,200,0.6)' }}>{t("auto.components_whiskey_InventoryManager.quantity_nmzd9g")}</label>
            <Input
              type="number"
              min="1"
              max="99"
              placeholder="1"
              value={addQty}
              onChange={e => setAddQty(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'rgba(224,216,200,0.6)' }}>{t("auto.components_whiskey_InventoryManager.status_1m8lgy")}</label>
            <Select value={addStatus} onValueChange={setAddStatus}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reserve">{t("auto.components_whiskey_InventoryManager.reserve_collection_8qax4u")}</SelectItem>
                <SelectItem value="drinking">{t("auto.components_whiskey_InventoryManager.drinking_stock_unopened_xmnqvi")}</SelectItem>
                <SelectItem value="open">{t("auto.components_whiskey_InventoryManager.open_yjzwpj")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {addStatus === 'open' && (
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'rgba(224,216,200,0.6)' }}>{t("auto.components_whiskey_InventoryManager.fill_level_136bpk")}</label>
              <Select value={addFill} onValueChange={setAddFill}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILL_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'rgba(224,216,200,0.6)' }}>{t("auto.components_whiskey_InventoryManager.purchase_price_1nb1ld")}</label>
            <Input
              type="number"
              placeholder="optional"
              value={addPrice}
              onChange={e => setAddPrice(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'rgba(224,216,200,0.6)' }}>{t("auto.components_whiskey_InventoryManager.purchase_date_1s5dgs")}</label>
            <Input
              type="date"
              value={addDate}
              onChange={e => setAddDate(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={adding} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          {adding ? 'Adding...' : 'Add Bottle Unit'}
        </Button>
      </div>
    </div>
  );
}

// Helper: compute inventory value for a bottle given its units
export function computeInventoryValue(bottle, units) {
  const marketValue = getBottleUnitValue(bottle);
  if (!marketValue || !units?.length) return marketValue * (bottle.bottle_count || 1);

  return units.reduce((sum, u) => {
    const mult = u.status === 'open' ? (FILL_MULTIPLIER[u.fill_level] || 1) : 1;
    return sum + marketValue * mult;
  }, 0);
}

// Helper: summarize inventory for a bottle
export function summarizeInventory(units) {
  if (!units?.length) return null;
  return {
    total: units.length,
    reserve: units.filter(u => u.status === 'reserve').length,
    drinking: units.filter(u => u.status === 'drinking').length,
    open: units.filter(u => u.status === 'open').length,
  };
}