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
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-stone-600">{t("pipeDetailTabs.noSpecializationSet")}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
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
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-800">{t("pipeDetailTabs.pipeSpecialization")}</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
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
              className="shrink-0 text-blue-900 hover:text-blue-950"
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
              <Badge key={idx} className="bg-blue-100 text-blue-800 border-blue-200 pr-1">
                {label}
                {editing && (
                  <button
                    onClick={() => handleRemove(idx)}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>

        {editing && (
          <div className="space-y-2">
            <Select onValueChange={handleSelectFocus}>
              <SelectTrigger className="text-sm">
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
              <p className="text-xs text-stone-500 w-full mb-1">{t("pipeDetailTabs.quickAdd")}</p>
              {FOCUS_OPTIONS.filter(o => !designations.includes(o.canonical)).map(option => (
                <Badge
                  key={option.canonical}
                  variant="outline"
                  className="cursor-pointer hover:bg-blue-100 text-xs border-blue-200"
                  onClick={() => handleSelectFocus(option.canonical)}
                >
                  {t(option.labelKey, option.canonical)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {matchingBlends.length > 0 && (
          <div>
            <p className="text-xs font-medium text-blue-700 mb-2">{t("pipeDetailTabs.matchingBlends")}</p>
            <div className="flex flex-wrap gap-1.5">
              {matchingBlends.slice(0, 5).map(blend => (
                <a key={blend.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-blue-50 border-blue-200 text-blue-700">
                    {blend.name}
                  </Badge>
                </a>
              ))}
              {matchingBlends.length > 5 && (
                <Badge variant="outline" className="border-blue-200 text-blue-600">
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