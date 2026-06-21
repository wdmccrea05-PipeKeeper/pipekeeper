import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useModuleVisibility } from '@/components/hooks/useModuleVisibility';
import { MODULE_ICONS } from '@/components/branding/moduleAssets';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { canAccessInternalModuleForTesting, isModuleLaunched } from '@/components/utils/moduleReleaseState';

function Badge({ children, className }) {
  return <span className={`px-2 py-1 rounded text-xs font-medium ${className}`}>{children}</span>;
}

export default function ModuleSelectionModal({ onComplete, isOpen = true }) {
  const { saveModulePreferences, user } = useModuleVisibility();
  const { t } = useTranslation();
  const canSelectCigarKeeper =
    isModuleLaunched('cigarkeeper', user) ||
    canAccessInternalModuleForTesting('cigarkeeper', user);
  const canSelectWineKeeper =
    isModuleLaunched('winekeeper', user) ||
    canAccessInternalModuleForTesting('winekeeper', user);
  const [selected, setSelected] = useState({ pipekeeper: true, whiskeykeeper: false, cigarkeeper: false, winekeeper: false });
  const [saving, setSaving] = useState(false);
  const hasAnySelected =
    selected.pipekeeper ||
    selected.whiskeykeeper ||
    (canSelectCigarKeeper && selected.cigarkeeper) ||
    (canSelectWineKeeper && selected.winekeeper);

  const userHasAnyPaid =
    !!user?.pipekeeper_paid ||
    !!user?.whiskeykeeper_paid ||
    !!user?.cigarkeeper_paid ||
    !!user?.winekeeper_paid ||
    String(user?.entitlement_tier || '').toLowerCase() === 'pro';

  const handleToggle = (moduleId) => {
    setSelected((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const handleContinue = async () => {
    if (!hasAnySelected) {
      toast.error(t("auto.components_onboarding_ModuleSelectionModal.please_select_at_least_one_module_18pg8w"));
      return;
    }

    setSaving(true);
    try {
      await saveModulePreferences(selected);

      try {
        sessionStorage.setItem('pk_auto_launch_onboarding', 'true');
      } catch {}

      toast.success(t("auto.components_onboarding_ModuleSelectionModal.modules_configured_successfully_1kvjwb"));
      onComplete?.({
        ...selected,
        userHasAnyPaid,
      });
    } catch (error) {
      console.error('[ModuleSelection] Error:', error);
      toast.error(t("auto.components_onboarding_ModuleSelectionModal.failed_to_save_module_preferences_1bn2db"));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div
        className="max-w-2xl w-full rounded-2xl p-6 overflow-y-auto"
        style={{
          maxHeight: 'calc(100vh - 2rem)',
          background: 'linear-gradient(135deg, rgba(42,30,20,0.98), rgba(28,18,12,0.98))',
          border: '1px solid rgba(180,140,75,0.2)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
        }}
      >
        <h2 className="text-2xl font-bold mb-2 text-[#F5F1E7]">{t("onboarding.welcomeModuleTitle")}</h2>
        <p className="text-sm text-[#E0D8C8] mb-6">
          {t("onboarding.moduleSelectionDesc")}
        </p>

        <div className="space-y-3 mb-8">
          {/* PipeKeeper */}
          <button
            onClick={() => handleToggle('pipekeeper')}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selected.pipekeeper ? 'bg-stone-800/60 border-[#D4A574]' : 'bg-stone-800/20 border-stone-700'}`}
          >
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                checked={selected.pipekeeper}
                onChange={(e) => {
                  e.stopPropagation();
                  handleToggle('pipekeeper');
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 mt-1 cursor-pointer"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-[#F5F1E7] flex items-center gap-2">
                  <img
                    src={MODULE_ICONS.pipekeeper}
                    alt={t("auto.components_onboarding_ModuleSelectionModal.pipekeeper_1dclxa")}
                    className="w-5 h-5 object-contain bg-[#2a1f18] rounded p-0.5"
                  />
                  {t("auto.components_onboarding_ModuleSelectionModal.pipekeeper_1dclxa")}
                </h3>
                <p className="text-xs text-[#E0D8C8] mt-1">
                  {t("onboarding.pipekeeperDesc")}
                </p>
              </div>
              <Badge className="flex-shrink-0 bg-green-900/30 text-green-300 border-0 text-xs">
                {t("auto.components_onboarding_ModuleSelectionModal.free_yjt0tj")}
              </Badge>
            </div>
          </button>

          {/* WhiskeyKeeper */}
          <button
            onClick={() => handleToggle('whiskeykeeper')}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selected.whiskeykeeper ? 'bg-stone-800/60 border-[#D4A574]' : 'bg-stone-800/20 border-stone-700'}`}
          >
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                checked={selected.whiskeykeeper}
                onChange={(e) => {
                  e.stopPropagation();
                  handleToggle('whiskeykeeper');
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 mt-1 cursor-pointer"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-[#F5F1E7] flex items-center gap-2">
                  <img
                    src={MODULE_ICONS.whiskeykeeper}
                    alt={t("auto.components_onboarding_ModuleSelectionModal.whiskeykeeper_1kgmc1")}
                    className="w-5 h-5 object-contain bg-[#2a1f18] rounded p-0.5"
                  />
                  {t("auto.components_onboarding_ModuleSelectionModal.whiskeykeeper_1kgmc1")}
                </h3>
                <p className="text-xs text-[#E0D8C8] mt-1">
                  {t("onboarding.whiskeykeeperDesc")}
                </p>
              </div>
              <Badge className="flex-shrink-0 bg-green-900/30 text-green-300 border-0 text-xs">
                {t("auto.components_onboarding_ModuleSelectionModal.free_yjt0tj")}
              </Badge>
            </div>
          </button>

          {canSelectCigarKeeper ? (
            <button
              onClick={() => handleToggle('cigarkeeper')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selected.cigarkeeper ? 'bg-stone-800/60 border-[#D4A574]' : 'bg-stone-800/20 border-stone-700'}`}
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selected.cigarkeeper}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleToggle('cigarkeeper');
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-[#F5F1E7] flex items-center gap-2">
                    <img
                      src={MODULE_ICONS.cigarkeeper}
                      alt={t("auto.components_onboarding_ModuleSelectionModal.cigarkeeper_1oz7i9")}
                      className="w-5 h-5 object-contain bg-[#2a1f18] rounded p-0.5"
                    />
                    {t("auto.components_onboarding_ModuleSelectionModal.cigarkeeper_1oz7i9")}
                  </h3>
                  <p className="text-xs text-[#E0D8C8] mt-1">
                    {t("onboarding.cigarkeeperDesc")}
                  </p>
                </div>
                <Badge className="flex-shrink-0 bg-green-900/30 text-green-300 border-0 text-xs">
                  {t("auto.components_onboarding_ModuleSelectionModal.free_yjt0tj")}
                </Badge>
              </div>
            </button>
          ) : null}

          {canSelectWineKeeper ? (
            <button
              onClick={() => handleToggle('winekeeper')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selected.winekeeper ? 'bg-stone-800/60 border-[#D4A574]' : 'bg-stone-800/20 border-stone-700'}`}
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selected.winekeeper}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleToggle('winekeeper');
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 mt-1 cursor-pointer"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-[#F5F1E7] flex items-center gap-2">
                    <img
                      src={MODULE_ICONS.winekeeper}
                      alt={t("auto.components_onboarding_ModuleSelectionModal.winekeeper_1w5l9t")}
                      className="w-5 h-5 object-contain bg-[#2a1f18] rounded p-0.5"
                    />
                    {t("auto.components_onboarding_ModuleSelectionModal.winekeeper_1w5l9t")}
                  </h3>
                  <p className="text-xs text-[#E0D8C8] mt-1">
                    {t("onboarding.winekeeperDesc")}
                  </p>
                </div>
                <Badge className="flex-shrink-0 bg-green-900/30 text-green-300 border-0 text-xs">
                  {t("auto.components_onboarding_ModuleSelectionModal.free_yjt0tj")}
                </Badge>
              </div>
            </button>
          ) : null}
        </div>

        <div className="flex gap-3 justify-end sticky bottom-0 pt-3 pb-1"
          style={{ background: 'linear-gradient(to top, rgba(28,18,12,1) 80%, transparent)' }}
        >
          <Button
            onClick={handleContinue}
            disabled={saving || !hasAnySelected}
            className="bg-[#A35C5C] hover:bg-[#8F4E4E] w-full sm:w-auto text-base py-3"
          >
            {saving ? 'Saving...' : 'Continue →'}
          </Button>
        </div>
      </div>
    </div>
  );
}