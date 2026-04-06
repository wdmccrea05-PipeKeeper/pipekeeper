/**
 * Curator Recommendation Group
 *
 * Collapsible group of recommendations.
 * Handles select all, item selection, and bulk operations.
 */

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, CheckSquare, Square } from "lucide-react";
import CuratorRecommendationRow from "./CuratorRecommendationRow";

const PRIORITY_STYLES = {
  high: {
    headerBg: "rgba(139,58,58,0.18)",
    border: "rgba(139,58,58,0.28)",
    badge: { bg: "rgba(163,92,92,0.25)", text: "rgba(220,140,140,1)" },
    label: "High Priority",
  },
  medium: {
    headerBg: "rgba(180,140,75,0.12)",
    border: "rgba(180,140,75,0.22)",
    badge: { bg: "rgba(180,140,75,0.18)", text: "rgba(212,165,116,1)" },
    label: "Medium",
  },
  low: {
    headerBg: "rgba(80,80,80,0.12)",
    border: "rgba(100,100,100,0.2)",
    badge: { bg: "rgba(100,100,100,0.15)", text: "rgba(180,180,180,0.85)" },
    label: "Low",
  },
  info: {
    headerBg: "rgba(80,110,150,0.12)",
    border: "rgba(100,130,180,0.18)",
    badge: { bg: "rgba(100,120,160,0.18)", text: "rgba(140,170,220,0.9)" },
    label: "Info",
  },
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

  const ps = PRIORITY_STYLES[group.priority] || PRIORITY_STYLES.medium;

  const allSelected = useMemo(
    () => group.items?.length > 0 && selectedItemIds.size === group.items.length,
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
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
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
      className="rounded-xl mb-5 overflow-hidden"
      style={{ border: `1px solid ${ps.border}` }}
    >
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3.5 flex items-center justify-between transition-colors"
        style={{ background: ps.headerBg }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ChevronDown
            className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
            style={{
              color: "rgba(212,165,116,0.8)",
              transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
            }}
          />
          <div className="text-left min-w-0">
            <p className="font-semibold text-sm leading-tight" style={{ color: "#F5F1E7" }}>
              {group.groupTitle}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(224,216,200,0.5)" }}>
              {group.itemCount} {group.itemCount === 1 ? "item" : "items"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          {group.priority !== "info" && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: ps.badge.bg, color: ps.badge.text }}
            >
              {ps.label}
            </span>
          )}
          {isExpanded && someSelected && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(46,125,92,0.25)", color: "rgba(80,180,130,1)" }}
            >
              {selectedItemIds.size} selected
            </span>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <>
          {/* Bulk select bar */}
          <div
            className="px-5 py-2.5 flex items-center gap-3"
            style={{ borderBottom: "1px solid rgba(140,105,65,0.12)", background: "rgba(0,0,0,0.1)" }}
          >
            <button
              onClick={handleToggleAll}
              className="flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ color: "rgba(212,165,116,0.8)" }}
              disabled={isLoading}
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" style={{ opacity: 0.6 }} />
              )}
              {allSelected ? "Deselect All" : "Select All"}
            </button>

            {someSelected && (
              <Button
                onClick={handleApplyAll}
                size="sm"
                disabled={isLoading || !someSelected}
                className="ml-auto text-xs h-7 font-medium"
                style={{
                  background: "linear-gradient(135deg, rgba(46,125,92,0.9), rgba(38,100,73,1))",
                  border: "1px solid rgba(46,125,92,0.3)",
                  color: "#e8f5ee",
                }}
              >
                Apply {selectedItemIds.size}
              </Button>
            )}
          </div>

          {/* Items */}
          <div className="px-4 pt-3 pb-2">
            {(group.items || []).map((item) => (
              <CuratorRecommendationRow
                key={item.id}
                item={item}
                workflowId={workflowId}
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