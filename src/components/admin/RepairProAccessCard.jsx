import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Wrench, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function RepairProAccessCard() {
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(200);
  const [result, setResult] = useState(null);
  const [showUpdated, setShowUpdated] = useState(false);
  const [showUnknown, setShowUnknown] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const { t } = useTranslation();
  
  const queryClient = useQueryClient();

  const runRepair = async (dryRun) => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke("repairStripeTiers", {
        dryRun,
        limit,
      });

      setResult(response.data);
      
      if (response.data.ok) {
        toast.success(
          dryRun 
            ? t('admin.repairProDryRunDone')
            : t('admin.repairCompletedMsg', { n: response.data.updatedSubscriptions })
        );
        
        // Invalidate queries after successful repair
        if (!dryRun && response.data.updatedSubscriptions > 0) {
          await queryClient.invalidateQueries({ queryKey: ["user-report"] });
          await queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
          await queryClient.invalidateQueries({ queryKey: ["subscription"] });
        }
      } else {
        toast.error(response.data.error || t('admin.repairFailedLabel'));
      }
    } catch (err) {
      toast.error(err.message || t('admin.repairFailedLabel'));
      setResult({ ok: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-amber-600" />
          <CardTitle className="text-amber-900">{t('admin.repairProAccessTitle')}</CardTitle>
        </div>
        <CardDescription className="text-amber-800">
          {t('admin.repairProAccessDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-amber-100 border-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-amber-900 text-sm">
            {t('admin.repairProAlertText')}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="limit" className="text-amber-900">{t('admin.subscriptionLimit')}</Label>
          <Input
            id="limit"
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 200)}
            min={1}
            max={1000}
            className="w-32"
            disabled={loading}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => runRepair(true)}
            disabled={loading}
            variant="outline"
            className="border-amber-400 text-amber-900 hover:bg-amber-100"
          >
            {loading ? t('admin.running') : t('admin.dryRunBtn')}
          </Button>
          <Button
            onClick={() => runRepair(false)}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {loading ? t('admin.running') : t('admin.repairNowBtn')}
          </Button>
        </div>

        {result && result.ok && (
          <div className="space-y-3 pt-4 border-t border-amber-200">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/50 rounded p-2">
                <div className="text-amber-600 text-xs">{t('admin.scannedLabel')}</div>
                <div className="text-amber-900 font-semibold">{result.scanned}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-amber-600 text-xs">{t('admin.updatedSubscriptions')}</div>
                <div className="text-amber-900 font-semibold">{result.updatedSubscriptions}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-amber-600 text-xs">{t('admin.updatedUsers')}</div>
                <div className="text-amber-900 font-semibold">{result.updatedUsers}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-amber-600 text-xs">{t('admin.unknownTierLabel')}</div>
                <div className="text-amber-900 font-semibold">{result.unknownTier}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-amber-600 text-xs">{t('admin.missingStripeSubLabel')}</div>
                <div className="text-amber-900 font-semibold">{result.missingStripeSubscription}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-amber-600 text-xs">{t('admin.modeLabel')}</div>
                <div className="text-amber-900 font-semibold">{result.dryRun ? t('admin.dryRunMode') : t('admin.liveMode')}</div>
              </div>
            </div>

            {result.samples?.updated?.length > 0 && (
              <Collapsible open={showUpdated} onOpenChange={setShowUpdated}>
                <CollapsibleTrigger className="flex items-center justify-between w-full bg-white/70 rounded p-2 hover:bg-white/90 transition-colors">
                  <span className="text-sm font-medium text-amber-900">
                    {t('admin.updatedSamplesCount', { count: result.samples.updated.length })}
                  </span>
                  {showUpdated ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {result.samples.updated.map((sample, idx) => (
                    <div key={idx} className="bg-white/70 rounded p-2 text-xs space-y-1">
                      <div><span className="text-amber-600">{t('admin.emailSampleLabel')}</span> {sample.user_email}</div>
                      <div><span className="text-amber-600">{t('admin.stripeSubSampleLabel')}</span> {sample.stripe_sub_id}</div>
                      <div><span className="text-amber-600">{t('admin.changeLabel')}</span> {sample.old_tier || 'null'} → {sample.new_tier}</div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {result.samples?.unknown?.length > 0 && (
              <Collapsible open={showUnknown} onOpenChange={setShowUnknown}>
                <CollapsibleTrigger className="flex items-center justify-between w-full bg-white/70 rounded p-2 hover:bg-white/90 transition-colors">
                  <span className="text-sm font-medium text-amber-900">
                    {t('admin.unknownTierSamplesCount', { count: result.samples.unknown.length })}
                  </span>
                  {showUnknown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {result.samples.unknown.map((sample, idx) => (
                    <div key={idx} className="bg-white/70 rounded p-2 text-xs space-y-1">
                      <div><span className="text-amber-600">{t('admin.emailSampleLabel')}</span> {sample.user_email}</div>
                      <div><span className="text-amber-600">{t('admin.stripeSubSampleLabel')}</span> {sample.stripe_sub_id}</div>
                      <div><span className="text-amber-600">{t('admin.reasonSampleLabel')}</span> {sample.reason}</div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {result.samples?.missing?.length > 0 && (
              <Collapsible open={showMissing} onOpenChange={setShowMissing}>
                <CollapsibleTrigger className="flex items-center justify-between w-full bg-white/70 rounded p-2 hover:bg-white/90 transition-colors">
                  <span className="text-sm font-medium text-amber-900">
                    {t('admin.missingSamplesCount', { count: result.samples.missing.length })}
                  </span>
                  {showMissing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {result.samples.missing.map((sample, idx) => (
                    <div key={idx} className="bg-white/70 rounded p-2 text-xs space-y-1">
                      <div><span className="text-amber-600">{t('admin.emailSampleLabel')}</span> {sample.user_email}</div>
                      <div><span className="text-amber-600">{t('admin.reasonSampleLabel')}</span> {sample.reason}</div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {result && !result.ok && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-semibold">{t('admin.repairFailedLabel')}</div>
                <div className="text-sm break-words">{result.error || result.message}</div>
                {result.keyPrefix && (
                  <div className="text-sm">
                    <span className="font-semibold">{t('admin.keyPrefixLabel')}</span>{" "}
                    <code className="bg-black/30 px-2 py-0.5 rounded font-mono">
                      {result.keyPrefix}
                    </code>
                  </div>
                )}
                {(result.error?.includes("STRIPE_AUTH_FAILED") || result.error?.includes("Invalid API Key") || result.error?.includes("mk_") || result.keyPrefix === "mk" || result.keyPrefix === "pk") && (
                  <div className="text-sm font-semibold text-yellow-200 mt-2">
                    {t('admin.stripeKeyWarning')}
                  </div>
                )}
                {result.details && (
                  <div className="text-xs mt-2 font-mono bg-black/20 p-2 rounded break-words">
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