import React, { useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, PenLine, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { barcodesMatch } from '@/platform/productNormalization';

const ENTITIES = { blend: 'TobaccoBlend', pipe: 'Pipe', bottle: 'Bottle', cigar: 'Cigar' };

function buildRecord(itemType, result) {
  const clean = (v) => (v !== null && v !== undefined && v !== '') ? v : undefined;
  if (itemType === 'blend') return {
    name: result.name,
    manufacturer: clean(result.manufacturer),
    blend_type: clean(result.blend_type),
    strength: clean(result.strength),
    cut: clean(result.cut),
    rating: clean(result.rating),
    production_status: clean(result.production_status),
    aging_potential: clean(result.aging_potential),
    notes: clean(result.description),
    purchase_price: clean(result.purchase_price),
    barcode: clean(result.barcode),
    upc: clean(result.upc),
    ean: clean(result.ean),
  };
  if (itemType === 'pipe') return {
    name: result.name,
    maker: clean(result.maker),
    shape: clean(result.shape),
    bowl_material: clean(result.bowl_material),
    stem_material: clean(result.stem_material),
    finish: clean(result.finish),
    year_made: clean(result.year_made),
    condition: clean(result.condition),
    country_of_origin: clean(result.country_of_origin),
    estimated_value: clean(result.estimated_value),
    purchase_price: clean(result.purchase_price),
    notes: clean(result.description),
    barcode: clean(result.barcode),
    upc: clean(result.upc),
    ean: clean(result.ean),
  };
  if (itemType === 'bottle') return {
    name: result.name,
    distillery: clean(result.distillery),
    type: clean(result.whiskey_type || result.type),
    age: clean(result.age),
    abv: clean(result.abv),
    bottle_size: clean(result.bottle_size),
    region: clean(result.region),
    country: clean(result.country),
    notes: clean(result.description || result.notes),
    purchase_price: clean(result.purchase_price),
    barcode: clean(result.barcode),
    upc: clean(result.upc),
    ean: clean(result.ean),
  };
  if (itemType === 'cigar') return {
    name: result.name,
    brand: clean(result.brand),
    line: clean(result.line),
    vitola: clean(result.vitola),
    wrapper: clean(result.wrapper),
    binder: clean(result.binder),
    filler: clean(result.filler),
    country_of_origin: clean(result.country_of_origin),
    body: clean(result.body),
    strength: clean(result.strength),
    production_status: clean(result.production_status),
    release_type: clean(result.release_type),
    personal_notes: clean(result.description),
    purchase_price: clean(result.purchase_price),
    estimated_value: clean(result.estimated_value),
    barcode: clean(result.barcode),
    upc: clean(result.upc),
    ean: clean(result.ean),
  };
  return { name: result.name };
}

/**
 * Check for existing records that share the same barcode/upc/ean as the
 * incoming result. Returns an array of likely duplicates (may be empty).
 */
async function findDuplicatesByBarcode(itemType, result) {
  const entity = ENTITIES[itemType];
  if (!entity) return [];

  const code = result.barcode || result.upc || result.ean;
  if (!code) return [];

  try {
    const allRecords = await base44.entities[entity].list();
    return allRecords.filter((r) => {
      if (barcodesMatch(r.barcode, code)) return true;
      if (barcodesMatch(r.upc, code)) return true;
      if (barcodesMatch(r.ean, code)) return true;
      return false;
    });
  } catch {
    return [];
  }
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
    const parts = [result.whiskey_type || result.type];
    if (result.age) parts.push(`${result.age} yr`);
    if (result.abv) parts.push(`${result.abv}%`);
    return parts.filter(Boolean);
  }
  if (itemType === 'cigar') return [result.vitola, result.wrapper, result.body].filter(Boolean);
  return [];
}

