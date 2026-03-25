import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const CONFIG = {
  find_similar_blends: {
    label: "Select Tobacco Blend",
    dataKey: "blends",
    itemKey: "name",
  },
  find_similar_pipes: {
    label: "Select Pipe",
    dataKey: "pipes",
    itemKey: "name",
  },
  find_similar_bottles: {
    label: "Select Whiskey Bottle",
    dataKey: "bottles",
    itemKey: "name",
  },
};

function scoreItemImportance(item, logs = []) {
  let score = 0;

  // Favorites: +10
  if (item.is_favorite) score += 10;

  // Recent usage: count logs for this item in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentUsage = logs.filter(
    (log) =>
      (log.blend_id === item.id || log.pipe_id === item.id || log.bottle_id === item.id) &&
      new Date(log.date) > thirtyDaysAgo
  ).length;

  score += recentUsage * 2;

  // Rating: +5 per point (max 5)
  if (item.rating) score += Math.min(item.rating, 5);

  return score;
}

export default function FindSimilarPicker({
  actionType,
  pipes = [],
  blends = [],
  bottles = [],
  smokingLogs = [],
  tastingLogs = [],
  onConfirm,
  onCancel,
}) {
  const config = CONFIG[actionType];
  if (!config) return null;

  const [mode, setMode] = useState("auto");
  const [selected, setSelected] = useState(null);

  const data = {
    find_similar_blends: blends,
    find_similar_pipes: pipes,
    find_similar_bottles: bottles,
  }[actionType] || [];

  const logs = actionType === "find_similar_blends" ? smokingLogs : tastingLogs;

  // Auto-select top 3 favorites + recently used
  const topItems = useMemo(() => {
    if (data.length === 0) return [];
    return data
      .map((item) => ({
        item,
        score: scoreItemImportance(item, logs),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.item);
  }, [data, logs]);

  const itemList = mode === "auto" ? topItems : data;
  const displaySelected = selected !== null ? selected : (topItems[0]?.id || null);

  const handleConfirm = () => {
    if (mode === "auto") {
      onConfirm(topItems, true);
    } else {
      const selectedItem = data.find((d) => d.id === displaySelected);
      if (selectedItem) onConfirm([selectedItem], false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="rounded-xl p-6 max-w-md w-full mx-4" style={{ background: "rgba(32,22,15,0.95)", border: "1px solid rgba(140,105,65,0.35)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: "#E0D8C8" }}>
            {config.label}
          </h3>
          <button onClick={onCancel} className="p-1 hover:bg-white/10 rounded">
            <X className="w-4 h-4" style={{ color: "#E0D8C8" }} />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setMode("auto")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "auto"
                  ? "bg-amber-500 text-black"
                  : "bg-white/10 text-amber-100 hover:bg-white/15"
              }`}
            >
              Top Picks ({topItems.length})
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "manual"
                  ? "bg-amber-500 text-black"
                  : "bg-white/10 text-amber-100 hover:bg-white/15"
              }`}
            >
              Choose
            </button>
          </div>
        </div>

        {mode === "auto" ? (
          <div className="space-y-2 mb-4">
            {topItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg"
                style={{ background: "rgba(60,45,30,0.5)", border: "1px solid rgba(140,105,65,0.2)" }}
              >
                <div className="font-medium text-sm" style={{ color: "#E0D8C8" }}>
                  {item[config.itemKey]}
                </div>
                {item.rating && (
                  <div className="text-xs mt-1" style={{ color: "rgba(224,216,200,0.6)" }}>
                    ⭐ {item.rating}/5
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <select
            value={displaySelected || ""}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full px-3 py-2 rounded-lg mb-4 text-sm"
            style={{ background: "rgba(20,14,10,0.6)", border: "1px solid rgba(140,105,65,0.3)", color: "#E0D8C8" }}
          >
            <option value="" disabled>
              Select an item
            </option>
            {data.map((item) => (
              <option key={item.id} value={item.id}>
                {item[config.itemKey]}
              </option>
            ))}
          </select>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleConfirm}
            disabled={mode === "manual" && !displaySelected}
            className="flex-1"
            style={{
              background: "linear-gradient(135deg, rgba(139,58,58,0.95), rgba(109,46,46,1))",
            }}
          >
            Find Similar
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}