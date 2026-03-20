/**
 * Curator Action Result Card
 * 
 * Complete recommendation card with groups, items, and controls
 * NOT a chat bubble — a decision panel
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import CuratorRecommendationGroup from "./CuratorRecommendationGroup";

export default function CuratorActionResultCard({
  actionResult,
  onApplyItems,
  onClarify,
  loading = false,
}) {
  const [appliedItemIds, setAppliedItemIds] = useState(new Set());
  const [applyError, setApplyError] = useState(null);

  if (!actionResult) {
    return null;
  }

  const handleAcceptItem = async (item) => {
    if (!onApplyItems) return;

    try {
      setApplyError(null);
      await onApplyItems(
        [{ groupKey: "single", items: [item] }],
        new Set([item.id])
      );
      setAppliedItemIds((prev) => new Set([...prev, item.id]));
    } catch (err) {
      console.error("Failed to apply item:", err);
      setApplyError(err?.message || "Failed to apply change");
    }
  };

  const handleClarifyItem = (item) => {
    if (!onClarify) return;

    const clarificationContext = {
      itemName: item.itemName,
      itemType: item.type,
      issue: item.issue,
      recommendation: item.recommendation,
      proposedChange: item.proposedChange,
    };

    onClarify(clarificationContext);
  };

  const handleApplyAllInGroup = async (group, items) => {
    if (!onApplyItems) return;

    try {
      setApplyError(null);
      await onApplyItems(
        [{ ...group, items }],
        new Set(items.map((i) => i.id))
      );
      const newApplied = new Set(appliedItemIds);
      items.forEach((i) => newApplied.add(i.id));
      setAppliedItemIds(newApplied);
    } catch (err) {
      console.error("Failed to apply group:", err);
      setApplyError(err?.message || "Failed to apply changes");
    }
  };

  const allGroups = actionResult.groups || [];
  const totalItems = allGroups.reduce((s, g) => s + (g.items?.length || 0), 0);

  return (
    <div
      className="rounded-xl overflow-hidden shadow-lg mb-4"
      style={{
        background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
        border: "1px solid rgba(140,105,65,0.35)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.6)",
      }}
    >
      {/* Header */}
      <div
        className="px-6 py-5 border-b"
        style={{
          borderColor: "rgba(140,105,65,0.2)",
          background: "rgba(20,14,10,0.4)",
        }}
      >
        <div className="space-y-3">
          <div>
            <h2
              className="text-xl font-bold mb-2"
              style={{ color: "#F5F1E7", fontFamily: "Georgia, serif" }}
            >
              {actionResult.title}
            </h2>
            <p className="text-sm" style={{ color: "rgba(224,216,200,0.7)" }}>
              {actionResult.summary}
            </p>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs pt-2">
            <span style={{ color: "rgba(212,165,116,1)" }}>
              {allGroups.length} group{allGroups.length !== 1 ? "s" : ""}
            </span>
            <span style={{ color: "rgba(212,165,116,1)" }}>
              {totalItems} recommendation{totalItems !== 1 ? "s" : ""}
            </span>
            {appliedItemIds.size > 0 && (
              <span style={{ color: "rgba(46,125,92,1)" }}>
                ✓ {appliedItemIds.size} applied
              </span>
            )}
          </div>

          {/* Error display */}
          {applyError && (
            <div
              className="rounded-lg px-3 py-2.5 text-xs flex items-start gap-2"
              style={{
                background: "rgba(139,58,58,0.2)",
                border: "1px solid rgba(139,58,58,0.3)",
                color: "#F5D4D4",
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{applyError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Groups */}
      <div className="px-6 py-4">
        {allGroups.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2
              className="w-12 h-12 mx-auto mb-3 opacity-50"
              style={{ color: "rgba(46,125,92,0.4)" }}
            />
            <p className="text-sm" style={{ color: "rgba(224,216,200,0.5)" }}>
              No recommendations at this time.
            </p>
          </div>
        ) : (
          allGroups.map((group) => (
            <CuratorRecommendationGroup
              key={group.groupKey}
              group={group}
              onAcceptItem={handleAcceptItem}
              onClarifyItem={handleClarifyItem}
              onApplyAllInGroup={handleApplyAllInGroup}
              isLoading={loading}
            />
          ))
        )}
      </div>

      {/* Footer controls */}
      {allGroups.length > 0 && (
        <div
          className="px-6 py-4 border-t flex gap-3 justify-end"
          style={{
            borderColor: "rgba(140,105,65,0.2)",
            background: "rgba(20,14,10,0.2)",
          }}
        >
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            disabled={loading}
            className="text-xs"
          >
            Cancel
          </Button>
          {/* Main apply button — applies all recommendations */}
          {totalItems > 0 && (
            <Button
              disabled={loading || appliedItemIds.size === totalItems}
              className="text-xs"
              style={{
                background: "linear-gradient(135deg, rgba(46,125,92,0.9), rgba(38,100,73,1))",
                border: "1px solid rgba(46,125,92,0.4)",
              }}
            >
              {appliedItemIds.size === totalItems ? "✓ All Applied" : `Apply All (${totalItems})`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}