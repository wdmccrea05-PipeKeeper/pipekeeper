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
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(unit.status);
  const [fillLevel, setFillLevel] = useState(unit.fill_level || 'Full');
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
                  <SelectItem value="reserve">Reserve</SelectItem>
                  <SelectItem value="drinking">Drinking Stock</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
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
                <Button size="sm" className="h-7 text-xs" onClick={handleSave}>Save</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
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
                  Purchased {new Date(unit.purchase_date).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {unitValue != null && (
          <span className="text-xs font-semibold" style={{ color: 'rgba(212,175,55,0.8)' }}>${unitValue.toLocaleString()}</span>
        )}
        {!editing && (
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setEditing(true)}>Edit</Button>
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
  const queryClient = useQueryClient();
  const [addStatus, setAddStatus] = useState('drinking');
  const [addFill, setAddFill] = useState('Full');
  const [addPrice, setAddPrice] = useState('');
  const [addDate, setAddDate] = useState('');
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
    queryClient.invalidateQueries({ queryKey: ['bottles'] });
    queryClient.invalidateQueries({ queryKey: ['bottles-summary'] });
  };

  const handleAdd = async () => {
    setAdding(true);
    await base44.entities.WhiskeyInventoryUnit.create({
      bottle_id: bottle.id,
      bottle_name: bottle.name,
      status: addStatus,
      fill_level: addStatus === 'open' ? addFill : null,
      purchase_price: addPrice ? Number(addPrice) : null,
      purchase_date: addDate || null,
    });
    invalidate();
    setAdding(false);
    setAddPrice('');
    setAddDate('');
    toast.success('Bottle unit added');
  };

  const handleDelete = async (unitId) => {
    await base44.entities.WhiskeyInventoryUnit.delete(unitId);
    invalidate();
    toast.success('Bottle unit removed');
  };

  const handleUpdate = async (unitId, data) => {
    await base44.entities.WhiskeyInventoryUnit.update(unitId, data);
    invalidate();
    toast.success('Updated');
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
          <h3 className="text-lg font-bold" style={{ color: '#F5F1E7' }}>Inventory</h3>
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
          <span className="text-sm" style={{ color: 'rgba(212,175,55,0.8)' }}>Inventory Value</span>
          <span className="text-lg font-bold" style={{ color: '#D4AF37' }}>${Math.round(totalValue).toLocaleString()}</span>
        </div>
      )}

      {/* Units list */}
      <div className="space-y-2">
        {isLoading && (
          <p className="text-sm text-center py-4" style={{ color: 'rgba(224,216,200,0.4)' }}>Loading...</p>
        )}
        {!isLoading && units.length === 0 && (
          <p className="text-sm text-center py-4" style={{ color: 'rgba(224,216,200,0.4)' }}>
            No bottle units yet. Add your first below.
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
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(180,140,75,0.7)' }}>Add Bottle Unit</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'rgba(224,216,200,0.6)' }}>Status</label>
            <Select value={addStatus} onValueChange={setAddStatus}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reserve">Reserve (Collection)</SelectItem>
                <SelectItem value="drinking">Drinking Stock (Unopened)</SelectItem>
                <SelectItem value="open">Open</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {addStatus === 'open' && (
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'rgba(224,216,200,0.6)' }}>Fill Level</label>
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
            <label className="text-xs mb-1 block" style={{ color: 'rgba(224,216,200,0.6)' }}>Purchase Price ($)</label>
            <Input
              type="number"
              placeholder="optional"
              value={addPrice}
              onChange={e => setAddPrice(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'rgba(224,216,200,0.6)' }}>Purchase Date</label>
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