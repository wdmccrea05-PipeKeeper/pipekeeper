import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STRENGTHS = ['Mild', 'Mild-Medium', 'Medium', 'Medium-Full', 'Full'];
const CUTS = ['Ribbon', 'Flake', 'Broken Flake', 'Ready Rubbed', 'Plug', 'Rope', 'Crumble Cake', 'Shag', 'Coin', 'Twist', 'Cube Cut'];
const FINISHES = ['Smooth', 'Sandblast', 'Rusticated', 'Partially Rusticated', 'Carved', 'Natural', 'Other'];
const MATERIALS = ['Briar', 'Meerschaum', 'Corn Cob', 'Clay', 'Morta', 'Cherry Wood', 'Olive Wood', 'Other'];
const CONDITIONS = ['Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor', 'Estate - Unrestored'];
const CIGAR_BODY = ['mild', 'mild_medium', 'medium', 'medium_full', 'full'];
const CIGAR_INTENSITY_LABELS = { mild: 'Mild', mild_medium: 'Mild-Medium', medium: 'Medium', medium_full: 'Medium-Full', full: 'Full' };
const WRAPPERS = ['Colorado Claro', 'Colorado', 'Colorado Maduro', 'Maduro', 'Oscuro', 'Natural', 'Claro', 'Double Claro (Candela)', 'Connecticut Shade', 'Connecticut Broadleaf', 'Ecuadorian Connecticut', 'Habano', 'San Andres Maduro', 'Cameroon', 'Sumatra', 'Indonesian', 'Other'];
const WINE_STYLES = ['red', 'white', 'rosé', 'sparkling', 'dessert', 'fortified', 'orange', 'other'];

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

