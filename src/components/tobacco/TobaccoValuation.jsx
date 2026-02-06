import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lock, TrendingUp, DollarSign, Info, Sparkles, Loader2 } from "lucide-react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { isLegacyPremium } from "@/components/utils/premiumAccess";
import ProUpgradeModal from "@/components/subscription/ProUpgradeModal";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/components/utils/localeFormatters";

export default function TobaccoValuation({ blend, onUpdate, isUpdating }) {
  const { t } = useTranslation();
  const { user, subscription, isPro, hasPremium } = useCurrentUser();
  const [showProModal, setShowProModal] = useState(false);
  const [estimating, setEstimating] = useState(false);

  // Legacy Premium (before Feb 1, 2026) gets Pro features
  const hasProAccess = isPro || isLegacyPremium(subscription);

  const handleManualValueChange = (field, value) => {
    if (!hasPremium) {
      setShowProModal(true);
      return;
    }
    onUpdate({ [field]: value });
  };

  const handleAIEstimate = async () => {
    if (!hasProAccess) {
      setShowProModal(true);
      return;
    }
    
    setEstimating(true);
    try {
      const response = await base44.functions.invoke('estimateTobaccoValues', {
        blend_ids: [blend.id]
      });

      const data = response.data;
      
      if (data.success && data.results?.length > 0) {
        toast.success("AI valuation complete");
        // Backend already updated the entity, force refresh
        onUpdate({ ai_last_updated: new Date().toISOString() });
      } else {
        throw new Error(data.error || "Estimation failed");
      }
    } catch (err) {
      console.error("AI estimation failed:", err);
      toast.error("Failed to estimate value. Please try again.");
    } finally {
      setEstimating(false);
    }
  };

  return (
    <>
      <Card className="bg-[#5a6a7a]/90 border-[#A35C5C]/30">
        <CardHeader>
          <CardTitle className="text-[#e8d5b7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              {t("tobaccoValuation.tobaccoValuation")}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Manual Market Value - Premium */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[#e8d5b7] font-medium flex items-center gap-2">
                {t("tobaccoValuation.manualMarketValue")}
                {!hasPremium && <Lock className="w-3 h-3 text-blue-600" />}
              </Label>
              {!hasPremium && (
                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300 font-semibold">
                  {t("subscription.premium")}
                </Badge>
              )}
            </div>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                value={blend?.manual_market_value || ""}
                onChange={(e) => handleManualValueChange("manual_market_value", parseFloat(e.target.value) || null)}
                placeholder={hasPremium ? t("tobaccoValuation.enterValue") : t("tobaccoValuation.upgradeToPremium")}
                disabled={!hasPremium || isUpdating}
                className="bg-[#243548] border-[#e8d5b7]/20 text-[#e8d5b7]"
              />
              {!hasPremium && (
                <div 
                  className="absolute inset-0 cursor-pointer" 
                  onClick={() => setShowProModal(true)}
                />
              )}
            </div>
            <p className="text-xs text-[#e8d5b7]/50">
              {t("tobaccoValuation.yourAssessment")}
            </p>
          </div>

          {/* Cost Basis - Premium */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[#e8d5b7] font-medium flex items-center gap-2">
                {t("tobaccoValuation.costBasis")}
                {!hasPremium && <Lock className="w-3 h-3 text-blue-600" />}
              </Label>
              {!hasPremium && (
                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300 font-semibold">
                  {t("subscription.premium")}
                </Badge>
              )}
            </div>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                value={blend?.cost_basis || ""}
                onChange={(e) => handleManualValueChange("cost_basis", parseFloat(e.target.value) || null)}
                placeholder={hasPremium ? t("tobaccoValuation.enterCost") : t("tobaccoValuation.upgradeToPremium")}
                disabled={!hasPremium || isUpdating}
                className="bg-[#243548] border-[#e8d5b7]/20 text-[#e8d5b7]"
              />
              {!hasPremium && (
                <div 
                  className="absolute inset-0 cursor-pointer" 
                  onClick={() => setShowProModal(true)}
                />
              )}
            </div>
            <p className="text-xs text-[#e8d5b7]/50">
              {t("tobaccoValuation.whatYouPaid")}
            </p>
          </div>

          {/* AI Assisted Valuation - Pro */}
          <div className="border-t border-[#e8d5b7]/10 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <Label className="text-[#e8d5b7] font-medium flex items-center gap-2">
                  {t("tobaccoValuation.aiAssistedValuation", {defaultValue: "AI Assisted Valuation"})}
                  {!hasProAccess && <Lock className="w-3 h-3 text-amber-400" />}
                </Label>
              </div>
              {!hasProAccess && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold">
                  {t("subscription.pro")}
                </Badge>
              )}
            </div>

            <Button
              onClick={handleAIEstimate}
              disabled={!hasProAccess || estimating || isUpdating}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-50"
            >
              {!hasProAccess && <Lock className="w-4 h-4 mr-2" />}
              {estimating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {estimating ? t("tobaccoValuation.estimating") : hasProAccess ? t("tobaccoValuation.runAIValuation") : t("tobaccoValuation.upgradeToPro")}
            </Button>

            {blend?.ai_estimated_value && (
              <div className="space-y-4 bg-[#243548]/50 rounded-lg p-4">
                {/* Estimated Value */}
                <div>
                  <p className="text-xs text-[#e8d5b7]/50 mb-1">{t("tobaccoValuation.estimatedValuePerOz")}</p>
                  <p className="text-2xl font-bold text-[#e8d5b7]">
                    {formatCurrency(blend.ai_estimated_value)}
                  </p>
                  <p className="text-xs text-[#e8d5b7]/40 mt-1">
                    {t("tobaccoValuation.aiAssistedEstimate")}
                  </p>
                </div>

                {/* Value Range */}
                {blend.ai_value_range_low && blend.ai_value_range_high && hasProAccess && (
                  <div>
                    <p className="text-xs text-[#e8d5b7]/50 mb-1">{t("tobaccoValuation.estimatedRange")}</p>
                    <p className="text-lg text-[#e8d5b7]">
                      {formatCurrency(blend.ai_value_range_low)} - {formatCurrency(blend.ai_value_range_high)}
                    </p>
                  </div>
                )}

                {/* Confidence */}
                {blend.ai_confidence && hasProAccess && (
                  <div>
                    <p className="text-xs text-[#e8d5b7]/50 mb-1">{t("tobaccoValuation.confidence")}</p>
                    <Badge
                      className={
                        blend.ai_confidence === "High"
                          ? "bg-emerald-600/20 text-emerald-400"
                          : blend.ai_confidence === "Medium"
                          ? "bg-yellow-600/20 text-yellow-400"
                          : "bg-rose-600/20 text-rose-400"
                      }
                    >
                      {blend.ai_confidence}
                    </Badge>
                  </div>
                )}

                {/* Evidence Sources */}
                {blend.ai_evidence_sources?.length > 0 && hasProAccess && (
                  <div>
                    <p className="text-xs text-[#e8d5b7]/50 mb-2">{t("tobaccoValuation.evidenceSources", {defaultValue: "Evidence sources"})}</p>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                      {blend.ai_evidence_sources.map((source, idx) => {
                        // Extract domain from URL if it's a URL, otherwise use source as-is
                        const displayText = source.includes("http") 
                          ? source.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/)?.[1] || source 
                          : source;
                        return (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className="text-xs border-[#e8d5b7]/30 text-[#e8d5b7] bg-[#243548]/30 cursor-help whitespace-nowrap"
                            title={source}
                          >
                            {displayText}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Predictive Projections */}
                {(blend.ai_projection_12m || blend.ai_projection_36m) && hasProAccess && (
                  <div className="border-t border-[#e8d5b7]/10 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      <p className="text-sm font-semibold text-[#e8d5b7]">{t("tobaccoValuation.predictiveValueProjections")}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {blend.ai_projection_12m && (
                        <div className="bg-[#243548]/70 rounded-lg p-3">
                          <p className="text-xs text-[#e8d5b7]/50 mb-1">12 {t("tobaccoValuation.months")}</p>
                          <p className="text-lg font-bold text-emerald-400">
                            {formatCurrency(blend.ai_projection_12m)}
                          </p>
                          <p className="text-xs text-[#e8d5b7]/30 mt-1">
                            {t("tobaccoValuation.notGuaranteed")}
                          </p>
                        </div>
                      )}
                      {blend.ai_projection_36m && (
                        <div className="bg-[#243548]/70 rounded-lg p-3">
                          <p className="text-xs text-[#e8d5b7]/50 mb-1">36 {t("tobaccoValuation.months")}</p>
                          <p className="text-lg font-bold text-emerald-400">
                            {formatCurrency(blend.ai_projection_36m)}
                          </p>
                          <p className="text-xs text-[#e8d5b7]/30 mt-1">
                            {t("tobaccoValuation.notGuaranteed")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Last Updated */}
                {blend.ai_last_updated && hasProAccess && (
                  <p className="text-xs text-[#e8d5b7]/40 pt-2 border-t border-[#e8d5b7]/10">
                    {t("tobaccoValuation.lastUpdated")} {new Date(blend.ai_last_updated).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {!hasProAccess && !blend?.ai_estimated_value && (
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 text-center">
                <Lock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-sm text-[#e8d5b7]/70">
                  Upgrade to Pro to unlock AI-assisted valuation and predictive insights.
                </p>
              </div>
            )}
            
            {!hasProAccess && blend?.ai_estimated_value && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#e8d5b7]/70">
                    This blend was valued when you had Pro access. Upgrade to Pro to run new valuations.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ProUpgradeModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        featureName="AI-assisted valuation"
      />
    </>
  );
}