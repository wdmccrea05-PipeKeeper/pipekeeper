import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

const ITEM_TYPE_MAP = {
  blend: "blend",
  bottle: "bottle",
  pipe: "pipe",
};

function buildAcquisitionItem(itemType, itemData, category, userEmail) {
  const normalizedType = ITEM_TYPE_MAP[itemType] || itemType;

  const base = {
    item_type: normalizedType,
    category,
    status: "active",
    is_manual: false,
    priority: "medium",
    created_by: userEmail || undefined,
  };

  if (itemType === "blend") {
    return {
      ...base,
      name: itemData?.name || "Unknown Blend",
      brand: itemData?.manufacturer || "",
      blend_name: itemData?.name || undefined,
      notes: [itemData?.blend_type, itemData?.notes].filter(Boolean).join(" · "),
    };
  }

  if (itemType === "bottle") {
    return {
      ...base,
      name: itemData?.name || "Unknown Bottle",
      brand: itemData?.distillery || "",
      notes: [itemData?.type, itemData?.notes].filter(Boolean).join(" · "),
    };
  }

  const pipeName =
    [itemData?.maker, itemData?.model].filter(Boolean).join(" ") ||
    itemData?.name ||
    "Unknown Pipe";

  return {
    ...base,
    name: pipeName,
    brand: itemData?.maker || "",
    pipe_model: itemData?.model || undefined,
    notes: [itemData?.shape, itemData?.notes].filter(Boolean).join(" · "),
  };
}

const CHOICES = [
  {
    key: "wishlist",
    label: "Add to Wish",
    style: {
      background: "linear-gradient(135deg,rgba(180,140,75,0.28),rgba(160,120,55,0.18))",
      border: "1px solid rgba(180,140,75,0.35)",
      color: "#D4A574",
    },
  },
  {
    key: "shopping_list",
    label: "Add to Shopping",
    style: {
      background: "linear-gradient(135deg,rgba(46,125,92,0.25),rgba(30,100,70,0.15))",
      border: "1px solid rgba(46,125,92,0.35)",
      color: "#4CAF82",
    },
  },
  {
    key: "do_not_buy_again",
    label: "Not for Me",
    style: {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "#E0D8C8",
    },
  },
  {
    key: "ignore",
    label: "Ignore",
    style: {
      background: "transparent",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "rgba(224,216,200,0.45)",
    },
  },
];

export default function PostSessionPrompt({ externalItems = [], onDone }) {
  const { user } = useCurrentUser();
  const userEmail = user?.email || null;

  const [decisions, setDecisions] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const stop = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const opts = { capture: true };
    document.addEventListener("pointerdown", stop, opts);
    document.addEventListener("mousedown", stop, opts);
    document.addEventListener("touchstart", stop, opts);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("pointerdown", stop, opts);
      document.removeEventListener("mousedown", stop, opts);
      document.removeEventListener("touchstart", stop, opts);
    };
  }, []);

  if (!externalItems.length) return null;

  const allDecided = externalItems.every((ei) => decisions[ei.label] !== undefined);

  const handleConfirm = async () => {
    if (saving) return;
    if (!userEmail) {
      toast.error("Unable to identify the current user");
      return;
    }

    setSaving(true);

    try {
      for (const ei of externalItems) {
        const choice = decisions[ei.label];
        if (!choice || choice === "ignore") continue;

        const item = buildAcquisitionItem(ei.item_type, ei.itemData, choice, userEmail);
        await base44.entities.AcquisitionItem.create(item);
      }

      toast.success("Want list updated");
      onDone?.();
    } catch (e) {
      console.error("[PostSessionPrompt] failed:", e);
      toast.error("Failed to update want list");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", pointerEvents: "auto" }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg,rgba(38,26,18,0.98),rgba(24,16,12,1))",
          border: "1px solid rgba(180,140,75,0.24)",
          boxShadow: "0 18px 48px rgba(0,0,0,0.55)",
          pointerEvents: "auto",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[rgba(180,140,75,0.14)]">
          <h3 className="font-bold text-[#F5F1E7] text-lg">What do you want to do with these?</h3>
          <p className="text-xs text-[#E0D8C8]/55 mt-1">
            You tried {externalItems.length === 1 ? "something" : "a few things"} not in your collection.
          </p>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {externalItems.map((ei) => (
            <div key={ei.label}>
              <p className="text-sm font-semibold text-[#F5F1E7] mb-2">{ei.label}</p>
              <p className="text-xs text-[#D4A574]/70 mb-3 uppercase tracking-wide">{ei.item_type}</p>
              <div className="grid grid-cols-2 gap-2">
                {CHOICES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDecisions((prev) => ({ ...prev, [ei.label]: c.key }));
                    }}
                    className="h-9 px-3 rounded-lg text-sm font-medium transition-all relative"
                    style={{
                      ...c.style,
                      opacity: decisions[ei.label] && decisions[ei.label] !== c.key ? 0.4 : 1,
                      outline: decisions[ei.label] === c.key ? "2px solid rgba(212,165,116,0.6)" : "none",
                    }}
                  >
                    {decisions[ei.label] === c.key && (
                      <CheckCircle className="w-3 h-3 inline mr-1" />
                    )}
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-[rgba(180,140,75,0.14)] flex gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDone?.();
            }}
            className="flex-1 h-9 rounded-lg text-sm text-[#E0D8C8]/50 border border-white/10"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleConfirm();
            }}
            disabled={!allDecided || saving || !userEmail}
            className="flex-1 h-9 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg,#a35c5c,#8f4e4e)" }}
          >
            {saving ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}