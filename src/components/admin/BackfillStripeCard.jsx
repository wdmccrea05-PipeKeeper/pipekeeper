import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Database, AlertCircle, CheckCircle, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function BackfillStripeCard() {
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [cursor, setCursor] = useState(null);
  const [result, setResult] = useState(null);
  const { t } = useTranslation();
  
  const queryClient = useQueryClient();

  const runBackfill = async (starting_after) => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke("backfillStripeCustomers", {
        limit,
        starting_after: starting_after || undefined,
      });

      const data = response.data;
      setResult(data);
      
      if (data.ok) {
        setCursor(data.nextStartingAfter);
        toast.success(
          t('admin.backfillSuccessMsg', { fetched: data.fetchedCustomers, processed: data.processedCustomers })
        );
        
        await queryClient.invalidateQueries({ queryKey: ["user-report"] });
        await queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
        await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      } else {
        toast.error(t('admin.backfillFailedAtStage', { stage: data.where || t('common.unknown'), error: data.error || 'UNKNOWN' }));
      }
    } catch (err) {
      toast.error(err.message || t('admin.backfillFailedLabel'));
      setResult({ 
        ok: false, 
        error: "REQUEST_FAILED", 
        message: err.message, 
        where: "client",
        keyPrefix: "unknown"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-blue-900">{t('admin.backfillStripeCustomersTitle')}</CardTitle>
        </div>
        <CardDescription className="text-blue-800">
          {t('admin.backfillStripeCustomersDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-100 border-blue-300">
          <AlertCircle className="h-4 w-4 text-blue-700" />
          <AlertDescription className="text-blue-900 text-sm">
            {t('admin.backfillStripeAlertText')}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="limit" className="text-blue-900">{t('admin.batchSizeCustomers')}</Label>
          <Input
            id="limit"
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
            min={1}
            max={100}
            className="w-32"
            disabled={loading}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => runBackfill(null)}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? t('admin.running') : t('admin.startBackfill')}
          </Button>
          
          {result?.hasMore && result?.nextStartingAfter && (
            <Button
              onClick={() => runBackfill(result.nextStartingAfter)}
              disabled={loading}
              variant="outline"
              className="border-blue-400 text-blue-900 hover:bg-blue-100"
            >
              <ChevronRight className="w-4 h-4 mr-1" />
              {t('admin.runNextBatch')}
            </Button>
          )}
        </div>

        {result && result.ok && (
          <div className="space-y-3 pt-4 border-t border-blue-200">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">{t('admin.backfillSuccessful')}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">{t('admin.fetchedCustomersLabel')}</div>
                <div className="text-blue-900 font-semibold">{result.fetchedCustomers}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">{t('admin.processedCustomersLabel')}</div>
                <div className="text-blue-900 font-semibold">{result.processedCustomers}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">{t('admin.createdSubscriptionsLabel')}</div>
                <div className="text-blue-900 font-semibold">{result.createdSubs}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">{t('admin.updatedSubscriptionsLabel')}</div>
                <div className="text-blue-900 font-semibold">{result.updatedSubs}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">{t('admin.createdUsersLabel')}</div>
                <div className="text-blue-900 font-semibold">{result.createdUsers}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">{t('admin.updatedUsersLabel')}</div>
                <div className="text-blue-900 font-semibold">{result.updatedUsers}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">{t('admin.errorsLabel')}</div>
                <div className="text-blue-900 font-semibold">{result.errorsCount || 0}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-blue-600 text-xs">{t('admin.paginationLabel')}</div>
                <div className="text-blue-900 font-semibold">
                  {result.hasMore ? t('admin.paginationMoreAvailable') : t('admin.paginationComplete')}
                </div>
              </div>
            </div>

            {result.nextStartingAfter && (
              <div className="bg-blue-100 rounded p-2 text-xs">
                <div className="text-blue-600 font-semibold">{t('admin.nextCursorLabel')}</div>
                <div className="text-blue-900 font-mono break-all">{result.nextStartingAfter}</div>
              </div>
            )}

            {result.sampleErrors && result.sampleErrors.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="text-yellow-800 font-semibold text-sm mb-2">{t('admin.sampleErrorsLabel')}</div>
                <div className="space-y-2">
                  {result.sampleErrors.map((err, idx) => (
                    <div key={idx} className="text-xs bg-white/70 rounded p-2 space-y-1">
                      <div><span className="text-yellow-600 font-semibold">{t('admin.stageLabel')}</span> {err.where}</div>
                      {err.email && <div><span className="text-yellow-600 font-semibold">{t('admin.emailLabel')}</span> {err.email}</div>}
                      <div><span className="text-yellow-600 font-semibold">{t('admin.messageLabel')}</span> {err.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {result && !result.ok && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-semibold">{t('admin.backfillFailedLabel')}</div>
                <div className="text-sm">
                  <span className="font-semibold">{t('admin.errorLabel')}</span> {result.error || "UNKNOWN"}
                </div>
                <div className="text-sm">
                  <span className="font-semibold">{t('admin.stageLabel')}</span>{" "}
                  <code className="bg-black/10 px-1.5 py-0.5 rounded font-mono">
                    {result.where || "unknown"}
                  </code>
                </div>
                {result.message && (
                  <div className="text-sm break-words">
                    <span className="font-semibold">{t('admin.messageLabel')}</span> {result.message}
                  </div>
                )}
                {result.keyPrefix && (
                  <div className="text-sm">
                    <span className="font-semibold">{t('admin.keyPrefixLabel')}</span>{" "}
                    <code className="bg-black/10 px-1.5 py-0.5 rounded font-mono">
                      {result.keyPrefix}
                    </code>
                  </div>
                )}
                {result.details && (
                  <div className="text-xs mt-2 font-mono bg-black/10 p-2 rounded break-words">
                    {result.details}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}