import React from 'react';

const WINE_STYLES = ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert', 'Fortified', 'Orange', 'Other'];

const WINE_VARIETALS = [
  'Cabernet Sauvignon', 'Pinot Noir', 'Chardonnay', 'Sauvignon Blanc',
  'Riesling', 'Syrah/Shiraz', 'Merlot', 'Malbec', 'Sangiovese',
  'Nebbiolo', 'Tempranillo', 'Grenache', 'Chenin Blanc',
  'Champagne/Sparkling grapes',
];

const WINE_REGIONS = [
  'Bordeaux', 'Burgundy', 'Napa Valley', 'Sonoma', 'Willamette Valley',
  'Rioja', 'Tuscany', 'Piedmont', 'Rhône', 'Champagne', 'Loire',
  'Mosel', 'Mendoza', 'Barossa', 'Marlborough',
];

const DRINKING_GOALS = [
  'Drink now', 'Age/hold bottles', 'Collect investment bottles',
  'Everyday drinkers', 'Special occasion bottles',
];

const PAIRING_INTERESTS = [
  'Food pairings', 'Cigar pairings', 'Pipe/tobacco pairings',
  'Whiskey pairings', 'Occasion pairings',
];

const FLAVOR_PROFILES = [
  'Light', 'Medium', 'Full-bodied', 'Dry', 'Sweet', 'Tannic',
  'Fruit-forward', 'Earthy', 'Oaky', 'Mineral', 'Acid-driven',
];

const CELLAR_STRATEGIES = [
  { value: 'drink_within_1yr', label: 'Drink within 1 year' },
  { value: 'short_term', label: 'Short-term cellar (1–5 yrs)' },
  { value: 'long_term', label: 'Long-term aging (5+ yrs)' },
  { value: 'mixed', label: 'Mixed cellar' },
];

function MultiSelectGroup({ label, options, selected = [], onToggle }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(212,165,116,0.75)' }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const value = typeof opt === 'object' ? opt.value : opt;
          const label_ = typeof opt === 'object' ? opt.label : opt;
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              className="cursor-pointer rounded-full px-3 py-1 text-xs font-medium border transition-colors"
              style={
                active
                  ? { background: 'rgba(163,92,92,0.28)', border: '1px solid rgba(163,92,92,0.6)', color: '#F5F1E7' }
                  : { background: 'rgba(60,45,30,0.45)', border: '1px solid rgba(140,105,65,0.25)', color: 'rgba(224,216,200,0.65)' }
              }
            >
              {label_}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function WinePreferencesSection({ preferences = {}, onChange }) {
  const prefs = {
    styles: [],
    varietals: [],
    regions: [],
    drinking_goals: [],
    pairing_interests: [],
    flavor_profile: [],
    cellar_strategy: '',
    budget_everyday_min: '',
    budget_everyday_max: '',
    budget_special_min: '',
    budget_special_max: '',
    max_recommendation_price: '',
    ...preferences,
  };

  function toggle(field, value) {
    const current = Array.isArray(prefs[field]) ? prefs[field] : [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...prefs, [field]: updated });
  }

  function setField(field, value) {
    onChange({ ...prefs, [field]: value });
  }

  return (
    <div className="space-y-5">
      <MultiSelectGroup
        label="Preferred Wine Styles"
        options={WINE_STYLES}
        selected={prefs.styles}
        onToggle={(v) => toggle('styles', v)}
      />
      <MultiSelectGroup
        label="Preferred Varietals"
        options={WINE_VARIETALS}
        selected={prefs.varietals}
        onToggle={(v) => toggle('varietals', v)}
      />
      <MultiSelectGroup
        label="Preferred Regions"
        options={WINE_REGIONS}
        selected={prefs.regions}
        onToggle={(v) => toggle('regions', v)}
      />
      <MultiSelectGroup
        label="Drinking Goals"
        options={DRINKING_GOALS}
        selected={prefs.drinking_goals}
        onToggle={(v) => toggle('drinking_goals', v)}
      />
      <MultiSelectGroup
        label="Pairing Interests"
        options={PAIRING_INTERESTS}
        selected={prefs.pairing_interests}
        onToggle={(v) => toggle('pairing_interests', v)}
      />
      <MultiSelectGroup
        label="Body / Flavor Preferences"
        options={FLAVOR_PROFILES}
        selected={prefs.flavor_profile}
        onToggle={(v) => toggle('flavor_profile', v)}
      />

      {/* Cellar Strategy */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(212,165,116,0.75)' }}>
          Cellar / Storage Strategy
        </p>
        <div className="flex flex-wrap gap-2">
          {CELLAR_STRATEGIES.map(({ value, label }) => {
            const active = prefs.cellar_strategy === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setField('cellar_strategy', active ? '' : value)}
                className="cursor-pointer rounded-full px-3 py-1 text-xs font-medium border transition-colors"
                style={
                  active
                    ? { background: 'rgba(163,92,92,0.28)', border: '1px solid rgba(163,92,92,0.6)', color: '#F5F1E7' }
                    : { background: 'rgba(60,45,30,0.45)', border: '1px solid rgba(140,105,65,0.25)', color: 'rgba(224,216,200,0.65)' }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(212,165,116,0.75)' }}>
          Budget Preferences
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'rgba(224,216,200,0.6)' }}>Everyday bottle min ($)</label>
            <input
              type="number"
              min="0"
              value={prefs.budget_everyday_min}
              onChange={(e) => setField('budget_everyday_min', e.target.value ? Number(e.target.value) : '')}
              className="w-full h-9 rounded-lg px-3 text-sm"
              style={{ background: 'rgba(20,14,10,0.70)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
              placeholder="e.g. 15"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'rgba(224,216,200,0.6)' }}>Everyday bottle max ($)</label>
            <input
              type="number"
              min="0"
              value={prefs.budget_everyday_max}
              onChange={(e) => setField('budget_everyday_max', e.target.value ? Number(e.target.value) : '')}
              className="w-full h-9 rounded-lg px-3 text-sm"
              style={{ background: 'rgba(20,14,10,0.70)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
              placeholder="e.g. 40"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'rgba(224,216,200,0.6)' }}>Special bottle min ($)</label>
            <input
              type="number"
              min="0"
              value={prefs.budget_special_min}
              onChange={(e) => setField('budget_special_min', e.target.value ? Number(e.target.value) : '')}
              className="w-full h-9 rounded-lg px-3 text-sm"
              style={{ background: 'rgba(20,14,10,0.70)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
              placeholder="e.g. 50"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'rgba(224,216,200,0.6)' }}>Special bottle max ($)</label>
            <input
              type="number"
              min="0"
              value={prefs.budget_special_max}
              onChange={(e) => setField('budget_special_max', e.target.value ? Number(e.target.value) : '')}
              className="w-full h-9 rounded-lg px-3 text-sm"
              style={{ background: 'rgba(20,14,10,0.70)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
              placeholder="e.g. 150"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs mb-1 block" style={{ color: 'rgba(224,216,200,0.6)' }}>Max recommended bottle price ($)</label>
            <input
              type="number"
              min="0"
              value={prefs.max_recommendation_price}
              onChange={(e) => setField('max_recommendation_price', e.target.value ? Number(e.target.value) : '')}
              className="w-full h-9 rounded-lg px-3 text-sm"
              style={{ background: 'rgba(20,14,10,0.70)', border: '1px solid rgba(180,140,75,0.25)', color: '#F5F1E7' }}
              placeholder="e.g. 200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}