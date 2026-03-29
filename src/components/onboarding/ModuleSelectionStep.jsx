/**
 * ModuleSelectionStep — onboarding step for choosing active modules.
 *
 * CollectionKeeper is the platform shell. Modules are optional layers.
 * PipeKeeper is NOT required or default — it is the current normal-user entitlement.
 * WhiskeyKeeper is selectable by admin/internal testers before public launch.
 *
 * Props:
 *   selections  — { [moduleId]: boolean }
 *   onChange    — (newSelections) => void
 *   isTester    — boolean (admin/internal tester — can select all accessible modules)
 */
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

// Module catalogue. `testerOnly: true` means hidden from normal users until public launch.
const MODULE_CATALOGUE = [
  {
    id: 'pipekeeper',
    label: 'PipeKeeper',
    description: 'Pipes, tobacco & smoking logs',
    icon: 'https://media.base44.com/images/public/694956e18d119cc497192525/27f5c2c92_PKNB.png',
  },
  {
    id: 'whiskeykeeper',
    label: 'WhiskeyKeeper',
    description: 'Whiskey bottles & tasting notes',
    icon: 'https://media.base44.com/images/public/694956e18d119cc497192525/752a8ab5c_WKNB.png',
    testerOnly: true,   // hidden for normal users until WhiskeyKeeper officially launches
    alcoholRelated: true,
  },
  {
    id: 'winekeeper',
    label: 'WineKeeper',
    description: 'Wine cellar (coming soon)',
    icon: 'https://media.base44.com/images/public/694956e18d119cc497192525/ef580a0c9_WineKNB.png',
    comingSoon: true,
    alcoholRelated: true,
  },
  {
    id: 'cigarkeeper',
    label: 'CigarKeeper',
    description: 'Cigar collection (coming soon)',
    icon: 'https://media.base44.com/images/public/694956e18d119cc497192525/c26fb6746_CigarKNB.png',
    comingSoon: true,
  },
];

export default function ModuleSelectionStep({ selections, onChange, isTester = false }) {
  const [activePreset, setActivePreset] = useState(null);

  // Only show modules relevant to this user's access level
  const visibleModules = MODULE_CATALOGUE.filter(
    (m) => !m.testerOnly || isTester
  );

  // Presets reflect what's actually accessible
  const presets = isTester
    ? [
        {
          label: 'PipeKeeper Only',
          description: 'Pipes, tobacco & smoking logs.',
          states: { pipekeeper: true, whiskeykeeper: false, winekeeper: false, cigarkeeper: false },
        },
        {
          label: 'WhiskeyKeeper Only',
          description: 'Whiskey bottles & tasting notes.',
          states: { pipekeeper: false, whiskeykeeper: true, winekeeper: false, cigarkeeper: false },
        },
        {
          label: 'Pipes + Whiskey',
          description: 'Both modules active.',
          states: { pipekeeper: true, whiskeykeeper: true, winekeeper: false, cigarkeeper: false },
        },
      ]
    : [
        {
          label: 'PipeKeeper',
          description: 'Pipe collection and tobacco management.',
          states: { pipekeeper: true, whiskeykeeper: false, winekeeper: false, cigarkeeper: false },
        },
        {
          label: 'No Alcohol Modules',
          description: 'Only non-alcohol modules. Great for sober users.',
          states: { pipekeeper: true, whiskeykeeper: false, winekeeper: false, cigarkeeper: false },
        },
      ];

  function applyPreset(preset) {
    setActivePreset(preset.label);
    onChange(preset.states);
  }

  function toggleModule(moduleId) {
    const mod = MODULE_CATALOGUE.find((m) => m.id === moduleId);

    // Coming-soon modules are not selectable yet
    if (mod?.comingSoon) return;

    const currentlyEnabled = selections[moduleId] === true;
    const newEnabled = !currentlyEnabled;

    // Must keep at least one module selected
    if (!newEnabled) {
      const selectedCount = visibleModules.filter(
        (m) => m.id !== moduleId && selections[m.id] === true && !m.comingSoon
      ).length;
      if (selectedCount < 1) return;
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
          {presets.map((preset) => (
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
          {visibleModules.map((mod) => {
            const enabled = selections[mod.id] === true;
            const isDisabled = mod.comingSoon;
            return (
              <button
                key={mod.id}
                onClick={() => toggleModule(mod.id)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  enabled
                    ? 'border-amber-500/40 bg-amber-500/8'
                    : 'border-[#E0D8C8]/15 bg-transparent opacity-50'
                } ${isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:border-[#E0D8C8]/30'}`}
              >
                <img
                  src={mod.icon}
                  alt={mod.label}
                  className="w-9 h-9 object-contain flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-[#F5F1E7]">{mod.label}</span>
                    {mod.alcoholRelated && (
                      <Badge className="text-[10px] bg-amber-900/30 text-amber-400 border-0 px-1.5 py-0">Alcohol</Badge>
                    )}
                    {mod.comingSoon && (
                      <Badge className="text-[10px] bg-[#E0D8C8]/10 text-[#E0D8C8]/50 border-0 px-1.5 py-0">Soon</Badge>
                    )}
                    {mod.testerOnly && isTester && (
                      <Badge className="text-[10px] bg-purple-900/30 text-purple-300 border-0 px-1.5 py-0">Preview</Badge>
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