import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, Search, Cigarette, Check } from 'lucide-react';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { computeSessionDecrement, getAvailableQuantity } from '@/platform/cigarInventory';
import { CIGAR_STRENGTH_VALUES, formatCigarStrengthLabel } from '@/platform/cigarCatalog';
import { sortByLabel } from '@/lib/sorting/alphabetical';

const TODAY = new Date().toISOString().split('T')[0];

const DEFAULT_SESSION = {
  date: TODAY,
  duration_minutes: '',
  pairing: '',
  construction_notes: '',
  burn_notes: '',
  draw_notes: '',
  flavor_progression: '',
  first_third_notes: '',
  second_third_notes: '',
  final_third_notes: '',
  burn_quality: '',
  draw_quality: '',
  ash_quality: '',
  touch_ups: '',
  relights: '',
  duration_actual_minutes: '',
  strength_impression: '',
  overall_enjoyment: 0,
  would_buy_again: '',
  occasion: '',
  location: '',
  notes: '',
  not_for_me: false,
  wishlist_after: false,
  restock_after: false,
  favorite_after: false,
  is_out_of_collection: false,
  external_cigar_brand: '',
  external_cigar_name: '',
  external_cigar_vitola: '',
};

function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(224,216,200,0.6)' }}>
      {children}
    </label>
  );
}

function StyledInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <Input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(180,140,75,0.22)',
        color: '#F5F1E7',
        borderRadius: '0.5rem',
      }}
    />
  );
}

function StyledTextarea({ value, onChange, placeholder, rows = 2 }) {
  return (
    <Textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="resize-none w-full"
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

function StarRating({ value, onChange, max = 5 }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            aria-label={`${n} star`}
          >
            <Star
              className="w-6 h-6 transition-all"
              style={{ color: n <= value ? '#D4A574' : 'rgba(180,140,75,0.28)' }}
              fill={n <= value ? '#D4A574' : 'none'}
            />
          </button>
        );
      })}
      {value > 0 && (
        <span className="text-sm text-[#D4A574] ml-1 font-semibold">{value}/5</span>
      )}
    </div>
  );
}

function SourceToggle({ value, onChange }) {
  return (
    <div
      className="flex rounded-xl overflow-hidden mb-3"
      style={{ border: '1px solid rgba(180,140,75,0.25)' }}
    >
      {['collection', 'external'].map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className="flex-1 py-2 text-sm font-medium transition-all"
          style={{
            background: value === mode ? 'rgba(180,140,75,0.25)' : 'transparent',
            color: value === mode ? '#F5F1E7' : 'rgba(224,216,200,0.55)',
          }}
        >
          {mode === 'collection' ? 'From Collection' : 'Out of Collection'}
        </button>
      ))}
    </div>
  );
}

function CigarPicker({ cigars, selectedId, onSelect }) {
  const [search, setSearch] = useState('');

  const cigarList = Array.isArray(cigars) ? cigars : [];
  const filtered = cigarList.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.name?.toLowerCase().includes(q) ||
      c.brand?.toLowerCase().includes(q) ||
      c.vitola?.toLowerCase().includes(q)
    );
  });
  const sorted = sortByLabel(filtered, (cigar) => `${cigar?.name || ''} ${cigar?.brand || ''}`);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4A574]/50" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your cigars…"
          className="pl-9"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(180,140,75,0.22)',
            color: '#F5F1E7',
            borderRadius: '0.5rem',
          }}
        />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
        {sorted.length === 0 ? (
          <p className="text-xs text-[#E0D8C8]/40 text-center py-4">No cigars found</p>
        ) : (
          sorted.map((c) => {
            const isSelected = c.id === selectedId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(isSelected ? null : c)}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all"
                style={{
                  background: isSelected ? 'rgba(140,107,63,0.2)' : 'rgba(255,255,255,0.025)',
                  border: isSelected ? '1px solid rgba(180,140,75,0.5)' : '1px solid rgba(180,140,75,0.14)',
                }}
              >
                <Cigarette className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(180,140,75,0.5)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#F5F1E7] truncate">{c.name}</p>
                  <p className="text-xs text-[#E0D8C8]/55 truncate">
                    {[c.brand, c.vitola].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {isSelected && <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#D4A574' }} />}
              </button>
            );
          })
        )}
      </div>
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

