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
import { Sparkles, Target, CheckCircle2, AlertCircle, Lightbulb, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import { useTranslation } from "react-i18next";

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
      const { data } = await base44.functions.invoke('getSpecializationRecommendation', {
        pipeId: pipe.id
      });

      if (data.success) {
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
        className="border-purple-300 text-purple-700 hover:bg-purple-50 w-full sm:w-auto"
      >
        <Sparkles className="w-4 h-4 mr-1" />
        <span className="truncate">{isLoading ? t("specializationRec.analyzing") : t("pipeDetailTabs.getAIRecommendation")}</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              {t("specializationRec.specializationRecommendation")}
            </DialogTitle>
            <DialogDescription>
              {t("specializationRec.aiAnalysisFor")} {pipe.name}
            </DialogDescription>
          </DialogHeader>

          {recommendation && (
            <div className="space-y-4 mt-4">
              {/* Recommended Specializations */}
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-purple-900">{t("specializationRec.recommendedSpecializations")}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {recommendation.recommended_specializations?.map((spec, idx) => (
                          <Badge key={idx} className="bg-purple-100 text-purple-800 border-purple-300">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reasoning */}
              {recommendation.reasoning && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      {t("specializationRec.whyThisWorks")}
                    </h3>
                    <p className="text-sm text-stone-300 leading-relaxed">
                      {recommendation.reasoning}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Collection Fit */}
              {recommendation.collection_fit && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-stone-300 mb-2">{t("specializationRec.collectionFit")}</h3>
                    <p className="text-sm text-stone-400 leading-relaxed">
                      {recommendation.collection_fit}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Specific Blends */}
              {recommendation.specific_blends && recommendation.specific_blends.length > 0 && (
                <Card className="border-emerald-200 bg-emerald-50/30">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-emerald-900 mb-2">{t("specializationRec.recommendedBlendsFromCollection")}</h3>
                    <div className="flex flex-wrap gap-2">
                      {recommendation.specific_blends.map((blend, idx) => (
                        <Badge key={idx} variant="outline" className="border-emerald-300 text-emerald-800">
                          {blend}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Considerations */}
              {recommendation.considerations && (
                <Card className="border-amber-700 bg-amber-950/40">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-amber-400 mb-1">{t("specializationRec.importantConsiderations")}</h3>
                        <p className="text-sm text-amber-300 leading-relaxed">
                          {recommendation.considerations}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Alternative Uses */}
              {recommendation.alternative_uses && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-stone-300 mb-2">{t("specializationRec.alternativeUses")}</h3>
                    <p className="text-sm text-stone-400 leading-relaxed">
                      {recommendation.alternative_uses}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleApply}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
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