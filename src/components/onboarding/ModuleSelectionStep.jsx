import { useState } from "react";
import { isInternalModuleTester } from "@/components/utils/moduleReleaseState";
import { useAccessSummary } from "@/components/hooks/useAccessSummary";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

/**
 * ModuleSelectionStep — Allow user to select which modules to enable.
 *
 * BEHAVIOR:
 * - Entitlement-first: only show modules the user actually has access to
 * - Admin/internal testers can select any module combination
 * - Normal users see/select only their entitled modules
 * - Must have at least 1 module selected
 *
 * Does NOT reference "launched modules" or release state.
 */
export default function ModuleSelectionStep({ selections, onChange, isTester }) {
  const { activeModules } = useAccessSummary();
  const { user } = useCurrentUser();

  // Initialize selected modules based on entitlements
  const entitled = new Set(activeModules || []);
  if (isTester) {
    entitled.add("pipekeeper");
    entitled.add("whiskeykeeper");
  }

  const modules = [
    {
      key: "pipekeeper",
      label: "PipeKeeper",
      description: "Pipe collection, tobacco, smoking logs, and pairings.",
    },
    {
      key: "whiskeykeeper",
      label: "WhiskeyKeeper",
      description: "Whiskey bottle collection, tasting notes, and inventory.",
    },
  ];

  const canAccess = (key) => {
    if (isTester) return true;
    return entitled.has(key);
  };

  const toggle = (key) => {
    if (!canAccess(key)) return;

    onChange((prev) => {
      const current = prev[key] || false;
      const newState = { ...prev, [key]: !current };

      // Validate: must have at least 1 module selected
      const hasSelection = Object.values(newState).some((v) => v);
      return hasSelection ? newState : prev;
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {modules.map((m) => {
          const accessible = canAccess(m.key);
          const selected = selections[m.key] || false;

          return (
            <div
              key={m.key}
              className={`p-4 rounded-lg border transition-all ${
                accessible
                  ? selected
                    ? "bg-amber-50/10 border-amber-400 cursor-pointer"
                    : "bg-stone-800/30 border-stone-700 cursor-pointer hover:bg-stone-800/50"
                  : "bg-stone-800/20 border-stone-700/50 opacity-50 cursor-not-allowed"
              }`}
              onClick={() => accessible && toggle(m.key)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center flex-shrink-0 ${
                    selected
                      ? "bg-amber-500 border-amber-500"
                      : "border-stone-600 bg-transparent"
                  }`}
                >
                  {selected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-stone-100">{m.label}</h4>
                  <p className="text-xs text-stone-400 mt-0.5">{m.description}</p>
                  {!accessible && isTester === false && (
                    <p className="text-xs text-stone-500 mt-2">Not available with current subscription</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-stone-400 pt-2">
        Select at least one module to continue. You can change this anytime in your Profile settings.
      </div>
    </div>
  );
}