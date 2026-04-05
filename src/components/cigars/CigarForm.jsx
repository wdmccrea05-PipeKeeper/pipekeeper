import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Star, Plus } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useQuery } from '@tanstack/react-query';
import PhotoUploader from '@/components/PhotoUploader';
import { toast } from 'sonner';

const DEFAULT_FORM = {
  name: '',
  brand: '',
  line: '',
  vitola: '',
  wrapper: '',
  binder: '',
  filler: '',
  country_of_origin: '',
  factory: '',
  length_inches: '',
  ring_gauge: '',
  body: '',
  strength: '',
  flavor_notes: [],
  production_status: '',
  release_type: '',
  purchase_source: '',
  purchase_date: '',
  purchase_price: '',
  estimated_value: '',
  quantity: '',
  unit_type: '',
  cigars_per_package: '',
  singles_equivalent: '',
  humidor_id: '',
  storage_notes: '',
  aging_start_date: '',
  ready_to_smoke_date: '',
  personal_notes: '',
  rating: 0,
  is_favorite: false,
  wishlist: false,
  restock_flag: false,
  barcode: '',
  upc: '',
  ean: '',
  aliases: [],
  photos: [],
  ai_excluded: false,
  public_visibility: false,
};

const SECTION_HEADING = {
  color: '#F5F1E7',
  fontFamily: "'Georgia', serif",
  fontSize: '1rem',
  fontWeight: 700,
  marginBottom: '0.75rem',
};

function SectionBlock({ title, children }) {
  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.15)' }}
    >
      <h3 style={SECTION_HEADING}>{title}</h3>
      {children}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(224,216,200,0.6)' }}>
      {children}
    </label>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function StyledInput({ value, onChange, placeholder, type = 'text', ...props }) {
  return (
    <Input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(180,140,75,0.22)',
        color: '#F5F1E7',
        borderRadius: '0.5rem',
      }}
      {...props}
    />
  );
}

function StyledTextarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <Textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(180,140,75,0.22)',
        color: '#F5F1E7',
        borderRadius: '0.5rem',
      }}
    />
  );
}

function StyledSelect({ value, onValueChange, placeholder, children }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(180,140,75,0.22)',
          color: value ? '#F5F1E7' : 'rgba(224,216,200,0.4)',
          borderRadius: '0.5rem',
        }}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent style={{ background: 'rgba(40,28,18,0.98)', border: '1px solid rgba(180,140,75,0.3)' }}>
        {children}
      </SelectContent>
    </Select>
  );
}

function StarRating({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          aria-label={`Rate ${n}`}
        >
          <Star
            className="w-5 h-5 transition-all"
            style={{ color: n <= value ? '#D4A574' : 'rgba(180,140,75,0.3)' }}
            fill={n <= value ? '#D4A574' : 'none'}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="text-sm text-[#D4A574] ml-2 font-semibold">{value}/5</span>
      )}
    </div>
  );
}

function TagInput({ label, values, onChange, placeholder }) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput('');
  };

  const remove = (tag) => onChange(values.filter((v) => v !== tag));

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2 mb-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(180,140,75,0.22)',
            color: '#F5F1E7',
            borderRadius: '0.5rem',
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={add}
          style={{ border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574' }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(180,140,75,0.18)', border: '1px solid rgba(180,140,75,0.28)', color: '#F5F1E7' }}
            >
              {tag}
              <button type="button" onClick={() => remove(tag)} className="hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckToggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className="w-10 h-5 rounded-full transition-all relative"
        style={{
          background: checked ? '#8C6B3F' : 'rgba(180,140,75,0.18)',
          border: '1px solid rgba(180,140,75,0.3)',
        }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
          style={{
            left: checked ? '1.25rem' : '0.125rem',
            background: checked ? '#D4A574' : 'rgba(224,216,200,0.45)',
          }}
        />
      </div>
      <span className="text-sm text-[#F5F1E7]">{label}</span>
    </label>
  );
}

