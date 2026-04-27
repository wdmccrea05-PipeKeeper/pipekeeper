import React, { useMemo } from "react";
import { useAccessSummary } from "@/components/hooks/useAccessSummary";
import { canAccessInternalModuleForTesting, isInternalModuleTester } from "@/components/utils/moduleReleaseState";
import { useTranslation } from "@/components/i18n/safeTranslation";

const MODULES = [
  {
    key: "pipekeeper",
    label: "PipeKeeper",
    description: "Track pipes, blends, cellar inventory, rotations, and smoking history.",
  },
  {
    key: "whiskeykeeper",
    label: "WhiskeyKeeper",
    description: "Track bottles, pours, tasting notes, inventory, and value insights.",
  },
  {
    key: "cigarkeeper",
    label: "CigarKeeper",
    description: "Track cigars, humidors, inventory, and cigar sessions.",
  },
  {
    key: "winekeeper",
    label: "WineKeeper",
    description: "Curate your wine cellar with drinking windows, tasting logs, and valuations.",
  },
];

export default function ModuleSelectionStep({
  user,
  selectedModules = {},
  onChange,
  onNext,
}) {
  const { activeModules = [] } = useAccessSummary();
  const tester = isInternalModuleTester(user);
  const canAccessCigarInternal = canAccessInternalModuleForTesting("cigarkeeper", user);
  const { t } = useTranslation();

  const accessibleModules = useMemo(() => {
    const set = new Set(activeModules || []);
    // All modules are free-tier accessible (gating happens inside each module).
    set.add("pipekeeper");
    set.add("whiskeykeeper");
    set.add("cigarkeeper");
    set.add("winekeeper");
    return set;
  }, [activeModules, tester, canAccessCigarInternal]);

  // All defined modules are selectable — access is gated on features inside each module,
  // not on visibility in the picker. CigarKeeper is shown only if internally accessible.
  const selectableModules = MODULES.filter((module) =>
    accessibleModules.has(module.key)
  );

  const normalizedSelections = useMemo(() => {
    const result = {};
    for (const module of MODULES) {
      result[module.key] = !!selectedModules?.[module.key];
    }
    return result;
  }, [selectedModules]);

  const enabledCount = Object.values(normalizedSelections).filter(Boolean).length;

  const toggleModule = (moduleKey) => {
    if (!accessibleModules.has(moduleKey)) return;

    const next = {
      ...normalizedSelections,
      [moduleKey]: !normalizedSelections[moduleKey],
    };

    const nextEnabledCount = Object.values(next).filter(Boolean).length;
    if (nextEnabledCount === 0) return;

    onChange?.(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-bold"
          style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}
        >
          {t("onboarding.moduleSelectionTitle", "Choose Your Modules")}
        </h2>
        <p className="text-sm mt-2" style={{ color: "#E0D8C8" }}>
          {t("onboarding.moduleSelectionDesc", "CollectionKeeper is your main shell. Turn on the modules you want to use.")}
        </p>
      </div>

      <div className="space-y-3">
        {selectableModules.map((module) => {
          const selected = !!normalizedSelections[module.key];

          return (
            <button
              key={module.key}
              type="button"
              onClick={() => toggleModule(module.key)}
              className="w-full text-left rounded-2xl p-4 transition-all"
              style={{
                border: selected
                  ? "1px solid rgba(212,165,116,0.45)"
                  : "1px solid rgba(255,255,255,0.08)",
                background: selected
                  ? "rgba(212,165,116,0.12)"
                  : "rgba(255,255,255,0.03)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className="text-base font-semibold"
                    style={{ color: "#F5F1E7" }}
                  >
                    {module.label}
                  </div>
                  <div
                    className="text-sm mt-1"
                    style={{ color: "rgba(224,216,200,0.65)" }}
                  >
                    {module.description}
                  </div>
                </div>

                <div
                  className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
                  style={{
                    background: selected
                      ? "rgba(46,125,92,0.22)"
                      : "rgba(255,255,255,0.06)",
                    color: selected ? "#9BE3B5" : "#E0D8C8",
                  }}
                >
                  {selected ? t("common.selected", "Selected") : t("common.off", "Off")}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs" style={{ color: "#E0D8C8" }}>
          {t("onboarding.moduleSelectionHint", "Select at least one accessible module to continue.")}
        </p>

        <button
          type="button"
          onClick={() => onNext?.(normalizedSelections)}
          disabled={enabledCount === 0}
          className="px-4 py-2 rounded-xl font-semibold disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #a35c5c, #8f4e4e)",
            color: "#F5F1E7",
          }}
        >
          {t("common.continue", "Continue")}
        </button>
      </div>
    </div>
  );
}