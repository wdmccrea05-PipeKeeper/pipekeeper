import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { canCreatePipe, canCreateTobacco } from "@/components/utils/limitChecks";
import { hasPaidAccess, hasProAccess, hasPremiumAccess } from "@/components/utils/premiumAccess"; // used in JSX below
import { useTranslation } from "@/components/i18n/safeTranslation";

export default function PermissionDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [pipeLimit, setPipeLimit] = useState(null);
  const [tobaccoLimit, setTobaccoLimit] = useState(null);
  const { t } = useTranslation();
  
  const { user, subscription, hasPaid, hasPremium, hasPro, isTrial, provider, isLoading } = useCurrentUser();
  const entitlements = useEntitlements();

  const runLimitChecks = async () => {
    if (!user?.email) return;
    const pipeCheck = await canCreatePipe(user.email, hasPaid, isTrial);
    const tobaccoCheck = await canCreateTobacco(user.email, hasPaid, isTrial);
    setPipeLimit(pipeCheck);
    setTobaccoLimit(tobaccoCheck);
  };

  React.useEffect(() => {
    if (isOpen && user?.email) {
      runLimitChecks();
    }
  }, [isOpen, user?.email, hasPaid, isTrial]);

  // Only show in development
  if (!import.meta.env?.DEV) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="bg-purple-600 text-white hover:bg-purple-700 border-purple-500"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        {t('debug.debugButton')}
      </Button>

      {isOpen && (
        <Card className="absolute bottom-12 right-0 w-96 max-h-[600px] overflow-y-auto shadow-2xl bg-white">
          <CardHeader className="pb-3 bg-purple-50 border-b">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-900">
              🔍 {t('debug.permissionsDebugPanel')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs pt-4">
            {/* User Info */}
            <div>
              <h4 className="font-semibold mb-2 text-slate-900">{t('debug.userInfo')}</h4>
              <div className="space-y-1 font-mono bg-slate-50 p-2 rounded text-slate-900">
                <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.email_1d1fz5")}</strong> {user?.email || 'N/A'}</p>
                <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.id_376hrg")}</strong> {user?.id || user?.auth_user_id || 'N/A'}</p>
                <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.role_3w7qy9")}</strong> {user?.role || 'user'}</p>
                <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.created_12l5ud")}</strong> {user?.created_date || user?.created_at || 'Unknown'}</p>
              </div>
            </div>

            {/* Subscription Info */}
            <div>
              <h4 className="font-semibold mb-2 text-slate-900">{t('debug.subscriptionInfo')}</h4>
              <div className="space-y-1 font-mono bg-slate-50 p-2 rounded text-slate-900">
                <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.provider_2p0h9m")}</strong> {provider || subscription?.provider || 'None'}</p>
                <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.status_41n2pv")}</strong> {subscription?.status || 'None'}</p>
                <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.tier_3xht5f")}</strong> {subscription?.tier || 'None'}</p>
                <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.period_end_ims0d5")}</strong> {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}</p>
                <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.stripe_customer_ktzfm0")}</strong> {subscription?.stripe_customer_id || user?.stripe_customer_id || 'None'}</p>
              </div>
            </div>

            {/* Hook Flags */}
            <div>
              <h4 className="font-semibold mb-2 text-slate-900">{t('debug.hookFlags')}</h4>
              <div className="space-y-2">
                <StatusBadge label="hasPaid" value={hasPaid} />
                <StatusBadge label="hasPremium" value={hasPremium} />
                <StatusBadge label="hasPro" value={hasPro} />
                <StatusBadge label="isTrial" value={isTrial} />
                <StatusBadge label="isLoading" value={isLoading} />
              </div>
            </div>

            {/* Utility Function Checks */}
            <div>
              <h4 className="font-semibold mb-2 text-slate-900">{t('debug.utilityFunctionChecks')}</h4>
              <div className="space-y-2">
                <StatusBadge label="hasPaidAccess()" value={hasPaidAccess(user, subscription)} />
                <StatusBadge label="hasProAccess()" value={hasProAccess(user, subscription)} />
                <StatusBadge label="hasPremiumAccess()" value={hasPremiumAccess(user, subscription)} />
              </div>
            </div>

            {/* Entitlements */}
            <div>
              <h4 className="font-semibold mb-2 text-slate-900">{t('debug.entitlements')}</h4>
              <div className="space-y-1 font-mono bg-slate-50 p-2 rounded text-slate-900">
                <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.tier_3xht5f")}</strong> {entitlements.tier}</p>
                <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.legacy_1m0y3t")}</strong> {entitlements.isLegacyPremium ? 'Yes' : 'No'}</p>
                <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.pipes_1k38nc")}</strong> {entitlements.limits.pipes === Infinity ? '∞' : entitlements.limits.pipes}</p>
                <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.tobacco_lhwjei")}</strong> {entitlements.limits.tobaccos === Infinity ? '∞' : entitlements.limits.tobaccos}</p>
                <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.photos_3ib8l8")}</strong> {entitlements.limits.photosPerItem === Infinity ? '∞' : entitlements.limits.photosPerItem}</p>
              </div>
            </div>

            {/* Feature Access */}
            <div>
              <h4 className="font-semibold mb-2 text-slate-900">{t('debug.featureAccess')}</h4>
              <div className="space-y-2">
                <StatusBadge label="UNLIMITED_COLLECTION" value={entitlements.canUse("UNLIMITED_COLLECTION")} />
                <StatusBadge label="AI_IDENTIFY" value={entitlements.canUse("AI_IDENTIFY")} />
                <StatusBadge label="COLLECTION_OPTIMIZATION" value={entitlements.canUse("COLLECTION_OPTIMIZATION")} />
                <StatusBadge label="EXPORT_REPORTS" value={entitlements.canUse("EXPORT_REPORTS")} />
                <StatusBadge label="AI_VALUE_LOOKUP" value={entitlements.canUse("AI_VALUE_LOOKUP")} />
                <StatusBadge label="BULK_EDIT" value={entitlements.canUse("BULK_EDIT")} />
              </div>
            </div>

            {/* Limit Checks */}
            {pipeLimit && (
              <div>
                <h4 className="font-semibold mb-2 text-slate-900">{t('debug.pipeCreationCheck')}</h4>
                <div className="space-y-1 font-mono bg-slate-50 p-2 rounded">
                  <StatusBadge label="Can Create" value={pipeLimit.canCreate} />
                  <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.current_14dczh")}</strong> {pipeLimit.currentCount}</p>
                  <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.limit_1hhz7a")}</strong> {pipeLimit.limit === null ? '∞' : pipeLimit.limit}</p>
                  {pipeLimit.reason && <p className="text-red-700 text-xs font-semibold">{pipeLimit.reason}</p>}
                </div>
              </div>
            )}

            {tobaccoLimit && (
              <div>
                <h4 className="font-semibold mb-2 text-slate-900">{t('debug.tobaccoCreationCheck')}</h4>
                <div className="space-y-1 font-mono bg-slate-50 p-2 rounded">
                  <StatusBadge label="Can Create" value={tobaccoLimit.canCreate} />
                  <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.current_14dczh")}</strong> {tobaccoLimit.currentCount}</p>
                  <p className="text-slate-900"><strong>{t("auto.components_debug_PermissionDebugPanel.limit_1hhz7a")}</strong> {tobaccoLimit.limit === null ? '∞' : tobaccoLimit.limit}</p>
                  {tobaccoLimit.reason && <p className="text-red-700 text-xs font-semibold">{tobaccoLimit.reason}</p>}
                </div>
              </div>
            )}

            <Button 
              onClick={runLimitChecks}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {t('debug.refreshLimitChecks')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ label, value }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-700">{label}:</span>
      {value ? (
        <Badge className="bg-green-100 text-green-800 border-green-300 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {t("auto.components_debug_PermissionDebugPanel.pass_yk0c70")}
        </Badge>
      ) : (
        <Badge className="bg-red-100 text-red-800 border-red-300 gap-1">
          <XCircle className="w-3 h-3" />
          {t("auto.components_debug_PermissionDebugPanel.fail_yjsmn5")}
        </Badge>
      )}
    </div>
  );
}