export default function CigarForm({ cigar, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const { user } = useCurrentUser();

  const [form, setForm] = useState(() => ({
    ...DEFAULT_FORM,
    ...(cigar || {}),
    flavor_notes: Array.isArray(cigar?.flavor_notes) ? cigar.flavor_notes : [],
    aliases: Array.isArray(cigar?.aliases) ? cigar.aliases : [],
    photos: Array.isArray(cigar?.photos) ? cigar.photos : [],
    rating: cigar?.rating ?? 0,
  }));

  const [saving, setSaving] = useState(false);
  const [aliasInput, setAliasInput] = useState(
    Array.isArray(cigar?.aliases) ? cigar.aliases.join(', ') : ''
  );

  // Smart defaults: set cigars_per_package when unit_type changes
  const PACKAGE_DEFAULTS = { single: 1, '5pack': 5, pack: 5, box: 20, bundle: 25, partial_box: 20 };

  const handleUnitTypeChange = (val) => {
    setForm((f) => {
      const perPkg = val && PACKAGE_DEFAULTS[val] != null ? String(PACKAGE_DEFAULTS[val]) : f.cigars_per_package;
      const qty = f.quantity !== '' ? Number(f.quantity) : null;
      const cpp = perPkg !== '' ? Number(perPkg) : null;
      const autoSingles = val !== 'partial_box' && qty != null && cpp != null ? String(qty * cpp) : f.singles_equivalent;
      return { ...f, unit_type: val, cigars_per_package: perPkg, singles_equivalent: autoSingles };
    });
  };

  // Auto-recalculate singles_equivalent when quantity or cigars_per_package changes (except partial_box)
  const handleQuantityOrCppChange = (field) => (e) => {
    const raw = e?.target ? e.target.value : e;
    setForm((f) => {
      const updated = { ...f, [field]: raw };
      if (updated.unit_type && updated.unit_type !== 'partial_box') {
        const qty = updated.quantity !== '' ? Number(updated.quantity) : null;
        const cpp = updated.cigars_per_package !== '' ? Number(updated.cigars_per_package) : null;
        if (qty != null && cpp != null && !Number.isNaN(qty) && !Number.isNaN(cpp)) {
          updated.singles_equivalent = String(qty * cpp);
        }
      }
      return updated;
    });
  };

  const { data: humidors = [] } = useQuery({
    queryKey: ['humidors', user?.email],
    queryFn: () => base44.entities.HumidorLocation.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e?.target ? e.target.value : e }));

  const handleAliasBlur = () => {
    const arr = aliasInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setForm((f) => ({ ...f, aliases: arr }));
  };

  const handlePhotos = (photoUrls) => {
    setForm((f) => ({ ...f, photos: photoUrls }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      toast.error('Cigar name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        // Numeric conversions
        purchase_price: form.purchase_price !== '' ? Number(form.purchase_price) : undefined,
        estimated_value: form.estimated_value !== '' ? Number(form.estimated_value) : undefined,
        quantity: form.quantity !== '' ? Number(form.quantity) : undefined,
        cigars_per_package: form.cigars_per_package !== '' ? Number(form.cigars_per_package) : undefined,
        singles_equivalent: form.singles_equivalent !== '' ? Number(form.singles_equivalent) : undefined,
        length_inches: form.length_inches !== '' ? Number(form.length_inches) : undefined,
        ring_gauge: form.ring_gauge !== '' ? Number(form.ring_gauge) : undefined,
        rating: form.rating || undefined,
        // Clean empty enum/string fields so we don't send invalid values
        body: form.body || undefined,
        strength: form.strength || undefined,
        unit_type: form.unit_type || undefined,
        production_status: form.production_status || undefined,
        release_type: form.release_type || undefined,
        humidor_id: form.humidor_id || undefined,
      };
      let result;
      if (cigar?.id) {
        result = await base44.entities.Cigar.update(cigar.id, {
          ...payload,
          created_by: cigar.created_by || user?.email,
        });
        toast.success('Cigar updated');
      } else {
        result = await base44.entities.Cigar.create({
          ...payload,
          created_by: user?.email,
        });
        toast.success('Cigar added to collection');
      }
      if (typeof onSubmit === 'function') onSubmit(result || payload);
    } catch (err) {
      console.error('[CigarForm] save error:', err);
      toast.error('Failed to save cigar');
    } finally {
      setSaving(false);
    }
  };

  const selectItemStyle = { color: '#F5F1E7', background: 'rgba(40,28,18,0.98)' };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Identity */}
      <SectionBlock title="Identity">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Name *">
            <StyledInput value={form.name} onChange={set('name')} placeholder="e.g. Serie V" />
          </FormField>
          <FormField label="Brand">
            <StyledInput value={form.brand} onChange={set('brand')} placeholder="e.g. Oliva" />
          </FormField>
          <FormField label="Line / Series">
            <StyledInput value={form.line} onChange={set('line')} placeholder="e.g. Melanio" />
          </FormField>
          <FormField label="Vitola">
            <StyledInput value={form.vitola} onChange={set('vitola')} placeholder="e.g. Robusto" />
          </FormField>
        </div>
      </SectionBlock>

      {/* Section 2: Construction */}
      <SectionBlock title="Construction">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Wrapper">
            <StyledInput value={form.wrapper} onChange={set('wrapper')} placeholder="e.g. Maduro" />
          </FormField>
          <FormField label="Binder">
            <StyledInput value={form.binder} onChange={set('binder')} placeholder="e.g. Nicaraguan" />
          </FormField>
          <FormField label="Filler">
            <StyledInput value={form.filler} onChange={set('filler')} placeholder="e.g. Nicaraguan blend" />
          </FormField>
          <FormField label="Country of Origin">
            <StyledInput value={form.country_of_origin} onChange={set('country_of_origin')} placeholder="e.g. Nicaragua" />
          </FormField>
          <FormField label="Factory">
            <StyledInput value={form.factory} onChange={set('factory')} placeholder="e.g. TABACOS OLIVA" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Length (in)">
              <StyledInput type="number" value={form.length_inches} onChange={set('length_inches')} placeholder="5.0" />
            </FormField>
            <FormField label="Ring Gauge">
              <StyledInput type="number" value={form.ring_gauge} onChange={set('ring_gauge')} placeholder="50" />
            </FormField>
          </div>
        </div>
      </SectionBlock>

      {/* Section 3: Profile */}
      <SectionBlock title="Profile">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Body">
            <StyledSelect value={form.body} onValueChange={set('body')} placeholder="Select body">
              {['mild', 'mild_medium', 'medium', 'medium_full', 'full'].map((v) => (
                <SelectItem key={v} value={v} style={selectItemStyle}>
                  {v.replace('_', '-').replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </StyledSelect>
          </FormField>
          <FormField label="Strength">
            <StyledSelect value={form.strength} onValueChange={set('strength')} placeholder="Select strength">
              {['mild', 'mild_medium', 'medium', 'medium_full', 'full'].map((v) => (
                <SelectItem key={v} value={v} style={selectItemStyle}>
                  {v.replace('_', '-').replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </StyledSelect>
          </FormField>
          <FormField label="Production Status">
            <StyledSelect value={form.production_status} onValueChange={set('production_status')} placeholder="Select status">
              {['regular_production', 'limited', 'seasonal', 'discontinued', 'unknown'].map((v) => (
                <SelectItem key={v} value={v} style={selectItemStyle}>
                  {v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </StyledSelect>
          </FormField>
          <FormField label="Release Type">
            <StyledSelect value={form.release_type} onValueChange={set('release_type')} placeholder="Select release type">
              {['regular', 'limited_edition', 'annual_release', 'special_release', 'collaboration'].map((v) => (
                <SelectItem key={v} value={v} style={selectItemStyle}>
                  {v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </StyledSelect>
          </FormField>
        </div>
        <TagInput
          label="Flavor Notes"
          values={form.flavor_notes}
          onChange={(val) => setForm((f) => ({ ...f, flavor_notes: val }))}
          placeholder="Add a note (press Enter)"
        />
      </SectionBlock>

      {/* Section 4: Acquisition */}
      <SectionBlock title="Acquisition">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Purchase Source">
            <StyledInput value={form.purchase_source} onChange={set('purchase_source')} placeholder="e.g. Famous Smoke Shop" />
          </FormField>
          <FormField label="Purchase Date">
            <StyledInput type="date" value={form.purchase_date} onChange={set('purchase_date')} />
          </FormField>
          <FormField label="Purchase Price ($)">
            <StyledInput type="number" value={form.purchase_price} onChange={set('purchase_price')} placeholder="0.00" />
          </FormField>
          <FormField label="Estimated Value ($)">
            <StyledInput type="number" value={form.estimated_value} onChange={set('estimated_value')} placeholder="0.00" />
          </FormField>
        </div>
      </SectionBlock>

      {/* Section 5: Inventory */}
      <SectionBlock title="Inventory">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Unit Type">
            <StyledSelect value={form.unit_type} onValueChange={handleUnitTypeChange} placeholder="Select unit">
              {['single', '5pack', 'pack', 'box', 'bundle', 'partial_box'].map((v) => (
                <SelectItem key={v} value={v} style={selectItemStyle}>
                  {v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </StyledSelect>
          </FormField>
          <FormField label="Quantity">
            <StyledInput type="number" value={form.quantity} onChange={handleQuantityOrCppChange('quantity')} placeholder="1" />
          </FormField>
          <FormField label="Cigars per Package">
            <StyledInput
              type="number"
              value={form.cigars_per_package}
              onChange={handleQuantityOrCppChange('cigars_per_package')}
              placeholder={form.unit_type === 'single' ? '1' : form.unit_type === '5pack' ? '5' : 'e.g. 20'}
            />
          </FormField>
          <FormField label={form.unit_type === 'partial_box' ? 'Remaining Sticks' : 'Total Sticks'}>
            <StyledInput
              type="number"
              value={form.singles_equivalent}
              onChange={set('singles_equivalent')}
              placeholder={form.unit_type === 'partial_box' ? 'e.g. 8' : 'Auto-calculated'}
            />
          </FormField>
          <FormField label="Humidor">
            <StyledSelect value={form.humidor_id} onValueChange={set('humidor_id')} placeholder="Select humidor">
              <SelectItem value="" style={selectItemStyle}>None</SelectItem>
              {humidors.map((h) => (
                <SelectItem key={h.id} value={h.id} style={selectItemStyle}>
                  {h.name}
                </SelectItem>
              ))}
            </StyledSelect>
          </FormField>
          <FormField label="Aging Start Date">
            <StyledInput type="date" value={form.aging_start_date} onChange={set('aging_start_date')} />
          </FormField>
          <FormField label="Ready to Smoke Date">
            <StyledInput type="date" value={form.ready_to_smoke_date} onChange={set('ready_to_smoke_date')} />
          </FormField>
        </div>
        <FormField label="Storage Notes">
          <StyledTextarea value={form.storage_notes} onChange={set('storage_notes')} placeholder="Storage conditions, shelf placement…" rows={2} />
        </FormField>
      </SectionBlock>

      {/* Section 6: Notes & Tags */}
      <SectionBlock title="Notes & Tags">
        <FormField label="Personal Notes">
          <StyledTextarea value={form.personal_notes} onChange={set('personal_notes')} placeholder="Tasting impressions, context…" rows={4} />
        </FormField>
        <div>
          <FieldLabel>Rating</FieldLabel>
          <StarRating value={form.rating} onChange={(val) => setForm((f) => ({ ...f, rating: val }))} />
        </div>
        <div className="flex flex-wrap gap-4 pt-1">
          <CheckToggle label="Favorite" checked={form.is_favorite} onChange={(v) => setForm((f) => ({ ...f, is_favorite: v }))} />
          <CheckToggle label="Wishlist" checked={form.wishlist} onChange={(v) => setForm((f) => ({ ...f, wishlist: v }))} />
          <CheckToggle label="Restock Flag" checked={form.restock_flag} onChange={(v) => setForm((f) => ({ ...f, restock_flag: v }))} />
        </div>
      </SectionBlock>

      {/* Section 7: Identifiers */}
      <SectionBlock title="Identifiers">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Barcode">
            <StyledInput value={form.barcode} onChange={set('barcode')} placeholder="Barcode" />
          </FormField>
          <FormField label="UPC">
            <StyledInput value={form.upc} onChange={set('upc')} placeholder="UPC" />
          </FormField>
          <FormField label="EAN">
            <StyledInput value={form.ean} onChange={set('ean')} placeholder="EAN" />
          </FormField>
        </div>
        <FormField label="Aliases (comma-separated)">
          <StyledInput
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
            onBlur={handleAliasBlur}
            placeholder="Alternate names, SKUs…"
          />
        </FormField>
      </SectionBlock>

      {/* Section 8: Photos */}
      <SectionBlock title="Photos">
        <PhotoUploader
          existingPhotos={form.photos}
          onPhotosSelected={handlePhotos}
          maxPhotos={10}
          recordType="cigar"
          recordData={cigar}
        />
      </SectionBlock>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        {typeof onCancel === 'function' && (
          <Button type="button" variant="ghost" onClick={onCancel} style={{ color: 'rgba(224,216,200,0.7)' }}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={saving}
          style={{
            background: 'linear-gradient(135deg, #8C6B3F, #6B4F2E)',
            border: '1px solid rgba(180,140,75,0.4)',
            color: '#F5F1E7',
            fontWeight: 600,
          }}
        >
          {saving ? 'Saving…' : cigar?.id ? 'Update Cigar' : 'Add Cigar'}
        </Button>
      </div>
    </form>
  );
}