function StyledSelect({ value, onChange, options, placeholder, labelMap }) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger style={{ ...inputStyle, height: 40 }}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt} value={opt}>
            {labelMap ? (labelMap[opt] || opt) : opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function AddFlowManualDetails({ itemType, onBack, onNext, onClose, data }) {
  const [values, setValues] = useState({
    strength: data?.strength || '',
    cut: data?.cut || '',
    flavor_notes_raw: Array.isArray(data?.flavor_notes) ? data.flavor_notes.join(', ') : (data?.flavor_notes_raw || ''),
    notes: data?.notes || '',
    finish: data?.finish || '',
    bowl_material: data?.bowl_material || '',
    condition: data?.condition || '',
    abv: data?.abv || '',
    age: data?.age || '',
    wrapper: data?.wrapper || '',
    binder: data?.binder || '',
    body: data?.body || '',
    vintage: data?.vintage || '',
    varietal: data?.varietal || '',
    region: data?.region || '',
    appellation: data?.appellation || '',
    style: data?.style || '',
  });

  const set = (key, val) => setValues(prev => ({ ...prev, [key]: val }));

  const handleNext = () => {
    const out = { ...values };
    if (out.flavor_notes_raw) {
      out.flavor_notes = out.flavor_notes_raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    delete out.flavor_notes_raw;
    onNext(out);
  };

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
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            Details
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.45)' }}>Step 2 of 4</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
            style={{ color: 'rgba(224,216,200,0.5)', minHeight: 44, minWidth: 44, width: 44, height: 44 }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mx-6" style={{ height: 1, background: 'rgba(180,140,75,0.12)' }} />

      <div className="px-6 py-6 flex flex-col gap-5">
        {itemType === 'blend' && (
          <>
            <FieldRow label="Strength">
              <StyledSelect value={values.strength} onChange={v => set('strength', v)} options={STRENGTHS} placeholder="Select strength…" />
            </FieldRow>
            <FieldRow label="Cut">
              <StyledSelect value={values.cut} onChange={v => set('cut', v)} options={CUTS} placeholder="Select cut…" />
            </FieldRow>
            <FieldRow label="Flavor Notes">
              <Input
                value={values.flavor_notes_raw}
                onChange={e => set('flavor_notes_raw', e.target.value)}
                placeholder="e.g. Nutty, Sweet, Earthy (comma separated)…"
                style={inputStyle}
                className="placeholder:text-[rgba(224,216,200,0.3)]"
              />
            </FieldRow>
          </>
        )}

        {itemType === 'pipe' && (
          <>
            <FieldRow label="Bowl Material">
              <StyledSelect value={values.bowl_material} onChange={v => set('bowl_material', v)} options={MATERIALS} placeholder="Select material…" />
            </FieldRow>
            <FieldRow label="Finish">
              <StyledSelect value={values.finish} onChange={v => set('finish', v)} options={FINISHES} placeholder="Select finish…" />
            </FieldRow>
            <FieldRow label="Condition">
              <StyledSelect value={values.condition} onChange={v => set('condition', v)} options={CONDITIONS} placeholder="Select condition…" />
            </FieldRow>
          </>
        )}

        {itemType === 'bottle' && (
          <>
            <FieldRow label="Proof / ABV">
              <Input
                type="number"
                value={values.abv}
                onChange={e => set('abv', e.target.value)}
                placeholder="e.g. 43"
                style={inputStyle}
                className="placeholder:text-[rgba(224,216,200,0.3)]"
              />
            </FieldRow>
            <FieldRow label="Age (Years)">
              <Input
                type="number"
                value={values.age}
                onChange={e => set('age', e.target.value)}
                placeholder="e.g. 12"
                style={inputStyle}
                className="placeholder:text-[rgba(224,216,200,0.3)]"
              />
            </FieldRow>
          </>
        )}

        {itemType === 'cigar' && (
          <>
            <FieldRow label="Wrapper">
              <StyledSelect value={values.wrapper} onChange={v => set('wrapper', v)} options={WRAPPERS} placeholder="Select wrapper…" />
            </FieldRow>
            <FieldRow label="Body">
              <StyledSelect
                value={values.body}
                onChange={v => set('body', v)}
                options={CIGAR_BODY}
                placeholder="Select body…"
                labelMap={CIGAR_INTENSITY_LABELS}
              />
            </FieldRow>
            <FieldRow label="Strength">
              <StyledSelect
                value={values.strength}
                onChange={v => set('strength', v)}
                options={CIGAR_BODY}
                placeholder="Select strength…"
                labelMap={CIGAR_INTENSITY_LABELS}
              />
            </FieldRow>
            <FieldRow label="Flavor Notes">
              <Input
                value={values.flavor_notes_raw}
                onChange={e => set('flavor_notes_raw', e.target.value)}
                placeholder="e.g. Cedar, Leather, Coffee (comma separated)…"
                style={inputStyle}
                className="placeholder:text-[rgba(224,216,200,0.3)]"
              />
            </FieldRow>
          </>
        )}

        {itemType === 'wine' && (
          <>
            <FieldRow label="Vintage">
              <Input
                type="number"
                value={values.vintage}
                onChange={e => set('vintage', e.target.value)}
                placeholder="e.g. 2019"
                style={inputStyle}
                className="placeholder:text-[rgba(224,216,200,0.3)]"
              />
            </FieldRow>
            <FieldRow label="Varietal / Grape">
              <Input
                value={values.varietal}
                onChange={e => set('varietal', e.target.value)}
                placeholder="e.g. Cabernet Sauvignon"
                style={inputStyle}
                className="placeholder:text-[rgba(224,216,200,0.3)]"
              />
            </FieldRow>
            <FieldRow label="Region">
              <Input
                value={values.region}
                onChange={e => set('region', e.target.value)}
                placeholder="e.g. Bordeaux, Napa Valley"
                style={inputStyle}
                className="placeholder:text-[rgba(224,216,200,0.3)]"
              />
            </FieldRow>
            <FieldRow label="Appellation">
              <Input
                value={values.appellation}
                onChange={e => set('appellation', e.target.value)}
                placeholder="e.g. Margaux AOC"
                style={inputStyle}
                className="placeholder:text-[rgba(224,216,200,0.3)]"
              />
            </FieldRow>
            <FieldRow label="Style">
              <StyledSelect value={values.style} onChange={v => set('style', v)} options={WINE_STYLES} placeholder="Select style…" />
            </FieldRow>
            <FieldRow label="ABV %">
              <Input
                type="number"
                step="0.1"
                value={values.abv}
                onChange={e => set('abv', e.target.value)}
                placeholder="e.g. 13.5"
                style={inputStyle}
                className="placeholder:text-[rgba(224,216,200,0.3)]"
              />
            </FieldRow>
          </>
        )}

        <FieldRow label="Notes">
          <Textarea
            value={values.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Any personal notes…"
            rows={3}
            style={{ ...inputStyle, resize: 'none' }}
            className="placeholder:text-[rgba(224,216,200,0.3)]"
          />
        </FieldRow>

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