import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CONTAINER_TYPES = [
  { value: 'tin', label: 'Tin' },
  { value: 'bulk', label: 'Bulk' },
  { value: 'pouch', label: 'Pouch' },
  { value: 'jar', label: 'Jar' },
];

const STATUS_OPTIONS = ['Open', 'Sealed'];
const STORAGE_OPTIONS = ['Active Rotation', 'Cellar', 'Both'];

const inputStyle = {
  background: 'rgba(20,13,8,0.7)',
  border: '1px solid rgba(180,140,75,0.28)',
  color: '#F5F1E7',
};

function FieldRow({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label style={{ color: 'rgba(224,216,200,0.65)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </Label>
      {children}
    </div>
  );
}

function RadioGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const selected = value === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className="px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: selected ? 'rgba(180,140,75,0.22)' : 'rgba(255,255,255,0.04)',
              border: selected ? '1px solid rgba(180,140,75,0.55)' : '1px solid rgba(255,255,255,0.1)',
              color: selected ? '#D4A574' : 'rgba(224,216,200,0.65)',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function buildInventoryFields(containerType, values) {
  const fields = {};
  if (containerType === 'tin') {
    if (values.tin_count) fields.tin_total_tins = Number(values.tin_count);
    if (values.tin_oz) fields.tin_size_oz = Number(values.tin_oz);
    if (values.tin_count && values.tin_oz) {
      fields.tin_total_quantity_oz = Number(values.tin_count) * Number(values.tin_oz);
    }
  } else if (containerType === 'bulk') {
    if (values.bulk_oz) fields.bulk_total_quantity_oz = Number(values.bulk_oz);
  } else if (containerType === 'pouch') {
    if (values.pouch_count) fields.pouch_total_pouches = Number(values.pouch_count);
    if (values.pouch_oz) fields.pouch_size_oz = Number(values.pouch_oz);
    if (values.pouch_count && values.pouch_oz) {
      fields.pouch_total_quantity_oz = Number(values.pouch_count) * Number(values.pouch_oz);
    }
  } else if (containerType === 'jar') {
    if (values.jar_oz) fields.bulk_total_quantity_oz = Number(values.jar_oz);
  }
  // Status / storage
  const isOpen = values.status === 'Open';
  if (containerType === 'tin') {
    fields.tin_tins_open = isOpen ? (Number(values.tin_count) || 1) : 0;
    fields.tin_tins_cellared = isOpen ? 0 : (Number(values.tin_count) || 1);
    if (values.storage === 'Cellar' || values.storage === 'Both') {
      if (values.cellar_date) fields.tin_cellared_date = values.cellar_date;
    }
  } else if (containerType === 'bulk') {
    const bulkQty = Number(values.bulk_oz) || 0;
    fields.bulk_open = isOpen ? bulkQty : 0;
    fields.bulk_cellared = isOpen ? 0 : bulkQty;
    if (values.storage === 'Cellar' || values.storage === 'Both') {
      if (values.cellar_date) fields.bulk_cellared_date = values.cellar_date;
    }
  } else if (containerType === 'jar') {
    const jarQty = Number(values.jar_oz) || 0;
    fields.bulk_open = isOpen ? jarQty : 0;
    fields.bulk_cellared = isOpen ? 0 : jarQty;
    if (values.storage === 'Cellar' || values.storage === 'Both') {
      if (values.cellar_date) fields.bulk_cellared_date = values.cellar_date;
    }
  } else if (containerType === 'pouch') {
    fields.pouch_pouches_open = isOpen ? (Number(values.pouch_count) || 1) : 0;
    fields.pouch_pouches_cellared = isOpen ? 0 : (Number(values.pouch_count) || 1);
    if (values.storage === 'Cellar' || values.storage === 'Both') {
      if (values.cellar_date) fields.pouch_cellared_date = values.cellar_date;
    }
  }
  return fields;
}

export default function AddFlowBlendInventory({ onBack, onNext, stepLabel = 'Step 3 of 4', data = {} }) {
  const [container, setContainer] = useState('tin');
  const [values, setValues] = useState({
    tin_count: '1',
    tin_oz: '',
    bulk_oz: '',
    pouch_count: '1',
    pouch_oz: '',
    jar_oz: '',
    status: 'Open',
    storage: 'Active Rotation',
    cellar_date: '',
  });

  const set = (k, v) => setValues(prev => ({ ...prev, [k]: v }));

  const handleNext = () => {
    const inventoryFields = buildInventoryFields(container, values);
    onNext(inventoryFields);
  };

  const showCellarDate = values.storage === 'Cellar' || values.storage === 'Both';

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
        <div className="min-w-0">
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            <Package className="w-4 h-4 text-[#D4A574]" />
            Inventory
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.45)' }}>{stepLabel}</p>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-6 flex flex-col gap-5">
        {/* Container type */}
        <FieldRow label="Container Type *">
          <RadioGroup options={CONTAINER_TYPES} value={container} onChange={setContainer} />
        </FieldRow>

        <div style={{ height: 1, background: 'rgba(180,140,75,0.1)' }} />

        {/* Dynamic quantity inputs */}
        {container === 'tin' && (
          <>
            <FieldRow label="Tins Owned">
              <Input
                type="number"
                min="1"
                value={values.tin_count}
                onChange={e => set('tin_count', e.target.value)}
                placeholder="e.g. 3"
                style={inputStyle}
                className="placeholder:text-[rgba(224,216,200,0.3)]"
              />
            </FieldRow>
            <FieldRow label="Ounces Per Tin (optional)">
              <Input
                type="number"
                min="0"
                step="0.1"
                value={values.tin_oz}
                onChange={e => set('tin_oz', e.target.value)}
                placeholder="e.g. 1.75"
                style={inputStyle}
                className="placeholder:text-[rgba(224,216,200,0.3)]"
              />
            </FieldRow>
          </>
        )}

        {container === 'bulk' && (
          <FieldRow label="Total Ounces">
            <Input
              type="number"
              min="0"
              step="0.1"
              value={values.bulk_oz}
              onChange={e => set('bulk_oz', e.target.value)}
              placeholder="e.g. 8.0"
              style={inputStyle}
              className="placeholder:text-[rgba(224,216,200,0.3)]"
            />
          </FieldRow>
        )}

        {container === 'pouch' && (
          <>
            <FieldRow label="Pouches Owned">
              <Input
                type="number"
                min="1"
                value={values.pouch_count}
                onChange={e => set('pouch_count', e.target.value)}
                placeholder="e.g. 2"
                style={inputStyle}
                className="placeholder:text-[rgba(224,216,200,0.3)]"
              />
            </FieldRow>
            <FieldRow label="Ounces Per Pouch (optional)">
              <Input
                type="number"
                min="0"
                step="0.1"
                value={values.pouch_oz}
                onChange={e => set('pouch_oz', e.target.value)}
                placeholder="e.g. 1.5"
                style={inputStyle}
                className="placeholder:text-[rgba(224,216,200,0.3)]"
              />
            </FieldRow>
          </>
        )}

        {container === 'jar' && (
          <FieldRow label="Total Ounces">
            <Input
              type="number"
              min="0"
              step="0.1"
              value={values.jar_oz}
              onChange={e => set('jar_oz', e.target.value)}
              placeholder="e.g. 4.0"
              style={inputStyle}
              className="placeholder:text-[rgba(224,216,200,0.3)]"
            />
          </FieldRow>
        )}

        <div style={{ height: 1, background: 'rgba(180,140,75,0.1)' }} />

        {/* Status */}
        <FieldRow label="Status">
          <RadioGroup options={STATUS_OPTIONS} value={values.status} onChange={v => set('status', v)} />
        </FieldRow>

        {/* Storage */}
        <FieldRow label="Storage">
          <RadioGroup options={STORAGE_OPTIONS} value={values.storage} onChange={v => set('storage', v)} />
        </FieldRow>

        {showCellarDate && (
          <FieldRow label="Cellar Start Date (optional)">
            <Input
              type="date"
              value={values.cellar_date}
              onChange={e => set('cellar_date', e.target.value)}
              style={inputStyle}
            />
          </FieldRow>
        )}

        <Button
          onClick={handleNext}
          className="w-full mt-2"
          style={{ background: 'linear-gradient(135deg, rgba(163,92,92,1), rgba(140,74,74,1))', color: '#fff', fontWeight: 600 }}
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      <div className="pb-2" />
    </div>
  );
}