import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/components/utils/createPageUrl";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { invalidateAIQueries } from "@/components/utils/cacheInvalidation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import SpecializationRecommender from "./SpecializationRecommender";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { FOCUS_OPTIONS, FOCUS_LABEL_KEY } from "@/components/utils/focusOptions";

export default function PipeSpecialization({ pipe, blends, onUpdate, isPaidUser }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [designations, setDesignations] = useState(pipe.focus || []);
  const [customText, setCustomText] = useState("");

  const handleSelectFocus = (canonical) => {
    if (!canonical || designations.includes(canonical)) return;
    const updated = [...designations, canonical];
    setDesignations(updated);
    onUpdate({ focus: updated });
    invalidateAIQueries(queryClient, pipe.created_by);
    toast.success(t("pipeDetailTabs.focusUpdated"), {
      description: t("pipeDetailTabs.regenerateToSeeUpdates")
    });
  };

  const handleAddCustom = () => {
    if (!customText.trim() || designations.includes(customText.trim())) return;
    const updated = [...designations, customText.trim()];
    setDesignations(updated);
    onUpdate({ focus: updated });
    setCustomText("");
    invalidateAIQueries(queryClient, pipe.created_by);
    toast.success(t("pipeDetailTabs.focusUpdated"), {
      description: t("pipeDetailTabs.regenerateToSeeUpdates")
    });
  };

  const handleRemove = (index) => {
    const updated = designations.filter((_, i) => i !== index);
    setDesignations(updated);
    onUpdate({ focus: updated });
    // Invalidate AI queries when focus changes
    invalidateAIQueries(queryClient, pipe.created_by);
    toast.success(t("pipeDetailTabs.focusUpdated"), {
      description: t("pipeDetailTabs.regenerateToSeeUpdates")
    });
  };

  // Find matching blends based on designations
  const hasNonAromaticFocus = designations.some(d => 
    d.toLowerCase().includes('non-aromatic') || d.toLowerCase().includes('non aromatic')
  );
  const hasAromaticFocus = designations.some(d => 
    d.toLowerCase() === 'aromatic' && !d.toLowerCase().includes('non')
  );
  
  const matchingBlends = blends.filter(blend => {
    const isAromaticBlend = blend.blend_type?.toLowerCase() === 'aromatic';
    
    // Exclude aromatics if non-aromatic focus
    if (hasNonAromaticFocus && isAromaticBlend) return false;
    
    // Exclude non-aromatics if aromatic focus
    if (hasAromaticFocus && !isAromaticBlend) return false;
    
    // Otherwise match on blend type
    return designations.some(designation => 
      blend.blend_type?.toLowerCase().includes(designation.toLowerCase()) ||
      designation.toLowerCase().includes(blend.blend_type?.toLowerCase())
    );
  });

  if (!isPaidUser) {
    return (
      <UpgradePrompt 
        featureName={t("pipeDetailTabs.pipeSpecialization")}
        description={t("pipeDetailTabs.specializationUpgradeDesc")}
      />
    );
  }

  if (!editing && (!designations || designations.length === 0)) {
    return (
      <Card style={{
        background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
        border: "1px solid rgba(140,105,65,0.35)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)"
      }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" style={{ color: "rgba(180,140,75,0.9)" }} />
              <span className="text-sm" style={{ color: "#E0D8C8" }}>{t("pipeDetailTabs.noSpecializationSet")}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              style={{
                background: "linear-gradient(135deg, rgba(100,70,45,0.5), rgba(80,55,35,0.6))",
                border: "1px solid rgba(140,105,65,0.4)",
                color: "#E0D8C8"
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              {t("pipeDetailTabs.addSpecialization")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{
      background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
      border: "1px solid rgba(140,105,65,0.35)",
      boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)"
    }}>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5" style={{ color: "rgba(180,140,75,0.9)" }} />
            <span className="font-semibold" style={{ color: "#E0D8C8" }}>{t("pipeDetailTabs.pipeSpecialization")}</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-hidden">
            <SpecializationRecommender 
              pipe={pipe} 
              onApplyRecommendation={(data) => {
                setDesignations(data.focus);
                onUpdate(data);
                invalidateAIQueries(queryClient, pipe.created_by);
              }} 
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(!editing)}
              style={{ color: "#E0D8C8" }}
            >
              {editing ? t("pipeDetailTabs.done") : t("common.edit")}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {designations.map((canonical, idx) => {
            const labelKey = FOCUS_LABEL_KEY[canonical];
            const label = labelKey ? t(labelKey, canonical) : canonical;
            return (
              <Badge key={idx} style={{ background: "rgba(140,105,65,0.3)", color: "#E0D8C8", borderColor: "rgba(140,105,65,0.5)" }} className="pr-1">
                {label}
                {editing && (
                  <button
                    onClick={() => handleRemove(idx)}
                    className="ml-1 rounded-full p-0.5" style={{ color: "rgba(140,105,65,0.7)" }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>

        {editing && (
          <div className="space-y-3">
            <Select onValueChange={handleSelectFocus}>
              <SelectTrigger className="text-sm" style={{
                background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))",
                borderColor: "rgba(140,105,65,0.4)",
                color: "#E0D8C8"
              }}>
                <SelectValue placeholder={t("pipeDetailTabs.addDesignationPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {FOCUS_OPTIONS.filter(o => !designations.includes(o.canonical)).map(option => (
                  <SelectItem key={option.canonical} value={option.canonical}>
                    {t(option.labelKey, option.canonical)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1.5">
              <p className="text-xs w-full mb-1" style={{ color: "rgba(224,216,200,0.5)" }}>{t("pipeDetailTabs.quickAdd")}</p>
              {FOCUS_OPTIONS.filter(o => !designations.includes(o.canonical)).map(option => (
                <Badge
                  key={option.canonical}
                  variant="outline"
                  className="cursor-pointer text-xs"
                  style={{
                    borderColor: "rgba(140,105,65,0.4)",
                    color: "#E0D8C8"
                  }}
                  onClick={() => handleSelectFocus(option.canonical)}
                >
                  {t(option.labelKey, option.canonical)}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                placeholder={t("pipes.customSpecializationPlaceholder")}
                style={{
                  flex: 1,
                  padding: "0.375rem 0.5rem",
                  fontSize: "0.875rem",
                  border: "1px solid rgba(140,105,65,0.4)",
                  borderRadius: "0.375rem",
                  background: "linear-gradient(135deg, rgba(60,45,30,0.6), rgba(50,35,25,0.8))",
                  color: "#E0D8C8"
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddCustom}
                disabled={!customText.trim()}
                style={{
                  background: "linear-gradient(135deg, rgba(100,70,45,0.5), rgba(80,55,35,0.6))",
                  border: "1px solid rgba(140,105,65,0.4)",
                  color: "#E0D8C8"
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {matchingBlends.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "rgba(180,140,75,0.9)" }}>{t("pipeDetailTabs.matchingBlends")}</p>
            <div className="flex flex-wrap gap-1.5">
              {matchingBlends.slice(0, 5).map(blend => (
                <a key={blend.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
                  <Badge variant="outline" className="cursor-pointer text-xs" style={{
                    borderColor: "rgba(140,105,65,0.4)",
                    color: "#E0D8C8"
                  }}>
                    {blend.name}
                  </Badge>
                </a>
              ))}
              {matchingBlends.length > 5 && (
                <Badge variant="outline" style={{
                  borderColor: "rgba(140,105,65,0.4)",
                  color: "rgba(224,216,200,0.7)"
                }}>
                  +{matchingBlends.length - 5} {t("pipeDetailTabs.more")}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}