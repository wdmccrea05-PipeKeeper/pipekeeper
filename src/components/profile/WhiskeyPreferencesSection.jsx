import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const WHISKEY_TYPES = [
  'Scotch', 'Bourbon', 'Rye', 'Irish', 'Japanese', 'Blended', 'Single Malt', 'Canadian', 'Other',
];

const WHISKEY_FLAVORS = [
  'Peated', 'Smoky', 'Sherried', 'Sweet', 'Spicy', 'Fruity',
  'Full Proof', 'Cask Strength', 'Honey', 'Vanilla', 'Oaky', 'Floral',
];

const DRINKING_STYLES = [
  'Neat', 'On the rocks', 'With water', 'In cocktails',
];

const COCKTAILS = [
  'Old Fashioned', 'Manhattan', 'Whiskey Sour', 'Boulevardier', 'Highball',
  'Penicillin', 'Rob Roy', 'Rusty Nail',
];

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
                  ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
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

export default function WhiskeyPreferencesSection({ preferences = {}, onChange }) {
  const prefs = {
    types: [],
    flavors: [],
    drinking_style: [],
    cocktails: [],
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
        label="Preferred Whiskey Types"
        options={WHISKEY_TYPES}
        selected={prefs.types}
        onToggle={(v) => toggle('types', v)}
      />
      <MultiSelectGroup
        label="Flavor Preferences"
        options={WHISKEY_FLAVORS}
        selected={prefs.flavors}
        onToggle={(v) => toggle('flavors', v)}
      />
      <MultiSelectGroup
        label="Drinking Style"
        options={DRINKING_STYLES}
        selected={prefs.drinking_style}
        onToggle={(v) => toggle('drinking_style', v)}
      />
      <MultiSelectGroup
        label="Cocktail Preferences"
        options={COCKTAILS}
        selected={prefs.cocktails}
        onToggle={(v) => toggle('cocktails', v)}
      />
    </div>
  );
}