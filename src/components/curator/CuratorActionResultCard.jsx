import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function CuratorActionResultCard({
  actionResult,
  onApplyItems,
  onClarify,
  loading = false,
}) {
  const { t } = useTranslation();
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [selectedItems, setSelectedItems] = useState(new Set());

  if (!actionResult || !actionResult.groups || actionResult.groups.length === 0) {
    return null;
  }

  const toggleGroup = (groupIdx) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupIdx)) {
        next.delete(groupIdx);
      } else {
        next.add(groupIdx);
      }
      return next;
    });
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleApplyAll = () => {
    const allItemIds = actionResult.groups.flatMap((g) =>
      g.items.map((item) => item.id)
    );
    onApplyItems(actionResult.groups, allItemIds);
  };

  const handleApplySelected = () => {
    if (selectedItems.size === 0) return;
    
    const relevantGroups = actionResult.groups.map((group) => ({
      ...group,
      items: group.items.filter((item) => selectedItems.has(item.id)),
    })).filter((g) => g.items.length > 0);
    
    onApplyItems(relevantGroups, Array.from(selectedItems));
  };

  const handleClarify = () => {
    const selectedItemDetails = [];
    actionResult.groups.forEach((group) => {
      group.items.forEach((item) => {
        if (selectedItems.size === 0 || selectedItems.has(item.id)) {
          selectedItemDetails.push({
            itemName: item.itemName,
            issue: item.issue,
            recommendation: item.recommendation,
          });
        }
      });
    });
    
    onClarify({
      actionId: actionResult.actionId,
      title: actionResult.title,
      selectedItems: selectedItemDetails.length > 0 ? selectedItemDetails : null,
    });
  };

  const totalItems = actionResult.groups.reduce((sum, g) => sum + g.items.length, 0);
  const selectAllChecked = selectedItems.size === totalItems && totalItems > 0;

  return (
    <Card className="border border-[#8b6239]/25 rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-[#2a1f18] to-[#1f1510] border-b border-[#8b6239]/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl text-[#E0D8C8] mb-2">
              {actionResult.title}
            </CardTitle>
            <p className="text-sm text-[#E0D8C8]/70">
              {actionResult.summary}
            </p>
          </div>
          <div className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#8b6239]/15 border border-[#8b6239]/25">
            <span className="text-xs font-semibold text-[#D4A574]">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Selection controls */}
        {totalItems > 1 && (
          <div className="px-6 py-3 border-b border-[#8b6239]/15 flex items-center gap-2 bg-[#1a1410]/50">
            <input
              type="checkbox"
              checked={selectAllChecked}
              onChange={(e) => {
                if (e.target.checked) {
                  const allIds = actionResult.groups.flatMap((g) =>
                    g.items.map((item) => item.id)
                  );
                  setSelectedItems(new Set(allIds));
                } else {
                  setSelectedItems(new Set());
                }
              }}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <label className="text-sm text-[#E0D8C8]/70 cursor-pointer flex-1">
              {selectAllChecked ? 'Deselect all' : 'Select all'}
            </label>
          </div>
        )}

        {/* Groups */}
        <div className="space-y-0">
          {actionResult.groups.map((group, groupIdx) => {
            const isExpanded = expandedGroups.has(groupIdx);
            return (
              <div key={groupIdx} className="border-b border-[#8b6239]/10 last:border-b-0">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(groupIdx)}
                  className="w-full px-6 py-3 flex items-center justify-between hover:bg-[#2a1f18]/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <span className="text-sm font-semibold text-[#D4A574]">
                      {group.groupTitle}
                    </span>
                    <span className="text-xs text-[#E0D8C8]/50">
                      ({group.items.length})
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#8b6239]/60" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#8b6239]/60" />
                  )}
                </button>

                {/* Group items */}
                {isExpanded && (
                  <div className="bg-[#15100c]/30 px-6 py-3 space-y-3 border-t border-[#8b6239]/10">
                    {group.items.map((item, itemIdx) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-[#8b6239]/20 bg-[#1a1410]/40 p-3"
                      >
                        <div className="flex items-start gap-3">
                          {/* Selection checkbox */}
                          {totalItems > 1 && (
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={() => toggleItemSelection(item.id)}
                              className="w-4 h-4 mt-1 rounded cursor-pointer flex-shrink-0"
                            />
                          )}

                          {/* Item details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <h4 className="font-semibold text-[#E0D8C8]">
                                {item.itemName}
                              </h4>
                              <span className="text-xs text-[#E0D8C8]/50">
                                {Math.round(item.confidence * 100)}% confidence
                              </span>
                            </div>

                            <p className="text-sm text-[#E0D8C8]/70 mb-2">
                              <strong>Issue:</strong> {item.issue}
                            </p>

                            <p className="text-sm text-[#D4A574]">
                              <strong>Recommendation:</strong> {item.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="px-6 py-4 border-t border-[#8b6239]/15 bg-[#1a1410]/50 flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Apply buttons */}
          <div className="flex gap-2 flex-1">
            <Button
              onClick={handleApplyAll}
              disabled={loading}
              className="flex-1 bg-[#8b6239]/40 hover:bg-[#8b6239]/50 text-[#D4A574] border border-[#8b6239]/40"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Apply All</span>
              <span className="sm:hidden">Apply All ({totalItems})</span>
            </Button>

            {selectedItems.size > 0 && selectedItems.size < totalItems && (
              <Button
                onClick={handleApplySelected}
                disabled={loading}
                className="flex-1 bg-[#8b6239]/60 hover:bg-[#8b6239]/70 text-[#F5F1E7] border border-[#8b6239]/60"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Apply ({selectedItems.size})
              </Button>
            )}
          </div>

          {/* Clarify button */}
          <Button
            onClick={handleClarify}
            disabled={loading}
            variant="outline"
            className="flex-1 border-[#8b6239]/40 text-[#D4A574] hover:bg-[#8b6239]/10"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Clarify
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}