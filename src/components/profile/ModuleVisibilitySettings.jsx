import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useModuleVisibility } from '@/components/hooks/useModuleVisibility';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { MODULE_ICONS } from '@/components/branding/moduleAssets';
import { isModuleLaunched } from '@/components/utils/moduleReleaseState';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';

function ModuleIcon({ src, alt, className }) {
  return <img src={src} alt={alt} className={className || 'w-7 h-7 object-contain bg-transparent'} style={{ backgroundColor: 'transparent', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }} draggable={false} />;
}

export default function ModuleVisibilitySettings() {
  const { t } = useTranslation();
  const { moduleStates, setModuleEnabled, isLoading } = useModuleVisibility();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [saving, setSaving] = useState(null);
  const isAdmin = user?.role === 'admin';

  const MODULE_CONFIG = [
    { id: 'pipekeeper', label: t('hub.pipekeeper', 'PipeKeeper'), description: t('pipekeeper.description', 'Pipe collection, tobacco, smoking logs, and pairings.'), icon: MODULE_ICONS.pipekeeper, launched: isModuleLaunched('pipekeeper'), canDisable: false },
    { id: 'whiskeykeeper', label: t('hub.whiskeykeeper', 'WhiskeyKeeper'), description: t('whiskeykeeper.description', 'Whiskey bottle collection, tasting notes, and inventory.'), icon: MODULE_ICONS.whiskeykeeper, launched: isModuleLaunched('whiskeykeeper'), canDisable: true, alcoholRelated: true },
    { id: 'winekeeper', label: t('hub.winekeeper', 'WineKeeper'), description: t('profile.winekeeperDescription', 'Wine cellar management and bottle tracking.'), icon: MODULE_ICONS.winekeeper, launched: isModuleLaunched('winekeeper'), canDisable: true, alcoholRelated: true },
    { id: 'cigarkeeper', label: t('hub.cigarkeeper', 'CigarKeeper'), description: t('profile.cigarkeeperDescription', 'Cigar collection curation and tasting.'), icon: MODULE_ICONS.cigarkeeper, launched: isModuleLaunched('cigarkeeper'), canDisable: true },
  ];

  async function handleToggle(moduleId, enabled) {
    if (!enabled) {
      const launchedModules = MODULE_CONFIG.filter((m) => m.launched);
      const remaining = launchedModules.filter((m) => m.id !== moduleId && moduleStates[m.id] !== false).length;
      if (remaining < 1) {
        toast.error(t('profile.moduleAtLeastOne', 'At least one module must remain active.'));
        return;
      }
    }

    setSaving(moduleId);
    try {
      await setModuleEnabled(moduleId, enabled);
      const moduleLabel = MODULE_CONFIG.find((m) => m.id === moduleId)?.label || moduleId;
      toast.success(enabled ? `${moduleLabel} ${t('profile.enabledSuffix', 'enabled')}` : `${moduleLabel} ${t('profile.hiddenSuffix', 'hidden')}`);
    } catch (e) {
      console.error('[ModuleVisibility] toggle error:', e);
      toast.error(t('profile.moduleSaveError', 'Could not save module preference.'));
    } finally {
      setSaving(null);
    }
  }

  if (isLoading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1"><Eye className="w-4 h-4 text-amber-600" /><span className="font-semibold text-stone-800 text-base">{t('hub.activeModules', 'Active Modules')}</span></div>
      <p className="text-xs text-stone-500 mb-3">{t('profile.moduleVisibilityDescription', 'Choose which collection modules appear in your navigation and Hub. Hiding a module never deletes your data — you can re-enable it at any time.')}</p>
      <div className="space-y-3">
        {MODULE_CONFIG.map((mod) => {
          const enabled = moduleStates[mod.id] !== false;
          const isSaving = saving === mod.id;
          return (
            <div key={mod.id} className={`flex items-center justify-between gap-4 p-3 rounded-xl border transition-all ${enabled ? 'bg-stone-50 border-stone-200' : 'bg-stone-100/50 border-stone-200/60 opacity-60'}`}>
              <div className="flex items-center gap-3 min-w-0">
                <ModuleIcon src={mod.icon} alt={mod.label} className="w-8 h-8 object-contain flex-shrink-0 bg-transparent" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-stone-800 text-sm">{mod.label}</span>
                    {!mod.launched && <Badge className="text-[10px] bg-stone-200 text-stone-600 border-0 px-1.5 py-0">{t('hub.comingSoon', 'Coming Soon')}</Badge>}
                    {!mod.launched && isAdmin && <Badge className="text-[10px] bg-purple-100 text-purple-700 border-0 px-1.5 py-0">{t('profile.adminOverride', 'Admin Override')}</Badge>}
                    {mod.alcoholRelated && <Badge className="text-[10px] bg-amber-100 text-amber-700 border-0 px-1.5 py-0">{t('profile.alcoholBadge', 'Alcohol')}</Badge>}
                    {mod.canDisable === false && <Badge className="text-[10px] bg-blue-100 text-blue-700 border-0 px-1.5 py-0">{t('profile.primaryBadge', 'Primary')}</Badge>}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{mod.launched ? mod.description : `${mod.description} (${t('hub.comingSoon', 'Coming Soon')})`}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                 {!enabled && <EyeOff className="w-3.5 h-3.5 text-stone-400" />}
                 {!mod.launched && !isAdmin && <Lock className="w-3.5 h-3.5 text-stone-300" title="Coming Soon" />}
                 <Switch checked={enabled} onCheckedChange={(v) => handleToggle(mod.id, v)} disabled={isSaving || mod.canDisable === false || (!mod.launched && !isAdmin)} className="data-[state=checked]:bg-[#A35C5C]" />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-stone-400 mt-2">{t('profile.moduleVisibilityNote', 'Hiding a module removes it from navigation, Hub, and recommendations. Your records remain stored and fully intact.')}</p>
    </div>
  );
}