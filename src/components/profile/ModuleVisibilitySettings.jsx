/**
 * ModuleVisibilitySettings — Profile section for enabling/disabling modules.
 * Visibility-only. Does not affect billing or entitlements.
 */
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Eye, EyeOff, Wine, Flame } from 'lucide-react';
import { useModuleVisibility } from '@/components/hooks/useModuleVisibility';

function PipeIcon({ className }) {
  return (
    <img
      src="https://media.base44.com/images/public/694956e18d119cc497192525/27f5c2c92_PKNB.png"
      alt="PipeKeeper"
      className={className || 'w-7 h-7 object-contain bg-transparent'}
      style={{ backgroundColor: 'transparent' }}
    />
  );
}

function WhiskeyIcon({ className }) {
  return (
    <img
      src="https://media.base44.com/images/public/694956e18d119cc497192525/752a8ab5c_WKNB.png"
      alt="WhiskeyKeeper"
      className={className || 'w-7 h-7 object-contain bg-transparent'}
      style={{ backgroundColor: 'transparent' }}
    />
  );
}

function WineIcon2({ className }) {
  return (
    <img
      src="https://media.base44.com/images/public/694956e18d119cc497192525/ef580a0c9_WineKNB.png"
      alt="WineKeeper"
      className={className || 'w-7 h-7 object-contain bg-transparent'}
      style={{ backgroundColor: 'transparent' }}
    />
  );
}

function CigarIcon({ className }) {
  return (
    <img
      src="https://media.base44.com/images/public/694956e18d119cc497192525/c26fb6746_CigarKNB.png"
      alt="CigarKeeper"
      className={className || 'w-7 h-7 object-contain bg-transparent'}
      style={{ backgroundColor: 'transparent' }}
    />
  );
}

const MODULE_CONFIG = [
  {
    id: 'pipekeeper',
    label: 'PipeKeeper',
    description: 'Pipe collection, tobacco, smoking logs, and pairings.',
    Icon: PipeIcon,
    launched: true,
    canDisable: false, // at least one must stay on; pipe is primary
  },
  {
    id: 'whiskeykeeper',
    label: 'WhiskeyKeeper',
    description: 'Whiskey bottle collection, tasting notes, and inventory.',
    Icon: WhiskeyIcon,
    launched: true,
    canDisable: true,
    alcoholRelated: true,
  },
  {
    id: 'winekeeper',
    label: 'WineKeeper',
    description: 'Wine cellar management and bottle tracking. (Coming soon)',
    Icon: WineIcon2,
    launched: false,
    canDisable: true,
    alcoholRelated: true,
  },
  {
    id: 'cigarkeeper',
    label: 'CigarKeeper',
    description: 'Cigar collection curation and tasting. (Coming soon)',
    Icon: CigarIcon,
    launched: false,
    canDisable: true,
  },
];

export default function ModuleVisibilitySettings() {
  const { moduleStates, setModuleEnabled, isLoading } = useModuleVisibility();
  const [saving, setSaving] = useState(null);

  async function handleToggle(moduleId, enabled) {
    // Enforce: at least one launched module must remain enabled
    if (!enabled) {
      const launchedModules = MODULE_CONFIG.filter(m => m.launched);
      const wouldHaveOneLeft = launchedModules.filter(m =>
        m.id !== moduleId && moduleStates[m.id] !== false
      ).length >= 1;

      if (!wouldHaveOneLeft) {
        toast.error('At least one module must remain active.');
        return;
      }
    }

    setSaving(moduleId);
    try {
      await setModuleEnabled(moduleId, enabled);
      toast.success(enabled ? `${MODULE_CONFIG.find(m => m.id === moduleId)?.label} enabled` : `${MODULE_CONFIG.find(m => m.id === moduleId)?.label} hidden`);
    } catch (e) {
      console.error('[ModuleVisibility] toggle error:', e);
      toast.error('Could not save module preference.');
    } finally {
      setSaving(null);
    }
  }

  if (isLoading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Eye className="w-4 h-4 text-amber-600" />
        <span className="font-semibold text-stone-800 text-base">Active Modules</span>
      </div>
      <p className="text-xs text-stone-500 mb-3">
        Choose which collection modules appear in your navigation and Hub. Hiding a module never deletes your data — you can re-enable it at any time.
      </p>

      <div className="space-y-3">
        {MODULE_CONFIG.map((mod) => {
          const enabled = moduleStates[mod.id] !== false;
          const isSaving = saving === mod.id;

          return (
            <div
              key={mod.id}
              className={`flex items-center justify-between gap-4 p-3 rounded-xl border transition-all ${
                enabled
                  ? 'bg-stone-50 border-stone-200'
                  : 'bg-stone-100/50 border-stone-200/60 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <mod.Icon className="w-8 h-8 object-contain flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-stone-800 text-sm">{mod.label}</span>
                    {!mod.launched && (
                      <Badge className="text-[10px] bg-stone-200 text-stone-600 border-0 px-1.5 py-0">Coming Soon</Badge>
                    )}
                    {mod.alcoholRelated && (
                      <Badge className="text-[10px] bg-amber-100 text-amber-700 border-0 px-1.5 py-0">Alcohol</Badge>
                    )}
                    {mod.canDisable === false && (
                      <Badge className="text-[10px] bg-blue-100 text-blue-700 border-0 px-1.5 py-0">Primary</Badge>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{mod.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!enabled && <EyeOff className="w-3.5 h-3.5 text-stone-400" />}
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => handleToggle(mod.id, v)}
                  disabled={isSaving || (mod.canDisable === false)}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-stone-400 mt-2">
        Note: Hiding a module removes it from navigation, Hub, and recommendations. Your records remain stored and fully intact.
      </p>
    </div>
  );
}