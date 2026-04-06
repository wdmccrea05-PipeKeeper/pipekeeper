import React from 'react';

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
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'rgba(212,165,116,0.75)' }}
      >
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className="cursor-pointer rounded-full px-3 py-1 text-xs font-medium border transition-colors"
              style={
                active
                  ? {
                      background: 'rgba(163,92,92,0.28)',
                      border: '1px solid rgba(163,92,92,0.6)',
                      color: '#F5F1E7',
                    }
                  : {
                      background: 'rgba(60,45,30,0.45)',
                      border: '1px solid rgba(140,105,65,0.25)',
                      color: 'rgba(224,216,200,0.65)',
                    }
              }
            >
              {opt}
            </button>
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