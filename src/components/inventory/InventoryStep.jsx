import React, { useMemo, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InventoryEngine } from './InventoryEngine';
import {
  INVENTORY_MODULES,
  CONTAINER_TYPES,
  STATUS_TYPES,
  STORAGE_TYPES,
  getModuleConfig,
} from './inventoryConfig';

function SectionLabel({ children }) {
  return (
    <p
      className="text-xs uppercase tracking-wider font-semibold"
      style={{ color: 'rgba(212,165,116,0.85)' }}
    >
      {children}
    </p>
  );
}

function ChoicePills({ options, value, onChange, labelMap = {} }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: selected ? 'rgba(180,140,75,0.3)' : 'transparent',
              border: `1px solid ${selected ? 'rgba(180,140,75,0.5)' : 'rgba(180,140,75,0.2)'}`,
              color: selected ? 'rgba(212,165,116,0.95)' : 'rgba(212,165,116,0.65)',
            }}
          >
            {labelMap[option] || option}
          </button>
        );
      })}
    </div>
  );
}

export default function InventoryStep({
  moduleType,
  stepLabel = 'Inventory',
  data = {},
  onNext,
  onBack,
  saving = false,
}) {
  const config = getModuleConfig(moduleType);
  const engine = useMemo(() => new InventoryEngine(moduleType), [moduleType]);
  const [formData, setFormData] = useState(engine.getDefaults(data));

  if (!config) {
    return null;
  }

  const setField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    onNext?.({
      ...formData,
      _inventoryPayload: engine.buildUpdatePayload(formData),
    });
  };

  const showBlendFields = moduleType === INVENTORY_MODULES.BLEND;
  const showBottleFields = moduleType === INVENTORY_MODULES.BOTTLE;
  const showPipeFields = moduleType === INVENTORY_MODULES.PIPE;

  const showQuantityField =
    !showPipeFields &&
    (showBottleFields || formData.containerType === CONTAINER_TYPES.TIN || formData.containerType === CONTAINER_TYPES.POUCH || formData.containerType === CONTAINER_TYPES.BULK || formData.containerType === CONTAINER_TYPES.JAR);

  const quantityLabel = (() => {
    if (showBottleFields) return 'Bottles Owned';
    if (formData.containerType === CONTAINER_TYPES.TIN) return 'Tins Owned';
    if (formData.containerType === CONTAINER_TYPES.POUCH) return 'Pouches Owned';
    if (formData.containerType === CONTAINER_TYPES.BULK) return 'Total Ounces';
    if (formData.containerType === CONTAINER_TYPES.JAR) return 'Total Ounces';
    return 'Quantity';
  })();

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-6 pt-6 pb-5">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          style={{ color: 'rgba(224,216,200,0.6)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            {stepLabel}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.45)' }}>
            {config.label}
          </p>
        </div>
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-6 flex flex-col gap-5">
        {showBlendFields && (
          <div className="flex flex-col gap-2">
            <SectionLabel>Container Type</SectionLabel>
            <ChoicePills
              options={config.containers}
              value={formData.containerType}
              onChange={(value) => setField('containerType', value)}
              labelMap={{
                [CONTAINER_TYPES.TIN]: 'Tin',
                [CONTAINER_TYPES.BULK]: 'Bulk',
                [CONTAINER_TYPES.POUCH]: 'Pouch',
                [CONTAINER_TYPES.JAR]: 'Jar',
              }}
            />
          </div>
        )}

        {showQuantityField && (
          <div className="flex flex-col gap-2">
            <SectionLabel>{quantityLabel}</SectionLabel>
            <Input
              type="number"
              min="0"
              step={showBottleFields || formData.containerType === CONTAINER_TYPES.TIN || formData.containerType === CONTAINER_TYPES.POUCH ? '1' : '0.01'}
              value={formData.quantity ?? ''}
              onChange={(e) => setField('quantity', e.target.value)}
              placeholder={showBottleFields ? '1' : 'Enter quantity'}
              className="text-sm"
            />
          </div>
        )}

        {showBlendFields && (formData.containerType === CONTAINER_TYPES.TIN || formData.containerType === CONTAINER_TYPES.POUCH) && (
          <div className="flex flex-col gap-2">
            <SectionLabel>{formData.containerType === CONTAINER_TYPES.TIN ? 'Ounces Per Tin' : 'Ounces Per Pouch'}</SectionLabel>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.size ?? ''}
              onChange={(e) => setField('size', e.target.value)}
              placeholder="e.g. 1.75"
              className="text-sm"
            />
          </div>
        )}

        {showBottleFields && (
          <>
            <div className="flex flex-col gap-2">
              <SectionLabel>Status</SectionLabel>
              <ChoicePills
                options={config.statuses}
                value={formData.status}
                onChange={(value) => setField('status', value)}
                labelMap={{
                  [STATUS_TYPES.OPEN]: 'Open',
                  [STATUS_TYPES.UNOPENED]: 'Unopened',
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>Fill Level (Optional)</SectionLabel>
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={formData.fillLevel ?? ''}
                onChange={(e) => setField('fillLevel', e.target.value)}
                placeholder="e.g. 75"
                className="text-sm"
              />
            </div>
          </>
        )}

        {showBlendFields && (
          <div className="flex flex-col gap-2">
            <SectionLabel>Status</SectionLabel>
            <ChoicePills
              options={config.statuses}
              value={formData.status}
              onChange={(value) => setField('status', value)}
              labelMap={{
                [STATUS_TYPES.OPEN]: 'Open',
                [STATUS_TYPES.SEALED]: 'Sealed',
              }}
            />
          </div>
        )}

        {config.storageOptions?.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionLabel>Storage</SectionLabel>
            <ChoicePills
              options={config.storageOptions}
              value={formData.storage}
              onChange={(value) => setField('storage', value)}
              labelMap={{
                [STORAGE_TYPES.ACTIVE]: showBlendFields ? 'Active Rotation' : 'Active',
                [STORAGE_TYPES.CELLAR]: 'Cellar',
                [STORAGE_TYPES.BOTH]: 'Both',
                [STORAGE_TYPES.BAR]: 'Bar / Active',
                [STORAGE_TYPES.ARCHIVED]: 'Archived',
                [STORAGE_TYPES.SOLD]: 'Sold',
                [STORAGE_TYPES.RETIRED]: 'Retired',
              }}
            />
          </div>
        )}

        {(formData.storage === STORAGE_TYPES.CELLAR || formData.storage === STORAGE_TYPES.BOTH) && !showPipeFields && (
          <div className="flex flex-col gap-2">
            <SectionLabel>Cellar Date (Optional)</SectionLabel>
            <Input
              type="date"
              value={formData.cellarDate ?? ''}
              onChange={(e) => setField('cellarDate', e.target.value)}
              className="text-sm"
            />
          </div>
        )}

        {showBottleFields && (
          <div className="flex flex-col gap-2">
            <SectionLabel>Purchase Price (Optional)</SectionLabel>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.purchasePrice ?? ''}
              onChange={(e) => setField('purchasePrice', e.target.value)}
              placeholder="e.g. 69.99"
              className="text-sm"
            />
          </div>
        )}

        {showPipeFields && (
          <>
            <div className="flex flex-col gap-2">
              <SectionLabel>Ownership Status</SectionLabel>
              <ChoicePills
                options={config.storageOptions}
                value={formData.ownershipStatus || formData.storage}
                onChange={(value) => {
                  setField('ownershipStatus', value);
                  setField('storage', value);
                }}
                labelMap={{
                  [STORAGE_TYPES.ACTIVE]: 'Active',
                  [STORAGE_TYPES.ARCHIVED]: 'Archived',
                  [STORAGE_TYPES.SOLD]: 'Sold',
                  [STORAGE_TYPES.RETIRED]: 'Retired',
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>Acquisition Price (Optional)</SectionLabel>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.acquisitionPrice ?? ''}
                onChange={(e) => setField('acquisitionPrice', e.target.value)}
                placeholder="e.g. 125.00"
                className="text-sm"
              />
            </div>
          </>
        )}

        <Button
          onClick={handleNext}
          disabled={saving}
          className="w-full py-3 mt-4"
          style={{
            background: 'linear-gradient(135deg, rgba(46,125,92,1), rgba(36,105,76,1))',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Continue
        </Button>
      </div>
    </div>
  );
}