export default function CigarSessionModal({ isOpen, onClose, defaultCigar, onSessionSaved, editSession }) {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const isEditMode = !!editSession;
  const [cigarMode, setCigarMode] = useState('collection');
  const [selectedCigar, setSelectedCigar] = useState(defaultCigar || null);
  const [form, setForm] = useState({ ...DEFAULT_SESSION });
  const [shouldDecrement, setShouldDecrement] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: cigars = [] } = useQuery({
    queryKey: ['cigars', user?.email],
    queryFn: () => base44.entities.Cigar.filter({ created_by: user?.email }),
    enabled: !!user?.email && isOpen,
  });

  useEffect(() => {
    if (!isOpen) {
      setForm({ ...DEFAULT_SESSION });
      setCigarMode('collection');
      setSelectedCigar(defaultCigar || null);
      setShouldDecrement(true);
      setSaving(false);
    } else if (isEditMode && editSession) {
      // Populate form from existing session for editing
      setForm({
        date: editSession.date || DEFAULT_SESSION.date,
        duration_minutes: editSession.duration_minutes != null ? String(editSession.duration_minutes) : '',
        pairing: editSession.pairing || '',
        construction_notes: editSession.construction_notes || '',
        burn_notes: editSession.burn_notes || '',
        draw_notes: editSession.draw_notes || '',
        flavor_progression: editSession.flavor_progression || '',
        first_third_notes: editSession.first_third_notes || '',
        second_third_notes: editSession.second_third_notes || '',
        final_third_notes: editSession.final_third_notes || '',
        burn_quality: editSession.burn_quality || '',
        draw_quality: editSession.draw_quality || '',
        ash_quality: editSession.ash_quality || '',
        touch_ups: editSession.touch_ups != null ? String(editSession.touch_ups) : '',
        relights: editSession.relights != null ? String(editSession.relights) : '',
        duration_actual_minutes: editSession.duration_actual_minutes != null ? String(editSession.duration_actual_minutes) : '',
        strength_impression: editSession.strength_impression || '',
        overall_enjoyment: editSession.overall_enjoyment || 0,
        would_buy_again: editSession.would_buy_again || '',
        occasion: editSession.occasion || '',
        location: editSession.location || '',
        notes: editSession.notes || '',
        not_for_me: editSession.not_for_me || false,
        wishlist_after: editSession.wishlist_after || false,
        restock_after: false,
        favorite_after: false,
        is_out_of_collection: editSession.is_out_of_collection || false,
        external_cigar_brand: editSession.external_cigar_brand || '',
        external_cigar_name: editSession.external_cigar_name || '',
        external_cigar_vitola: editSession.external_cigar_vitola || '',
      });
      setCigarMode(editSession.is_out_of_collection ? 'external' : 'collection');
      setShouldDecrement(false); // Never decrement when editing — inventory was already decremented when the session was originally created
    } else if (defaultCigar) {
      setSelectedCigar(defaultCigar);
    }
  }, [isOpen, defaultCigar, editSession, isEditMode]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e?.target ? e.target.value : e }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isExternal = cigarMode === 'external';
      if (!isExternal && !selectedCigar?.id) {
        toast.error('Select a cigar from your collection');
        setSaving(false);
        return;
      }
      const { restock_after, favorite_after, ...sessionFields } = form;
      const payload = {
        ...sessionFields,
        date: form.date || TODAY,
        is_out_of_collection: isExternal,
        cigar_id: !isExternal && selectedCigar ? selectedCigar.id : undefined,
        cigar_name: !isExternal && selectedCigar
          ? [selectedCigar.brand, selectedCigar.name].filter(Boolean).join(' ')
          : undefined,
        duration_minutes: form.duration_minutes !== '' ? Number(form.duration_minutes) : undefined,
        duration_actual_minutes: form.duration_actual_minutes !== '' ? Number(form.duration_actual_minutes) : undefined,
        touch_ups: form.touch_ups !== '' ? Number(form.touch_ups) : undefined,
        relights: form.relights !== '' ? Number(form.relights) : undefined,
        overall_enjoyment: form.overall_enjoyment || undefined,
      };

      if (isEditMode && editSession?.id) {
        // Update existing session
        await base44.entities.CigarSession.update(editSession.id, payload);
        toast.success('Session updated!');
      } else {
        // Create new session
        payload.created_by = user?.email;
        await base44.entities.CigarSession.create(payload);

        // Optionally decrement inventory for new collection cigar sessions
        if (!isExternal && selectedCigar && shouldDecrement) {
          const decrementFields = computeSessionDecrement(selectedCigar);
          if (decrementFields) {
            try {
              await base44.entities.Cigar.update(selectedCigar.id, decrementFields);
              queryClient.invalidateQueries({ queryKey: ['cigars'] });
              queryClient.invalidateQueries({ queryKey: ['cigars-summary'] });
              queryClient.invalidateQueries({ queryKey: ['cigar-detail'] });
            } catch {
              // Non-fatal: session was saved; inventory update failed silently
            }
          }
        }

        // Optional post-session updates for collection cigar records
        if (!isExternal && selectedCigar) {
          const cigarPatch = {};
          if (form.wishlist_after) cigarPatch.wishlist = true;
          if (form.restock_after) cigarPatch.restock_flag = true;
          if (form.favorite_after) cigarPatch.is_favorite = true;
          if (form.not_for_me) {
            cigarPatch.not_for_me = true;
            cigarPatch.ai_excluded = true;
          }
          if (Object.keys(cigarPatch).length > 0) {
            try {
              await base44.entities.Cigar.update(selectedCigar.id, cigarPatch);
              queryClient.invalidateQueries({ queryKey: ['cigars'] });
            } catch {
              // Non-fatal: session already saved
            }
          }
        }

        toast.success('Session logged!');
      }

      if (typeof onSessionSaved === 'function') onSessionSaved();
      onClose();
    } catch {
      toast.error(isEditMode ? 'Failed to update session' : 'Failed to save session');
    } finally {
      setSaving(false);
    }
  };

  const selectItemStyle = { color: '#F5F1E7', background: 'rgba(40,28,18,0.98)' };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: 'rgba(40,28,18,0.98)',
          border: '1px solid rgba(180,140,75,0.28)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            {isEditMode ? 'Edit Cigar Session' : 'Log Cigar Session'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Date & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Date</FieldLabel>
              <StyledInput type="date" value={form.date} onChange={set('date')} />
            </div>
            <div>
              <FieldLabel>Duration (min)</FieldLabel>
              <StyledInput type="number" value={form.duration_minutes} onChange={set('duration_minutes')} placeholder="60" />
            </div>
          </div>

          {/* Cigar selection */}
          <div>
            <FieldLabel>Cigar</FieldLabel>
            <SourceToggle value={cigarMode} onChange={setCigarMode} />
            {cigarMode === 'collection' ? (
              <CigarPicker
                cigars={cigars}
                selectedId={selectedCigar?.id}
                onSelect={setSelectedCigar}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <FieldLabel>Brand</FieldLabel>
                  <StyledInput value={form.external_cigar_brand} onChange={set('external_cigar_brand')} placeholder="Brand" />
                </div>
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <StyledInput value={form.external_cigar_name} onChange={set('external_cigar_name')} placeholder="Name" />
                </div>
                <div>
                  <FieldLabel>Vitola</FieldLabel>
                  <StyledInput value={form.external_cigar_vitola} onChange={set('external_cigar_vitola')} placeholder="e.g. Robusto" />
                </div>
              </div>
            )}
          </div>

          {/* Pairing */}
          <div>
            <FieldLabel>Pairing</FieldLabel>
            <StyledInput value={form.pairing} onChange={set('pairing')} placeholder="e.g. Bourbon, Coffee, Port…" />
          </div>

          {/* Smoke notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Construction Notes</FieldLabel>
              <StyledTextarea value={form.construction_notes} onChange={set('construction_notes')} placeholder="Cap, foot, overall construction…" />
            </div>
            <div>
              <FieldLabel>Burn Notes</FieldLabel>
              <StyledTextarea value={form.burn_notes} onChange={set('burn_notes')} placeholder="Even, wavy, tunneling…" />
            </div>
            <div>
              <FieldLabel>Draw Notes</FieldLabel>
              <StyledTextarea value={form.draw_notes} onChange={set('draw_notes')} placeholder="Open, tight, perfect…" />
            </div>
            <div>
              <FieldLabel>Flavor Progression</FieldLabel>
              <StyledTextarea value={form.flavor_progression} onChange={set('flavor_progression')} placeholder="First third → second → final…" />
            </div>
            <div>
              <FieldLabel>First Third</FieldLabel>
              <StyledTextarea value={form.first_third_notes} onChange={set('first_third_notes')} placeholder="Opening notes…" />
            </div>
            <div>
              <FieldLabel>Second Third</FieldLabel>
              <StyledTextarea value={form.second_third_notes} onChange={set('second_third_notes')} placeholder="Midpoint notes…" />
            </div>
            <div>
              <FieldLabel>Final Third</FieldLabel>
              <StyledTextarea value={form.final_third_notes} onChange={set('final_third_notes')} placeholder="Final third notes…" />
            </div>
          </div>

          {/* Strength impression */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
            <FieldLabel>Strength Impression</FieldLabel>
              <StyledSelect value={form.strength_impression} onValueChange={set('strength_impression')} placeholder="Select impression">
                {CIGAR_STRENGTH_VALUES.map((v) => (
                  <SelectItem key={v} value={v} style={selectItemStyle}>
                    {formatCigarStrengthLabel(v)}
                  </SelectItem>
                ))}
              </StyledSelect>
            </div>
            <div>
              <FieldLabel>Actual Duration (min)</FieldLabel>
              <StyledInput type="number" value={form.duration_actual_minutes} onChange={set('duration_actual_minutes')} placeholder="Actual time smoked" />
            </div>
            <div>
              <FieldLabel>Burn Quality</FieldLabel>
              <StyledSelect value={form.burn_quality} onValueChange={set('burn_quality')} placeholder="Select quality">
                {['poor', 'fair', 'good', 'excellent'].map((v) => <SelectItem key={v} value={v} style={selectItemStyle}>{v}</SelectItem>)}
              </StyledSelect>
            </div>
            <div>
              <FieldLabel>Draw Quality</FieldLabel>
              <StyledSelect value={form.draw_quality} onValueChange={set('draw_quality')} placeholder="Select quality">
                {['poor', 'fair', 'good', 'excellent'].map((v) => <SelectItem key={v} value={v} style={selectItemStyle}>{v}</SelectItem>)}
              </StyledSelect>
            </div>
            <div>
              <FieldLabel>Ash Quality</FieldLabel>
              <StyledSelect value={form.ash_quality} onValueChange={set('ash_quality')} placeholder="Select quality">
                {['poor', 'fair', 'good', 'excellent'].map((v) => <SelectItem key={v} value={v} style={selectItemStyle}>{v}</SelectItem>)}
              </StyledSelect>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Touch-ups</FieldLabel>
                <StyledInput type="number" value={form.touch_ups} onChange={set('touch_ups')} placeholder="0" />
              </div>
              <div>
                <FieldLabel>Relights</FieldLabel>
                <StyledInput type="number" value={form.relights} onChange={set('relights')} placeholder="0" />
              </div>
            </div>
          </div>

          {/* Overall enjoyment */}
          <div>
            <FieldLabel>Overall Enjoyment</FieldLabel>
            <StarRating
              value={form.overall_enjoyment}
              onChange={(val) => setForm((f) => ({ ...f, overall_enjoyment: val }))}
            />
          </div>

          {/* Would buy again */}
          <div>
            <FieldLabel>Would Buy Again?</FieldLabel>
            <StyledSelect value={form.would_buy_again} onValueChange={set('would_buy_again')} placeholder="Select…">
              {['yes', 'maybe', 'no'].map((v) => (
                <SelectItem key={v} value={v} style={selectItemStyle}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </SelectItem>
              ))}
            </StyledSelect>
          </div>

          {/* Occasion & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Occasion</FieldLabel>
              <StyledInput value={form.occasion} onChange={set('occasion')} placeholder="e.g. Celebration, Evening…" />
            </div>
            <div>
              <FieldLabel>Location</FieldLabel>
              <StyledInput value={form.location} onChange={set('location')} placeholder="e.g. Back porch, Lounge…" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <FieldLabel>Session Notes</FieldLabel>
            <StyledTextarea value={form.notes} onChange={set('notes')} placeholder="Overall impressions…" rows={3} />
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-4 pt-1">
            <CheckToggle
              label="Not for me"
              checked={form.not_for_me}
              onChange={(v) => setForm((f) => ({ ...f, not_for_me: v }))}
            />
            {(cigarMode === 'external' || cigarMode === 'collection') && (
              <CheckToggle
                label={cigarMode === 'external' ? 'Add to wishlist after' : 'Add to wishlist'}
                checked={form.wishlist_after}
                onChange={(v) => setForm((f) => ({ ...f, wishlist_after: v }))}
              />
            )}
            {cigarMode === 'collection' && (
              <>
                <CheckToggle
                  label="Mark restock"
                  checked={form.restock_after}
                  onChange={(v) => setForm((f) => ({ ...f, restock_after: v }))}
                />
                <CheckToggle
                  label="Mark favorite"
                  checked={form.favorite_after}
                  onChange={(v) => setForm((f) => ({ ...f, favorite_after: v }))}
                />
              </>
            )}
          </div>

          {/* Inventory decrement (collection mode only, when cigar has inventory) */}
          {cigarMode === 'collection' && selectedCigar && getAvailableQuantity(selectedCigar) > 0 && (
            <div
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{
                background: 'rgba(140,107,63,0.08)',
                border: '1px solid rgba(180,140,75,0.18)',
              }}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: '#F5F1E7' }}>
                  Deduct from inventory
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.55)' }}>
                  Removes 1 stick from "{selectedCigar.name}" · {getAvailableQuantity(selectedCigar)} remaining
                </p>
              </div>
              <CheckToggle
                label=""
                checked={shouldDecrement}
                onChange={setShouldDecrement}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t border-[rgba(180,140,75,0.12)]">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              style={{ color: 'rgba(224,216,200,0.6)' }}
            >
              Cancel
            </Button>
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
              {saving ? 'Saving…' : isEditMode ? 'Update Session' : 'Log Session'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
