import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const CIGAR_STRENGTHS = ['Mild', 'Mild-Medium', 'Medium', 'Medium-Full', 'Full'];
const CIGAR_BODIES = ['Light', 'Medium', 'Full'];
const CIGAR_WRAPPERS = ['Connecticut', 'Habano', 'Maduro', 'Corojo', 'Cameroon', 'Sumatra', 'Oscuro', 'Other'];
const CIGAR_ORIGINS = ['Nicaragua', 'Dominican Republic', 'Honduras', 'Cuba', 'Mexico', 'Ecuador', 'USA', 'Other'];
const CIGAR_VITOLAS = ['Robusto', 'Toro', 'Churchill', 'Corona', 'Gordo', 'Lancero', 'Perfecto', 'Other'];
const CIGAR_FLAVORS = ['Earthy', 'Spicy', 'Sweet', 'Cocoa', 'Coffee', 'Nutty', 'Woody', 'Creamy', 'Peppery', 'Floral', 'Leather', 'Other'];
const CIGAR_OCCASIONS = ['Morning smoke', 'Afternoon smoke', 'Evening smoke', 'Long relaxing smoke', 'Quick smoke', 'Special occasion', 'Daily smoke'];
const CIGAR_PAIRINGS = ['Coffee', 'Whiskey', 'Rum', 'Beer', 'Wine', 'No pairing preference'];

function MultiSelectGroup({ label, options, selected = [], onToggle }) {
  return (
    <div className="space-y-2">
      <Label className="text-stone-700 font-medium">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <Badge
              key={opt}
              onClick={() => onToggle(opt)}
              className={`cursor-pointer border transition-colors ${
                active
                  ? 'bg-amber-700 text-white border-amber-700 hover:bg-amber-800'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
            >
              {opt}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

export default function CigarPreferencesSection({ preferences = {}, onChange }) {
  const prefs = {
    strengths: [],
    bodies: [],
    wrappers: [],
    origins: [],
    vitolas: [],
    flavors: [],
    occasions: [],
    pairings: [],
    ...preferences,
  };

  function toggle(field, value) {
    const current = prefs[field] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...prefs, [field]: updated });
  }

  return (
    <div className="space-y-5">
      <MultiSelectGroup
        label="Preferred Strengths"
        options={CIGAR_STRENGTHS}
        selected={prefs.strengths}
        onToggle={(v) => toggle('strengths', v)}
      />
      <MultiSelectGroup
        label="Preferred Body"
        options={CIGAR_BODIES}
        selected={prefs.bodies}
        onToggle={(v) => toggle('bodies', v)}
      />
      <MultiSelectGroup
        label="Preferred Wrappers"
        options={CIGAR_WRAPPERS}
        selected={prefs.wrappers}
        onToggle={(v) => toggle('wrappers', v)}
      />
      <MultiSelectGroup
        label="Preferred Origins"
        options={CIGAR_ORIGINS}
        selected={prefs.origins}
        onToggle={(v) => toggle('origins', v)}
      />
      <MultiSelectGroup
        label="Preferred Vitolas / Formats"
        options={CIGAR_VITOLAS}
        selected={prefs.vitolas}
        onToggle={(v) => toggle('vitolas', v)}
      />
      <MultiSelectGroup
        label="Flavor Preferences"
        options={CIGAR_FLAVORS}
        selected={prefs.flavors}
        onToggle={(v) => toggle('flavors', v)}
      />
      <MultiSelectGroup
        label="Smoking Style / Occasions"
        options={CIGAR_OCCASIONS}
        selected={prefs.occasions}
        onToggle={(v) => toggle('occasions', v)}
      />
      <MultiSelectGroup
        label="Pairing Preferences"
        options={CIGAR_PAIRINGS}
        selected={prefs.pairings}
        onToggle={(v) => toggle('pairings', v)}
      />
    </div>
  );
}