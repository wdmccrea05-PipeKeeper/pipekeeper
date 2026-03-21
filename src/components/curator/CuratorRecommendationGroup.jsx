/**
 * Curator Recommendation Group
 * 
 * Collapsible group of recommendations
 * Handles select all, item selection, and bulk operations
 */

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, CheckSquare, Square } from "lucide-react";
import CuratorRecommendationRow from "./CuratorRecommendationRow";

const PRIORITY_STYLES = {
  high: { bg: "rgba(139,58,58,0.2)", border: "rgba(139,58,58,0.3)", label: "High Priority" },
  medium: { bg: "rgba(180,140,75,0.15)", border: "rgba(180,140,75,0.25)", label: "Medium" },
  low: { bg: "rgba(100,100,100,0.15)", border: "rgba(100,100,100,0.25)", label: "Low" },
  info: { bg: "rgba(100,120,140,0.15)", border: "rgba(100,120,140,0.25)", label: "Info" },
};

export default function CuratorRecommendationGroup({
  group,
  workflowId,
  onAcceptItem,
  onClarifyItem,
  onApplyAllInGroup,
  isLoading = false,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());

  const priorityStyle = PRIORITY_STYLES[group.priority] || PRIORITY_STYLES.medium;

  const allSelected = useMemo(
    () =>
      group.items && group.items.length > 0 && selectedItemIds.size === group.items.length,
    [group.items, selectedItemIds]
  );

  const someSelected = useMemo(() => selectedItemIds.size > 0, [selectedItemIds]);

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set((group.items || []).map((i) => i.id)));
    }
  };

  const handleToggleItem = (itemId) => {
    const next = new Set(selectedItemIds);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setSelectedItemIds(next);
  };

  const handleApplyAll = () => {
    const itemsToApply = (group.items || []).filter((i) => selectedItemIds.has(i.id));
    if (itemsToApply.length > 0 && onApplyAllInGroup) {
      onApplyAllInGroup(group, itemsToApply);
    }
  };

  return (
    <div
      className="rounded-lg mb-4 overflow-hidden border"
      style={{
        background: priorityStyle.bg,
        borderColor: priorityStyle.border,
      }}
    >
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/10 transition-colors"
        style={{ background: "transparent" }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ChevronDown
            className="w-5 h-5 flex-shrink-0 transition-transform"
            style={{
              color: "rgba(212,165,116,1)",
              transform: isExpanded ? "rotate(0)" : "rotate(-90deg)",
            }}
          />
          <div className="text-left min-w-0">
            <h3 className="font-semibold text-sm" style={{ color: "#F5F1E7" }}>
              {group.groupTitle}
            </h3>
            <p className="text-xs" style={{ color: "rgba(224,216,200,0.6)" }}>
              {group.itemCount} item{group.itemCount !== 1 ? "s" : ""}
              {group.priority !== "info" && ` • ${priorityStyle.label}`}
            </p>
          </div>
        </div>

        {/* Selection indicator in header */}
        {isExpanded && someSelected && (
          <span
            className="text-xs px-2 py-1 rounded-full flex-shrink-0"
            style={{
              background: "rgba(46,125,92,0.3)",
              color: "rgba(46,125,92,1)",
            }}
          >
            {selectedItemIds.size} selected
          </span>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <>
          {/* Bulk select header */}
          <div
            className="px-4 py-3 border-t flex items-center gap-3"
            style={{ borderColor: "rgba(140,105,65,0.15)" }}
          >
            <button
              onClick={handleToggleAll}
              className="flex items-center gap-2 text-xs font-medium"
              style={{ color: "rgba(212,165,116,1)" }}
              disabled={isLoading}
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {allSelected ? "Deselect All" : "Select All"}
            </button>

            {someSelected && (
              <Button
                onClick={handleApplyAll}
                size="sm"
                disabled={isLoading || !someSelected}
                className="ml-auto text-xs h-8"
                style={{
                  background: "linear-gradient(135deg, rgba(46,125,92,0.9), rgba(38,100,73,1))",
                  border: "1px solid rgba(46,125,92,0.4)",
                }}
              >
                Apply {selectedItemIds.size}
              </Button>
            )}
          </div>

          {/* Items */}
          <div className="px-4 py-3 space-y-0">
            {(group.items || []).map((item) => (
              <CuratorRecommendationRow
                key={item.id}
                item={item}
                onAccept={onAcceptItem}
                onClarify={onClarifyItem}
                isSelected={selectedItemIds.has(item.id)}
                onToggleSelect={handleToggleItem}
                isLoading={isLoading}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}