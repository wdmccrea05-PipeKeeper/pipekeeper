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

export default function TobaccoValueEstimator({ blends, user, onComplete }) {
  const { subscription, isPro } = useCurrentUser();
  const [selectedBlends, setSelectedBlends] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const hasProAccess = isPro || isLegacyPremium(subscription);

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
      toast.error("Please select at least one blend");
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
      toast.success(`Estimated ${data.processed} blend(s)`);
      
      if (onComplete) onComplete();
      
    } catch (error) {
      console.error("Estimation error:", error);
      toast.error("Failed to estimate values");
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
          AI Tobacco Valuation
          {showLocked && (
            <Badge className="bg-amber-600/20 text-amber-400 border-amber-500/30 ml-auto">
              Pro
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showLocked ? (
          <p className="text-sm text-[#e8d5b7]/70">
            Upgrade to Pro to unlock AI-assisted tobacco valuation with market estimates, value ranges, confidence levels, and predictive projections.
          </p>
        ) : (
          <>
            <p className="text-sm text-[#e8d5b7]/80">
              Automatically estimate market values for your tobacco blends using AI analysis of public marketplace listings.
            </p>

            {blendsNeedingValuation.length === 0 ? (
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-[#e8d5b7]/70">
                  All blends have been valued
                </p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  <Button size="sm" variant="outline" onClick={selectAll}>
                    Select All ({blendsNeedingValuation.length})
                  </Button>
                  <Button size="sm" variant="outline" onClick={deselectAll}>
                    Deselect All
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
                          {blend.manufacturer || 'Unknown'} • {blend.blend_type || 'Unknown'}
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
                      Estimating {selectedBlends.length} blend(s)...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Estimate Values ({selectedBlends.length} selected)
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
                        Processed: {results.processed} | Failed: {results.failed}
                      </p>
                    </div>

                    {results.results?.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {results.results.map((r, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm bg-[#243548]/50 rounded p-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[#e8d5b7] truncate">{r.blend_name}</p>
                              <p className="text-xs text-[#e8d5b7]/50">
                                Confidence: {r.confidence}
                              </p>
                            </div>
                            <p className="text-emerald-400 font-semibold ml-2">
                              ${r.estimated_value?.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {results.errors?.length > 0 && (
                      <div className="space-y-1 text-xs text-rose-400">
                        <p className="font-semibold">Errors:</p>
                        {results.errors.map((e, idx) => (
                          <p key={idx}>• {e.blend_id}: {e.error}</p>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-rose-400">
                    <XCircle className="w-5 h-5" />
                    <p className="text-sm">{results.error || "Processing failed"}</p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#e8d5b7]/70">
                  AI estimates are based on public marketplace data. Actual values vary by condition, age, and market demand. Not investment advice.
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}