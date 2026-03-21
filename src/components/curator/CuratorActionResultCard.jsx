/**
 * Curator Action Result Card
 *
 * Complete recommendation panel with groups, items, and structured workflow controls.
 * Supports: Accept, Dismiss, Exclude, Show Why, Regenerate, Broaden, Narrow, Ask to Refine.
 * All controls operate on structured workflow state — NOT chat fallbacks.
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Maximize2,
  Minimize2,
  MessageSquare,
  Info,
} from "lucide-react";
import CuratorRecommendationGroup from "./CuratorRecommendationGroup";

export default function CuratorActionResultCard({
  actionResult,
  onApplyItems,
  onClarify,
  onRegenerate,   // (mode: 'standard'|'broaden'|'narrow') => void
  loading = false,
}) {
  const [appliedItemIds, setAppliedItemIds] = useState(new Set());
  const [applyError, setApplyError] = useState(null);
  const [showCoverage, setShowCoverage] = useState(false);

  if (!actionResult) return null;

  const handleAcceptItem = async (item) => {
    if (!onApplyItems) return;
    try {
      setApplyError(null);
      await onApplyItems([{ groupKey: "single", items: [item] }], new Set([item.id]));
      setAppliedItemIds((prev) => new Set([...prev, item.id]));
    } catch (err) {
      setApplyError(err?.message || "Failed to apply change");
    }
  };

  const handleClarifyItem = (item) => {
    if (!onClarify) return;
    onClarify({
      itemName: item.itemName,
      itemType: item.type,
      issue: item.issue,
      recommendation: item.recommendation,
      proposedChange: item.proposedChange,
    });
  };

  const handleApplyAllInGroup = async (group, items) => {
    if (!onApplyItems) return;
    try {
      setApplyError(null);
      await onApplyItems([{ ...group, items }], new Set(items.map((i) => i.id)));
      const newApplied = new Set(appliedItemIds);
      items.forEach((i) => newApplied.add(i.id));
      setAppliedItemIds(newApplied);
    } catch (err) {
      setApplyError(err?.message || "Failed to apply changes");
    }
  };

  const allGroups = actionResult.groups || [];
  const totalItems = allGroups.reduce((s, g) => s + (g.items?.length || 0), 0);
  const audit = actionResult._audit;
  const coverage = actionResult._coverage;

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
        style={{ borderColor: "rgba(140,105,65,0.2)", background: "rgba(20,14,10,0.4)" }}
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
          <div className="flex items-center gap-4 text-xs pt-1 flex-wrap">
            <span style={{ color: "rgba(212,165,116,1)" }}>
              {allGroups.length} group{allGroups.length !== 1 ? "s" : ""}
            </span>
            <span style={{ color: "rgba(212,165,116,1)" }}>
              {totalItems} recommendation{totalItems !== 1 ? "s" : ""}
            </span>
            {appliedItemIds.size > 0 && (
              <span style={{ color: "rgba(46,125,92,1)" }}>✓ {appliedItemIds.size} applied</span>
            )}
            {coverage && (
              <button
                onClick={() => setShowCoverage(v => !v)}
                className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: "rgba(180,140,75,1)" }}
              >
                <Info className="w-3 h-3" />
                {coverage.totalEligible} eligible items analyzed
              </button>
            )}
          </div>

          {/* Coverage audit panel (expandable) */}
          {showCoverage && audit && (
            <div
              className="rounded-lg p-3 text-xs font-mono space-y-1"
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(140,105,65,0.2)",
                color: "rgba(180,180,180,0.9)",
              }}
            >
              <p className="font-semibold text-amber-300 mb-1">Coverage Audit</p>
              <p>Modules: {(audit.modulesIncluded || []).join(', ') || '—'}</p>
              <p>Items: {audit.totalRawItems} raw / {audit.totalEligibleItems} eligible / {audit.totalExcluded} excluded</p>
              <p>Logs: {audit.totalLogs} ({audit.modules?.pipe?.logs || 0} smoking + {audit.modules?.whiskey?.logs || 0} tasting)</p>
              {audit.modules?.pipe?.total > 0 && <p>Pipe: {audit.modules.pipe.eligible}/{audit.modules.pipe.total} eligible</p>}
              {audit.modules?.tobacco?.total > 0 && <p>Tobacco: {audit.modules.tobacco.eligible}/{audit.modules.tobacco.total} eligible</p>}
              {audit.modules?.whiskey?.total > 0 && <p>Whiskey: {audit.modules.whiskey.eligible}/{audit.modules.whiskey.total} eligible</p>}
              {audit.reconciliation && (
                <>
                  <p>AI refs: {audit.reconciliation.validItemIds} valid / {audit.reconciliation.invalidItemIds} invalid IDs</p>
                  {audit.reconciliation.invalidItemIds > 0 && (
                    <p className="text-red-400">⚠ Invalid IDs filtered: {(audit.reconciliation.invalidIdList || []).join(', ')}</p>
                  )}
                </>
              )}
            </div>
          )}

          {applyError && (
            <div
              className="rounded-lg px-3 py-2.5 text-xs flex items-start gap-2"
              style={{ background: "rgba(139,58,58,0.2)", border: "1px solid rgba(139,58,58,0.3)", color: "#F5D4D4" }}
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
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" style={{ color: "rgba(46,125,92,0.4)" }} />
            <p className="text-sm" style={{ color: "rgba(224,216,200,0.5)" }}>No recommendations at this time.</p>
          </div>
        ) : (
          allGroups.map((group) => (
            <CuratorRecommendationGroup
              key={group.groupKey}
              group={group}
              workflowId={actionResult.actionId}
              onAcceptItem={handleAcceptItem}
              onClarifyItem={handleClarifyItem}
              onApplyAllInGroup={handleApplyAllInGroup}
              isLoading={loading}
            />
          ))
        )}
      </div>

      {/* Footer controls — structured workflow, not chat */}
      <div
        className="px-6 py-4 border-t"
        style={{ borderColor: "rgba(140,105,65,0.2)", background: "rgba(20,14,10,0.2)" }}
      >
        {/* Workflow action row */}
        <div className="flex flex-wrap gap-2 mb-3">
          {onRegenerate && (
            <>
              <Button
                onClick={() => onRegenerate('standard')}
                disabled={loading}
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                style={{ borderColor: "rgba(180,140,75,0.3)", color: "rgba(212,165,116,1)" }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </Button>
              <Button
                onClick={() => onRegenerate('broaden')}
                disabled={loading}
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                style={{ borderColor: "rgba(100,140,180,0.3)", color: "rgba(150,190,230,0.9)" }}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Broaden
              </Button>
              <Button
                onClick={() => onRegenerate('narrow')}
                disabled={loading}
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                style={{ borderColor: "rgba(140,100,60,0.3)", color: "rgba(200,160,110,0.9)" }}
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Best Matches
              </Button>
            </>
          )}
          {onClarify && (
            <Button
              onClick={() => onClarify({ refineAll: true })}
              disabled={loading}
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              style={{ borderColor: "rgba(140,105,65,0.25)", color: "rgba(224,216,200,0.7)" }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Ask to Refine
            </Button>
          )}
        </div>

        {/* Primary action row */}
        {allGroups.length > 0 && (
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => onClarify && onClarify({ dismiss: true })}
              variant="outline"
              disabled={loading}
              size="sm"
              className="text-xs"
            >
              Dismiss All
            </Button>
            {totalItems > 0 && (
              <Button
                onClick={() => {
                  if (onApplyItems) {
                    onApplyItems(allGroups, new Set(allGroups.flatMap(g => (g.items || []).map(i => i.id))));
                    setAppliedItemIds(new Set(allGroups.flatMap(g => (g.items || []).map(i => i.id))));
                  }
                }}
                disabled={loading || appliedItemIds.size === totalItems}
                size="sm"
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
    </div>
  );
}