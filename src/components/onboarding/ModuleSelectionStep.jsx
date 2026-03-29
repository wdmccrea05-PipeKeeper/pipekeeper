/**
 * ModuleSelectionStep — onboarding step for choosing active modules.
 * Shown to new users only. Saves module preferences immediately on change.
 */
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Wine } from 'lucide-react';

// WhiskeyKeeper is not yet launched for normal users — presets only include PipeKeeper.
const PRESETS = [
  {
    label: 'Pipes Only',
    description: 'Focus on your pipe collection and tobacco.',
    states: { pipekeeper: true, whiskeykeeper: false, winekeeper: false, cigarkeeper: false },
  },
  {
    label: 'Hide Alcohol Modules',
    description: 'Only non-alcohol modules active. Great for sober users.',
    states: { pipekeeper: true, whiskeykeeper: false, winekeeper: false, cigarkeeper: false },
  },
];

const MODULE_CONFIG = [
  {
    id: 'pipekeeper',
    label: 'PipeKeeper',
    description: 'Pipes, tobacco & smoking logs',
    icon: 'https://media.base44.com/images/public/694956e18d119cc497192525/27f5c2c92_PKNB.png',
    launched: true,
    required: true,
  },
  {
    id: 'whiskeykeeper',
    label: 'WhiskeyKeeper',
    description: 'Whiskey bottles & tasting notes',
    icon: 'https://media.base44.com/images/public/694956e18d119cc497192525/752a8ab5c_WKNB.png',
    launched: false,  // Not yet launched for normal users — internal/admin only
    alcoholRelated: true,
    comingSoon: true,
  },
  {
    id: 'winekeeper',
    label: 'WineKeeper',
    description: 'Wine cellar (coming soon)',
    icon: 'https://media.base44.com/images/public/694956e18d119cc497192525/ef580a0c9_WineKNB.png',
    launched: false,
    alcoholRelated: true,
    comingSoon: true,
  },
  {
    id: 'cigarkeeper',
    label: 'CigarKeeper',
    description: 'Cigar collection (coming soon)',
    icon: 'https://media.base44.com/images/public/694956e18d119cc497192525/c26fb6746_CigarKNB.png',
    launched: false,
    comingSoon: true,
  },
];

export default function ModuleSelectionStep({ selections, onChange }) {
  const [activePreset, setActivePreset] = useState(null);

  function applyPreset(preset) {
    setActivePreset(preset.label);
    onChange(preset.states);
  }

  function toggleModule(moduleId) {
    const mod = MODULE_CONFIG.find(m => m.id === moduleId);
    if (mod?.required) return; // PipeKeeper cannot be disabled

    const currentlyEnabled = selections[moduleId] !== false;
    const newEnabled = !currentlyEnabled;

    // Ensure at least one launched module remains on
    if (!newEnabled) {
      const launchedModules = MODULE_CONFIG.filter(m => m.launched);
      const wouldHaveOneLeft = launchedModules.filter(m =>
        m.id !== moduleId && selections[m.id] !== false
      ).length >= 1;
      if (!wouldHaveOneLeft) return;
    }

    setActivePreset(null);
    onChange({ ...selections, [moduleId]: newEnabled });
  }

  return (
    <div className="space-y-5">
      {/* Quick presets */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#E0D8C8]/50 mb-2">Quick presets</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className={`text-left p-3 rounded-xl border text-sm transition-all ${
                activePreset === preset.label
                  ? 'border-amber-500 bg-amber-500/10 text-[#F5F1E7]'
                  : 'border-[#E0D8C8]/15 bg-[#E0D8C8]/5 text-[#E0D8C8]/70 hover:border-[#E0D8C8]/30 hover:text-[#E0D8C8]'
              }`}
            >
              <div className="font-medium text-xs">{preset.label}</div>
              <div className="text-[10px] mt-0.5 opacity-70">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Individual module toggles */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#E0D8C8]/50 mb-2">Or choose individually</p>
        <div className="space-y-2">
          {MODULE_CONFIG.map((mod) => {
            const enabled = selections[mod.id] !== false;
            return (
              <button
                key={mod.id}
                onClick={() => toggleModule(mod.id)}
                disabled={mod.required}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  enabled
                    ? 'border-amber-500/40 bg-amber-500/8'
                    : 'border-[#E0D8C8]/15 bg-transparent opacity-50'
                } ${mod.required ? 'cursor-default' : 'cursor-pointer hover:border-[#E0D8C8]/30'}`}
              >
                <img
                  src={mod.icon}
                  alt={mod.label}
                  className="w-9 h-9 object-contain flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-[#F5F1E7]">{mod.label}</span>
                    {mod.required && (
                      <Badge className="text-[10px] bg-amber-600/30 text-amber-300 border-0 px-1.5 py-0">Always on</Badge>
                    )}
                    {mod.alcoholRelated && !mod.required && (
                      <Badge className="text-[10px] bg-amber-900/30 text-amber-400 border-0 px-1.5 py-0">Alcohol</Badge>
                    )}
                    {mod.comingSoon && (
                      <Badge className="text-[10px] bg-[#E0D8C8]/10 text-[#E0D8C8]/50 border-0 px-1.5 py-0">Soon</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#E0D8C8]/50 mt-0.5">{mod.description}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    enabled
                      ? 'border-amber-500 bg-amber-500'
                      : 'border-[#E0D8C8]/30 bg-transparent'
                  }`}
                >
                  {enabled && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-[#E0D8C8]/40">
        You can change this anytime in Profile → Active Modules. Hiding a module never deletes your data.
      </p>
    </div>
  );
}