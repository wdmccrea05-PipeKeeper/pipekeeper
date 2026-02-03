import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { analyzeCellarDrift, calculateCorrectCellaredValues } from "@/components/utils/cellarReconciliation";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { toast } from "sonner";

export default function CellarDriftAlert({ blends, user }) {
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
        
        const correctValues = calculateCorrectCellaredValues(blend, cellarLogs);
        
        await safeUpdate("TobaccoBlend", blend.id, correctValues, user?.email);
        fixed++;
      }
      
      await queryClient.invalidateQueries({ queryKey: ["blends"] });
      toast.success(`Reconciled ${fixed} blend(s)`);
      setShowReport(false);
    } catch (err) {
      console.error("Reconciliation failed:", err);
      toast.error("Failed to reconcile inventory");
    } finally {
      setReconciling(false);
    }
  };

  return (
    <>
      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900">Cellar Inventory Drift Detected</h3>
          <p className="text-sm text-amber-800 mt-1">
            {driftedBlends.length} blend(s) have cellared amounts that don't match your transaction logs ({totalDrift.toFixed(2)} oz total difference).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowReport(true)}
            className="border-amber-300 text-amber-900 hover:bg-amber-100"
          >
            View Details
          </Button>
        </div>
      </div>

      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cellar Inventory Reconciliation</DialogTitle>
            <DialogDescription>
              Source of truth: CellarLog transactions. The following blends need correction:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {driftedBlends.map((drifted) => (
              <div key={drifted.blend_id} className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <h4 className="font-semibold text-stone-900">{drifted.blend_name}</h4>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Current (entity):</span>
                    <span className="font-mono">{drifted.entityValue.toFixed(2)} oz</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Correct (logs):</span>
                    <span className="font-mono text-emerald-700 font-semibold">{drifted.logValue.toFixed(2)} oz</span>
                  </div>
                  <div className="flex justify-between border-t border-stone-200 pt-1 mt-1">
                    <span className="text-stone-600">Difference:</span>
                    <span className={`font-mono font-semibold ${drifted.drift > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      {drifted.drift > 0 ? '+' : ''}{drifted.drift.toFixed(2)} oz
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowReport(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReconcile}
              disabled={reconciling}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {reconciling ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Reconciling...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reconcile All ({driftedBlends.length})
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}