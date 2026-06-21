import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { DollarSign, Loader2, CheckCircle2, XCircle, Info } from "lucide-react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { isLegacyPremium } from "@/components/utils/premiumAccess";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { useCurrency } from "@/lib/currency/useCurrency";
import { hasModuleProAccess } from "@/components/utils/moduleEntitlements";

export default function TobaccoValueEstimator({ blends, onComplete }) {
  const { user: currentUser, subscription } = useCurrentUser();
  const { t } = useTranslation();
  const { formatFromBase } = useCurrency();
  const [selectedBlends, setSelectedBlends] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const hasProAccess = hasModuleProAccess(currentUser, 'pipekeeper') || isLegacyPremium(subscription);

  // Filter blends that need valuation
  const blendsNeedingValuation = blends.filter(b => !b.ai_estimated_value);

  const toggleBlend = (blendId) => {
    setSelectedBlends(prev => 
      prev.includes(blendId) 
        ? prev.filter(id => id !== blendId)
        : [...prev, blendId]
    );
  };

  const selectAll = () => {
    setSelectedBlends(blendsNeedingValuation.map(b => b.id));
  };

  const deselectAll = () => {
    setSelectedBlends([]);
  };

  const handleEstimate = async () => {
    if (selectedBlends.length === 0) {
      toast.error(t("tobaccoEstimator.pleaseSelectBlend"));
      return;
    }

    setProcessing(true);
    setResults(null);

    try {
      const response = await base44.functions.invoke('estimateTobaccoValues', {
        blend_ids: selectedBlends
      });

      const data = response.data;

      setResults(data);
      toast.success(t("tobaccoEstimator.estimated", { count: data.processed }));
      
      if (onComplete) onComplete();
      
    } catch (error) {
      console.error("Estimation error:", error);
      toast.error(t("tobaccoEstimator.failedToEstimate"));
      setResults({
        success: false,
        error: error.message || "Unknown error"
      });
    } finally {
      setProcessing(false);
    }
  };

  const showLocked = !hasProAccess;

  return (
    <Card className="border-[#8b3a3a]/40 bg-[#243548]/95">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#e8d5b7]">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          {t("tobaccoEstimator.cardTitle")}
          {showLocked && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold ml-auto">
              {t("auto.components_ai_TobaccoValueEstimator.pro_376ouu")}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showLocked ? (
          <p className="text-sm text-[#e8d5b7]/70">
            {t("tobaccoEstimator.upgradeMessage")}
          </p>
        ) : (
          <>
            <p className="text-sm text-[#e8d5b7]/80">
              {t("tobaccoEstimator.autoEstimateDesc")}
            </p>

            {blendsNeedingValuation.length === 0 ? (
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-[#e8d5b7]/70">
                  {t("tobaccoEstimator.allBlendsValued")}
                </p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  <Button size="sm" variant="outline" onClick={selectAll}>
                    {t("tobaccoEstimator.selectAll", { count: blendsNeedingValuation.length })}
                  </Button>
                  <Button size="sm" variant="outline" onClick={deselectAll}>
                    {t("tobaccoEstimator.deselectAll")}
                  </Button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 border border-[#e8d5b7]/10 rounded-lg p-3 bg-[#1a2c42]/30">
                  {blendsNeedingValuation.map(blend => (
                    <div
                      key={blend.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors"
                    >
                      <Checkbox
                        checked={selectedBlends.includes(blend.id)}
                        onCheckedChange={() => toggleBlend(blend.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#e8d5b7] truncate">{blend.name}</p>
                        <p className="text-xs text-[#e8d5b7]/50 truncate">
                          {blend.manufacturer || t("tobaccoEstimator.unknownManufacturer")} • {blend.blend_type || t("tobaccoEstimator.unknownBlendType")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleEstimate}
                  disabled={selectedBlends.length === 0 || processing}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("tobaccoEstimator.estimating")}
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      {t("tobaccoEstimator.runAiValuation")}
                    </>
                  )}
                </Button>
              </>
            )}

            {results && (
              <div className="border border-[#e8d5b7]/20 rounded-lg p-4 bg-[#1a2c42]/50 space-y-3">
                {results.success ? (
                  <>
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <p className="font-semibold">
                        {t("tobaccoEstimator.processedFailed", { processed: results.processed, failed: results.failed })}
                      </p>
                    </div>

                    {results.results?.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {results.results.map((r, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm bg-[#243548]/50 rounded p-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[#e8d5b7] truncate">{r.blend_name}</p>
                              <p className="text-xs text-[#e8d5b7]/50">
                                {t("tobaccoEstimator.confidence", { confidence: r.confidence })}
                              </p>
                            </div>
                            <p className="text-emerald-400 font-semibold ml-2">
                              {formatFromBase(r.estimated_value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {results.errors?.length > 0 && (
                      <div className="space-y-1 text-xs text-rose-400">
                        <p className="font-semibold">{t("tobaccoEstimator.errors")}</p>
                        {results.errors.map((e, idx) => (
                          <p key={idx}>• {e.blend_id}: {e.error}</p>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-rose-400">
                    <XCircle className="w-5 h-5" />
                    <p className="text-sm">{results.error || t("tobaccoEstimator.processingFailed")}</p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#e8d5b7]/70">
                  {t("tobaccoEstimator.aiDisclaimer")}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
