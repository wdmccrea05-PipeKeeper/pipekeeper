import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, PenLine, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ENTITIES = { blend: 'TobaccoBlend', pipe: 'Pipe', bottle: 'Bottle' };

function buildRecord(itemType, result) {
  const clean = (v) => (v !== null && v !== undefined && v !== '') ? v : undefined;
  if (itemType === 'blend') return {
    name: result.name,
    manufacturer: clean(result.manufacturer),
    blend_type: clean(result.blend_type),
    strength: clean(result.strength),
    notes: clean(result.description),
  };
  if (itemType === 'pipe') return {
    name: result.name,
    maker: clean(result.maker),
    shape: clean(result.shape),
    bowl_material: clean(result.bowl_material),
    notes: clean(result.description),
  };
  if (itemType === 'bottle') return {
    name: result.name,
    distillery: clean(result.distillery),
    type: clean(result.whiskey_type),
    age: clean(result.age),
    abv: clean(result.abv),
    notes: clean(result.description),
  };
  return { name: result.name };
}

function MetaChip({ value }) {
  if (!value) return null;
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full"
      style={{ background: 'rgba(180,140,75,0.14)', color: 'rgba(212,165,116,0.9)', border: '1px solid rgba(180,140,75,0.24)' }}
    >
      {value}
    </span>
  );
}

function getChips(itemType, result) {
  if (itemType === 'blend') return [result.blend_type, result.strength].filter(Boolean);
  if (itemType === 'pipe') return [result.shape, result.bowl_material].filter(Boolean);
  if (itemType === 'bottle') {
    const parts = [result.whiskey_type];
    if (result.age) parts.push(`${result.age} yr`);
    if (result.abv) parts.push(`${result.abv}%`);
    return parts.filter(Boolean);
  }
  return [];
}

function getSubtitle(itemType, result) {
  if (itemType === 'blend') return result.manufacturer;
  if (itemType === 'pipe') return result.maker;
  if (itemType === 'bottle') return result.distillery;
  return '';
}

export default function AddFlowQuickConfirm({ itemType, typeLabel, result, onBack, onSearchAgain, onManual, onCreated }) {
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const data = buildRecord(itemType, result);
      // Remove undefined keys
      const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      const record = await base44.entities[ENTITIES[itemType]].create(clean);
      toast.success(`${typeLabel} added!`);
      onCreated(record);
    } catch (e) {
      toast.error(e?.message || 'Failed to create record');
    } finally {
      setSaving(false);
    }
  };

  const chips = getChips(itemType, result);
  const subtitle = getSubtitle(itemType, result);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-5">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          style={{ color: 'rgba(224,216,200,0.6)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-bold min-w-0" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
          Confirm {typeLabel}
        </h2>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-6 flex flex-col gap-5">
        {/* Record preview */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(180,140,75,0.08), rgba(180,140,75,0.03))',
            border: '1px solid rgba(180,140,75,0.22)',
          }}
        >
          <p className="font-bold text-xl break-words" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            {result?.name}
          </p>
          {subtitle && (
            <p className="text-sm mt-1" style={{ color: 'rgba(212,165,116,0.8)' }}>{subtitle}</p>
          )}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {chips.map((chip) => <MetaChip key={chip} value={chip} />)}
            </div>
          )}
          {result?.description && (
            <p className="text-sm mt-3 leading-relaxed" style={{ color: 'rgba(224,216,200,0.62)' }}>
              {result.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <Button
          onClick={handleCreate}
          disabled={saving}
          className="w-full py-3"
          style={{ background: 'linear-gradient(135deg, rgba(46,125,92,1), rgba(36,105,76,1))', color: '#fff', fontWeight: 600 }}
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Create Record
        </Button>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onSearchAgain}
            disabled={saving}
            style={{ borderColor: 'rgba(180,140,75,0.25)', color: 'rgba(224,216,200,0.7)', background: 'transparent' }}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Search Again
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onManual}
            disabled={saving}
            style={{ borderColor: 'rgba(180,140,75,0.25)', color: 'rgba(224,216,200,0.7)', background: 'transparent' }}
          >
            <PenLine className="w-3.5 h-3.5 mr-1.5" />
            Add Manually
          </Button>
        </div>
      </div>
      <div className="pb-2" />
    </div>
  );
}