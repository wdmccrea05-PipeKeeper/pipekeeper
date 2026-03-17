/**
 * ModuleVisibilitySettings
 * Profile / Settings section — enable / disable collection modules.
 * Visibility is SEPARATE from entitlement/billing.
 */
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Layers, Eye, EyeOff, GlassWater, Wind } from 'lucide-react';
import { useEnabledModules, LAUNCHED_MODULES } from '@/components/hooks/useEnabledModules';

const MODULE_META = {
  pipes: {
    label: 'PipeKeeper',
    description: 'Pipes, tobacco blends, smoking logs, and pairings.',
    icon: Wind,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  whiskey: {
    label: 'WhiskeyKeeper',
    description: 'Whiskey bottles, tasting notes, and collection analytics.',
    icon: GlassWater,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
    alcohol: true,
  },
};

export default function ModuleVisibilitySettings() {
  const { enabledMap, setModuleEnabled, setModulesEnabled, isLoading } = useEnabledModules();
  const [saving, setSaving] = useState(false);

  async function toggle(moduleType, value) {
    // Prevent disabling all modules — at least one must remain
    const enabledCount = LAUNCHED_MODULES.filter(m => enabledMap[m]).length;
    if (!value && enabledCount <= 1) {
      toast.error('At least one module must remain enabled.');
      return;
    }

    setSaving(true);
    try {
      await setModuleEnabled(moduleType, value);
      toast.success(value ? `${MODULE_META[moduleType]?.label} enabled` : `${MODULE_META[moduleType]?.label} hidden`);
    } catch (e) {
      toast.error('Failed to save module preference.');
    } finally {
      setSaving(false);
    }
  }

  async function hideAlcohol() {
    const enabledCount = LAUNCHED_MODULES.filter(m => enabledMap[m] && !MODULE_META[m]?.alcohol).length;
    if (enabledCount === 0) {
      toast.error('At least one non-alcohol module must remain enabled.');
      return;
    }
    setSaving(true);
    try {
      const updates = {};
      for (const m of LAUNCHED_MODULES) {
        if (MODULE_META[m]?.alcohol) updates[m] = false;
      }
      await setModulesEnabled(updates);
      toast.success('Alcohol-related modules hidden.');
    } catch {
      toast.error('Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Layers className="w-4 h-4 text-amber-500" />
        <span className="font-semibold text-stone-800">Active Modules</span>
      </div>
      <p className="text-xs text-stone-500">
        Hide modules you don't use. Your data is always preserved — re-enable any module to restore full access.
        This does not affect billing or entitlements.
      </p>

      <div className="space-y-3">
        {LAUNCHED_MODULES.map(mod => {
          const meta = MODULE_META[mod];
          if (!meta) return null;
          const Icon = meta.icon;
          const enabled = enabledMap[mod] ?? true;

          return (
            <div
              key={mod}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                enabled ? `${meta.bg} ${meta.border}` : 'bg-stone-100/50 border-stone-200/60 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${meta.bg}`}>
                  <Icon className={`w-5 h-5 ${meta.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-800 text-sm">{meta.label}</span>
                    {enabled ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] px-1.5 py-0 h-4">
                        <Eye className="w-2.5 h-2.5 mr-0.5" /> Active
                      </Badge>
                    ) : (
                      <Badge className="bg-stone-200 text-stone-500 border-0 text-[10px] px-1.5 py-0 h-4">
                        <EyeOff className="w-2.5 h-2.5 mr-0.5" /> Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{meta.description}</p>
                </div>
              </div>
              <Switch
                checked={enabled}
                disabled={saving}
                onCheckedChange={(v) => toggle(mod, v)}
                className="data-[state=checked]:bg-amber-600"
              />
            </div>
          );
        })}
      </div>

      {/* Convenience: hide alcohol */}
      {LAUNCHED_MODULES.some(m => MODULE_META[m]?.alcohol && (enabledMap[m] ?? true)) && (
        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={hideAlcohol}
            disabled={saving}
            className="text-stone-600 border-stone-300 text-xs"
          >
            <EyeOff className="w-3.5 h-3.5 mr-1.5" />
            Hide alcohol-related modules
          </Button>
        </div>
      )}
    </div>
  );
}