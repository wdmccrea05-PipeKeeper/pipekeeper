/**
 * OnboardingModuleStep
 * Step shown during onboarding — user picks which modules to activate.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Wind, GlassWater, EyeOff } from 'lucide-react';

const PRESETS = [
  {
    id: 'pipes-only',
    label: 'Pipes only',
    desc: 'PipeKeeper + Tobacco Blends',
    modules: { pipes: true, whiskey: false },
  },
  {
    id: 'pipes-whiskey',
    label: 'Pipes + Whiskey',
    desc: 'Full PipeKeeper & WhiskeyKeeper',
    modules: { pipes: true, whiskey: true },
  },
  {
    id: 'full',
    label: 'Full CollectionKeeper',
    desc: 'Enable all available modules',
    modules: { pipes: true, whiskey: true },
  },
  {
    id: 'hide-alcohol',
    label: 'Hide alcohol modules',
    desc: 'PipeKeeper only — no WhiskeyKeeper',
    icon: EyeOff,
    modules: { pipes: true, whiskey: false },
  },
];

const MODULE_META = {
  pipes: {
    label: 'PipeKeeper',
    description: 'Pipes, tobacco blends, logs & pairings',
    icon: Wind,
    color: '#C87941',
  },
  whiskey: {
    label: 'WhiskeyKeeper',
    description: 'Whiskey bottles, tasting notes & analytics',
    icon: GlassWater,
    color: '#E07B39',
    alcohol: true,
  },
};

const LAUNCHED = ['pipes', 'whiskey'];

export default function OnboardingModuleStep({ onChange, initialSelections }) {
  const [selections, setSelections] = useState(() => {
    if (initialSelections) return initialSelections;
    return { pipes: true, whiskey: true };
  });
  const [activePreset, setActivePreset] = useState(null);

  function applyPreset(preset) {
    const next = { ...selections, ...preset.modules };
    setSelections(next);
    setActivePreset(preset.id);
    onChange?.(next);
  }

  function toggleModule(mod) {
    const enabledCount = LAUNCHED.filter(m => selections[m]).length;
    if (selections[mod] && enabledCount <= 1) return; // keep at least one

    const next = { ...selections, [mod]: !selections[mod] };
    setSelections(next);
    setActivePreset(null);
    onChange?.(next);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>
        Choose the collection modules you want to use. You can always change this later in Profile settings.
      </p>

      {/* Quick presets */}
      <div>
        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(180,140,75,0.7)' }}>
          Quick Presets
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="text-left p-3 rounded-xl border transition-all"
              style={{
                background: activePreset === preset.id
                  ? 'rgba(180,140,75,0.15)'
                  : 'rgba(40,28,20,0.5)',
                borderColor: activePreset === preset.id
                  ? 'rgba(180,140,75,0.5)'
                  : 'rgba(120,90,65,0.25)',
              }}
            >
              <div className="flex items-start gap-2">
                {activePreset === preset.id && (
                  <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'rgba(180,140,75,1)' }} />
                )}
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#F5F1E7' }}>{preset.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(224,216,200,0.55)' }}>{preset.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Individual module toggles */}
      <div>
        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(180,140,75,0.7)' }}>
          Or choose individually
        </p>
        <div className="space-y-2">
          {LAUNCHED.map(mod => {
            const meta = MODULE_META[mod];
            if (!meta) return null;
            const Icon = meta.icon;
            const enabled = selections[mod] ?? true;
            const enabledCount = LAUNCHED.filter(m => selections[m]).length;
            const isLast = enabledCount <= 1 && enabled;

            return (
              <button
                key={mod}
                onClick={() => toggleModule(mod)}
                disabled={isLast}
                className="w-full flex items-center justify-between p-4 rounded-xl border transition-all"
                style={{
                  background: enabled
                    ? 'rgba(40,28,20,0.6)'
                    : 'rgba(25,18,12,0.4)',
                  borderColor: enabled
                    ? 'rgba(120,90,65,0.4)'
                    : 'rgba(80,60,45,0.2)',
                  opacity: isLast ? 0.5 : 1,
                  cursor: isLast ? 'not-allowed' : 'pointer',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}40` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: meta.color }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold" style={{ color: '#F5F1E7' }}>{meta.label}</p>
                    <p className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>{meta.description}</p>
                    {meta.alcohol && (
                      <Badge
                        className="mt-1 text-[9px] px-1.5 py-0 h-3.5 border-0"
                        style={{ background: 'rgba(200,120,65,0.2)', color: 'rgba(200,160,100,0.9)' }}
                      >
                        Alcohol content
                      </Badge>
                    )}
                  </div>
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: enabled ? 'rgba(180,140,75,0.8)' : 'rgba(120,90,65,0.4)',
                    background: enabled ? 'rgba(180,140,75,0.2)' : 'transparent',
                  }}
                >
                  {enabled && <Check className="w-3 h-3" style={{ color: 'rgba(180,140,75,1)' }} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {LAUNCHED.filter(m => selections[m]).length === 0 && (
        <p className="text-xs text-center" style={{ color: 'rgba(220,80,80,0.8)' }}>
          At least one module must be selected.
        </p>
      )}
    </div>
  );
}