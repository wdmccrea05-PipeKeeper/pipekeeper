import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { analyzeCellarDrift, calculateCorrectCellaredValues } from "@/components/utils/cellarReconciliation";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { formatNumber } from "@/components/utils/localeFormatters";

export default function CellarDriftAlert({ blends, user }) {
  const { t } = useTranslation();
  const [showReport, setShowReport] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const queryClient = useQueryClient();

  const { data: cellarLogs = [] } = useQuery({
    queryKey: ["cellar-logs", user?.email],
    queryFn: () => base44.entities.CellarLog.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  const driftedBlends = analyzeCellarDrift(blends, cellarLogs);
  
  if (driftedBlends.length === 0) return null;

  const totalDrift = driftedBlends.reduce((sum, d) => sum + Math.abs(d.drift), 0);

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      let fixed = 0;
      
      for (const drifted of driftedBlends) {
        const blend = blends.find(b => b.id === drifted.blend_id);
        if (!blend) continue;
        
        // SAFE: Only update computed cellared fields, never notes/metadata
        const correctValues = calculateCorrectCellaredValues(blend, cellarLogs);
        
        await safeUpdate("TobaccoBlend", blend.id, correctValues, user?.email);
        fixed++;
      }
      
      await queryClient.invalidateQueries({ queryKey: ["blends"] });
      toast.success(t("cellarDrift.reconcileSuccess", { count: fixed }));
      setShowReport(false);
    } catch (err) {
      console.error("Reconciliation failed:", err);
      toast.error(t("cellarDrift.reconcileFailed"));
    } finally {
      setReconciling(false);
    }
  };

  return (
    <>
      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900">{t("cellarDrift.title")}</h3>
          <p className="text-sm text-amber-800 mt-1">
            {`${driftedBlends.length} ${t("cellarDrift.blendsHave")} (${formatNumber(totalDrift, 2)} oz ${t("cellarDrift.totalDiff")}).`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowReport(true)}
            className="border-amber-300 text-amber-900 hover:bg-amber-100"
          >
            {t("cellarDrift.viewDetails")}
          </Button>
        </div>
      </div>

      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("cellarDrift.reconciliationTitle")}</DialogTitle>
            <DialogDescription>
              {t("cellarDrift.sourceOfTruth", { count: driftedBlends.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-900">
              <strong>{t("cellarDrift.whatWillBeUpdatedBold")}</strong> {t("cellarDrift.whatWillBeUpdatedDesc")}
            </p>
          </div>

          <div className="space-y-3">
            {driftedBlends.map((drifted) => (
              <div key={drifted.blend_id} className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <h4 className="font-semibold text-stone-900">{drifted.blend_name}</h4>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-600">{t("cellarDrift.currentComputed")}</span>
                    <span className="font-mono">{formatNumber(drifted.entityValue, 2)} oz</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">{t("cellarDrift.willChangeTo")}</span>
                    <span className="font-mono text-emerald-700 font-semibold">{formatNumber(drifted.logValue, 2)} oz</span>
                  </div>
                  <div className="flex justify-between border-t border-stone-200 pt-1 mt-1">
                    <span className="text-stone-600">{t("cellarDrift.difference")}</span>
                    <span className={`font-mono font-semibold ${drifted.drift > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      {drifted.drift > 0 ? '+' : ''}{formatNumber(drifted.drift, 2)} oz
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowReport(false)}>
              {t("forms.cancel")}
            </Button>
            <Button
              onClick={handleReconcile}
              disabled={reconciling}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {reconciling ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t("cellarDrift.reconciling")}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t("cellarDrift.reconcileAll")} ({driftedBlends.length})
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}