function getSubtitle(itemType, result) {
  if (itemType === 'blend') return result.manufacturer;
  if (itemType === 'pipe') return result.maker;
  if (itemType === 'bottle') return result.distillery;
  if (itemType === 'cigar') return result.brand;
  return '';
}

export default function AddFlowQuickConfirm({ itemType, typeLabel, result, onBack, onSearchAgain, onManual, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState(null); // null = not checked yet
  const [checkingDups, setCheckingDups] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    try {
      // Duplicate check on first attempt (only when a barcode code is present)
      if (duplicates === null && (result?.barcode || result?.upc || result?.ean)) {
        setCheckingDups(true);
        const found = await findDuplicatesByBarcode(itemType, result);
        setCheckingDups(false);
        setDuplicates(found);
        if (found.length > 0) {
          setSaving(false);
          return; // pause — user must explicitly choose
        }
      }

      const data = buildRecord(itemType, result);
      const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

      const record = await base44.entities[ENTITIES[itemType]].create(cleanData);
      toast.success(`${typeLabel} added!`);
      onCreated(record);
    } catch (e) {
      toast.error(e?.message || 'Failed to create record');
    } finally {
      setSaving(false);
      setCheckingDups(false);
    }
  };

  const handleCreateAnyway = async () => {
    setDuplicates([]); // bypass duplicate gate
    setSaving(true);
    try {
      const data = buildRecord(itemType, result);
      const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      const record = await base44.entities[ENTITIES[itemType]].create(cleanData);
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
  const hasDuplicates = duplicates && duplicates.length > 0;

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
          {(result?.barcode || result?.upc) && (
            <p className="text-xs mt-3" style={{ color: 'rgba(224,216,200,0.4)', fontFamily: 'monospace' }}>
              {result.upc || result.barcode}
            </p>
          )}
        </div>

        {/* Duplicate warning */}
        {hasDuplicates && (
          <div
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{
              background: 'rgba(180,140,75,0.07)',
              border: '1px solid rgba(180,140,75,0.35)',
            }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#D4A574' }} />
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>
                  Possible duplicate detected
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.6)' }}>
                  {duplicates.length === 1
                    ? `"${duplicates[0].name}" already has this barcode.`
                    : `${duplicates.length} existing records share this barcode.`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 h-9 text-xs"
                onClick={() => onCreated(duplicates[0])}
                style={{ background: 'rgba(180,140,75,0.22)', color: '#F5F1E7', border: '1px solid rgba(180,140,75,0.35)' }}
              >
                <ArrowRight className="w-3 h-3 mr-1" />
                Use Existing
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-9 text-xs"
                onClick={handleCreateAnyway}
                disabled={saving}
                style={{ borderColor: 'rgba(180,140,75,0.25)', color: 'rgba(224,216,200,0.7)', background: 'transparent' }}
              >
                {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Add Anyway
              </Button>
            </div>
          </div>
        )}

        {/* Primary action */}
        {!hasDuplicates && (
          <Button
            onClick={handleCreate}
            disabled={saving || checkingDups}
            className="w-full h-12 text-base"
            style={{ background: 'linear-gradient(135deg, rgba(46,125,92,1), rgba(36,105,76,1))', color: '#fff', fontWeight: 700 }}
          >
            {(saving || checkingDups) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            {checkingDups ? 'Checking…' : 'Add to Collection'}
          </Button>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-10"
            onClick={onSearchAgain}
            disabled={saving || checkingDups}
            style={{ borderColor: 'rgba(180,140,75,0.25)', color: 'rgba(224,216,200,0.7)', background: 'transparent' }}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Try Again
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-10"
            onClick={onManual}
            disabled={saving || checkingDups}
            style={{ borderColor: 'rgba(180,140,75,0.25)', color: 'rgba(224,216,200,0.7)', background: 'transparent' }}
          >
            <PenLine className="w-3.5 h-3.5 mr-1.5" />
            Edit Details
          </Button>
        </div>
      </div>
      <div className="pb-2" />
    </div>
  );
}