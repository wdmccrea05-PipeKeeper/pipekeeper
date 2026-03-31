import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Target, CheckCircle2, AlertCircle, Lightbulb, Crown, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { FOCUS_LABEL_KEY } from "@/components/utils/focusOptions";

export default function SpecializationRecommender({ pipe, onApplyRecommendation }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const entitlements = useEntitlements();
  const hasAccess = entitlements.canUse('PAIRING_ADVANCED');

  const handleGetRecommendation = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('getSpecializationRecommendation', {
        pipeId: pipe.id
      });
      
      const data = response?.data || response;

      if (data?.success) {
        setRecommendation(data.recommendation);
        setIsOpen(true);
      } else if (data?.recommendation) {
        setRecommendation(data.recommendation);
        setIsOpen(true);
      } else {
        toast.error(t("errors.recommendationFailed"));
      }
    } catch (error) {
      console.error('Error getting recommendation:', error);
      toast.error(t("errors.recommendationFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (recommendation?.recommended_specializations) {
      onApplyRecommendation({
        focus: recommendation.recommended_specializations
      });
      toast.success(t("specializationRec.applied"), {
        description: t("specializationRec.appliedDesc")
      });
      setIsOpen(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="w-full">
        <UpgradePrompt 
          featureName={t("pipeDetailTabs.pipeSpecialization")}
          description={t("specializationRec.upgradeDesc")}
        />
      </div>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleGetRecommendation}
        disabled={isLoading}
        className="border-[rgba(180,140,75,0.35)] text-white hover:bg-white/10 whitespace-nowrap"
      >
        <Sparkles className="w-4 h-4 mr-1 shrink-0" />
        <span>{isLoading ? t("specializationRec.analyzing") : t("pipeDetailTabs.getAIRecommendation")}</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#E0D8C8]" />
              {t("specializationRec.specializationRecommendation")}
            </DialogTitle>
            <DialogDescription>
              {t("specializationRec.aiAnalysisFor")} {pipe.name}
            </DialogDescription>
          </DialogHeader>

          {recommendation && (
            <div className="space-y-4 mt-4">
              {/* Recommended Specializations */}
              <Card className="border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-[#E0D8C8] mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#E0D8C8]">{t("specializationRec.recommendedSpecializations")}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {recommendation.recommended_specializations?.map((canonical, idx) => {
                          const labelKey = FOCUS_LABEL_KEY[canonical];
                          const label = labelKey ? t(labelKey, canonical) : canonical;
                          return (
                            <Badge key={idx} className="bg-white/10 text-[#E0D8C8] border-white/20">
                              {label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reasoning */}
              {recommendation.reasoning && (
                <Card className="border-white/10">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-[#E0D8C8] mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      {t("specializationRec.whyThisWorks")}
                    </h3>
                    <p className="text-sm text-[#E0D8C8]/80 leading-relaxed whitespace-normal break-words">
                       {String(recommendation.reasoning || '')}
                    </p>
                    </CardContent>
                </Card>
              )}

              {/* Collection Fit */}
              {recommendation.collection_fit && (
                <Card className="border-white/10">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-[#E0D8C8] mb-2">{t("specializationRec.collectionFit")}</h3>
                    <p className="text-sm text-[#E0D8C8]/80 leading-relaxed whitespace-normal break-words">
                        {String(recommendation.collection_fit || '')}
                    </p>
                    </CardContent>
                </Card>
              )}

              {/* Specific Blends */}
              {recommendation.specific_blends && recommendation.specific_blends.length > 0 && (
                <Card className="border-white/10">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-[#E0D8C8] mb-2">{t("specializationRec.recommendedBlendsFromCollection")}</h3>
                    <div className="flex flex-wrap gap-2">
                    {recommendation.specific_blends.map((blend, idx) => (
                      <Badge key={idx} variant="outline" className="border-white/20 text-[#E0D8C8] break-words whitespace-normal">
                        {String(blend)}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Considerations */}
              {recommendation.considerations && (
                <Card className="border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-[#E0D8C8] mt-0.5 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-[#E0D8C8] mb-1">{t("specializationRec.importantConsiderations")}</h3>
                        <p className="text-sm text-[#E0D8C8]/80 leading-relaxed whitespace-normal break-words">
                           {String(recommendation.considerations || '')}
                        </p>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Alternative Uses */}
              {recommendation.alternative_uses && (
                <Card className="border-white/10">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-[#E0D8C8] mb-2">{t("specializationRec.alternativeUses")}</h3>
                    <p className="text-sm text-[#E0D8C8]/80 leading-relaxed whitespace-normal break-words">
                       {String(recommendation.alternative_uses || '')}
                    </p>
                    </CardContent>
                </Card>
              )}

              {/* Score Projection */}
              {recommendation.score_projection && (
                <Card className="border-white/10">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-[#E0D8C8] mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      {t("specializationRec.scoreProjection")}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/5 rounded p-3 border border-white/10">
                        <div className="text-xs text-[#E0D8C8]/60 mb-1">{t("specializationRec.currentFocus")}</div>
                        <div className="font-semibold text-[#E0D8C8]">
                          {recommendation.score_projection.current_focus_high_compat_count} {t("specializationRec.highCompatBlends")}
                        </div>
                        <div className="text-xs text-[#E0D8C8]/60">
                          {recommendation.score_projection.current_focus_moderate_compat_count} {t("specializationRec.moderate")}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded p-3 border border-white/10">
                        <div className="text-xs text-[#E0D8C8]/60 mb-1">{t("specializationRec.recommendedFocus")}</div>
                        <div className="font-semibold text-[#E0D8C8]">
                          {recommendation.score_projection.recommended_focus_high_compat_count} {t("specializationRec.highCompatBlends")}
                        </div>
                        <div className="text-xs text-[#E0D8C8]/60">
                          {recommendation.score_projection.recommended_focus_moderate_compat_count} {t("specializationRec.moderate")}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Collection Gaps */}
              {recommendation.collection_gaps?.length > 0 && (
                <Card className="border-white/10">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-[#E0D8C8] mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {t("specializationRec.collectionGaps")}
                    </h3>
                    <ul className="text-sm text-[#E0D8C8]/80 space-y-1 list-disc list-inside">
                      {recommendation.collection_gaps.map((gap, idx) => (
                        <li key={idx}>{gap}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Collection Redundancies */}
              {recommendation.collection_redundancies?.length > 0 && (
                <Card className="border-white/10">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-[#E0D8C8] mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {t("specializationRec.redundancies")}
                    </h3>
                    {recommendation.collection_redundancies.map((r, idx) => (
                      <div key={idx} className="text-sm mb-2">
                        <span className="font-medium text-[#E0D8C8]">{r.blend_type}: </span>
                        <span className="text-[#E0D8C8]/70">{r.pipes?.join(", ")}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Reassignment Opportunity */}
              {recommendation.reassignment_opportunity && (
                <Card className="border-white/10">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-[#E0D8C8] mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      {t("specializationRec.reassignmentOpportunity")}
                    </h3>
                    <p className="text-sm text-[#E0D8C8]/80">{recommendation.reassignment_opportunity}</p>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleApply}
                  className="flex-1 bg-[#A35C5C] hover:bg-[#8B4A4A]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t("specializationRec.applySpecializations")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  {t("specializationRec.close")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}