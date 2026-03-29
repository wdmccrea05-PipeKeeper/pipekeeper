import { useState } from "react";
import { isInternalModuleTester } from "@/components/utils/moduleReleaseState";
import { useAccessSummary } from "@/components/access/useAccessSummary";

export default function ModuleSelectionStep({ user, onNext }) {
  const { activeModules } = useAccessSummary();
  const tester = isInternalModuleTester(user);

  const [selected, setSelected] = useState(() => {
    if (tester) return [];
    return activeModules || [];
  });

  const modules = [
    {
      key: "pipekeeper",
      label: "PipeKeeper",
    },
    {
      key: "whiskeykeeper",
      label: "WhiskeyKeeper",
    },
  ];

  const canAccess = (key) => {
    if (tester) return true;
    return (activeModules || []).includes(key);
  };

  const toggle = (key) => {
    if (!canAccess(key)) return;

    setSelected((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((m) => m !== key);
        return next.length === 0 ? prev : next; // must have at least 1
      } else {
        return [...prev, key];
      }
    });
  };

  return (
    <div>
      <h2>Select Your Modules</h2>

      {modules.map((m) => (
        <button
          key={m.key}
          onClick={() => toggle(m.key)}
          disabled={!canAccess(m.key)}
        >
          {m.label} {selected.includes(m.key) ? "✓" : ""}
        </button>
      ))}

      <button onClick={() => onNext(selected)} disabled={selected.length === 0}>
        Continue
      </button>
    </div>
  );
}