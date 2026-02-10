import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { canCreatePipe, canCreateTobacco } from "@/components/utils/limitChecks";
import { hasPaidAccess, hasProAccess, hasPremiumAccess } from "@/components/utils/premiumAccess";

export default function PermissionDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [pipeLimit, setPipeLimit] = useState(null);
  const [tobaccoLimit, setTobaccoLimit] = useState(null);
  
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

  // Only show in development or for admins
  if (import.meta.env?.PROD && user?.role !== 'admin') return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="bg-purple-600 text-white hover:bg-purple-700 border-purple-500"
      >
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        Debug
      </Button>

      {isOpen && (
        <Card className="absolute bottom-12 right-0 w-96 max-h-[600px] overflow-y-auto shadow-2xl bg-white">
          <CardHeader className="pb-3 bg-purple-50 border-b">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-900">
              🔍 Permissions Debug Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs pt-4">
            {/* User Info */}
            <div>
              <h4 className="font-semibold mb-2 text-slate-900">User Info</h4>
              <div className="space-y-1 font-mono bg-slate-50 p-2 rounded text-slate-900">
                <p className="text-slate-900"><strong>Email:</strong> {user?.email || 'N/A'}</p>
                <p className="text-slate-900"><strong>ID:</strong> {user?.id || user?.auth_user_id || 'N/A'}</p>
                <p className="text-slate-900"><strong>Role:</strong> {user?.role || 'user'}</p>
                <p className="text-slate-900"><strong>Created:</strong> {user?.created_date || user?.created_at || 'Unknown'}</p>
              </div>
            </div>

            {/* Subscription Info */}
            <div>
              <h4 className="font-semibold mb-2 text-slate-900">Subscription Info</h4>
              <div className="space-y-1 font-mono bg-slate-50 p-2 rounded text-slate-900">
                <p className="text-slate-900"><strong>Provider:</strong> {provider || subscription?.provider || 'None'}</p>
                <p className="text-slate-900"><strong>Status:</strong> {subscription?.status || 'None'}</p>
                <p className="text-slate-900"><strong>Tier:</strong> {subscription?.tier || 'None'}</p>
                <p className="text-slate-900"><strong>Period End:</strong> {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}</p>
                <p className="text-slate-900"><strong>Stripe Customer:</strong> {subscription?.stripe_customer_id || user?.stripe_customer_id || 'None'}</p>
              </div>
            </div>

            {/* Hook Flags */}
            <div>
              <h4 className="font-semibold mb-2 text-slate-900">useCurrentUser Flags</h4>
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
              <h4 className="font-semibold mb-2 text-slate-900">Utility Function Checks</h4>
              <div className="space-y-2">
                <StatusBadge label="hasPaidAccess()" value={hasPaidAccess(user, subscription)} />
                <StatusBadge label="hasProAccess()" value={hasProAccess(user, subscription)} />
                <StatusBadge label="hasPremiumAccess()" value={hasPremiumAccess(user, subscription)} />
              </div>
            </div>

            {/* Entitlements */}
            <div>
              <h4 className="font-semibold mb-2 text-slate-900">Entitlements</h4>
              <div className="space-y-1 font-mono bg-slate-50 p-2 rounded text-slate-900">
                <p className="text-slate-900"><strong>Tier:</strong> {entitlements.tier}</p>
                <p className="text-slate-900"><strong>Legacy:</strong> {entitlements.isPremiumLegacy ? 'Yes' : 'No'}</p>
                <p className="text-slate-900"><strong>Pipes:</strong> {entitlements.limits.pipes === Infinity ? '∞' : entitlements.limits.pipes}</p>
                <p className="text-slate-900"><strong>Tobacco:</strong> {entitlements.limits.tobaccos === Infinity ? '∞' : entitlements.limits.tobaccos}</p>
                <p className="text-slate-900"><strong>Photos:</strong> {entitlements.limits.photosPerItem === Infinity ? '∞' : entitlements.limits.photosPerItem}</p>
              </div>
            </div>

            {/* Feature Access */}
            <div>
              <h4 className="font-semibold mb-2 text-slate-900">Feature Access</h4>
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
                <h4 className="font-semibold mb-2 text-slate-900">Pipe Creation Check</h4>
                <div className="space-y-1 font-mono bg-slate-50 p-2 rounded">
                  <StatusBadge label="Can Create" value={pipeLimit.canCreate} />
                  <p className="text-slate-900"><strong>Current:</strong> {pipeLimit.currentCount}</p>
                  <p className="text-slate-900"><strong>Limit:</strong> {pipeLimit.limit === null ? '∞' : pipeLimit.limit}</p>
                  {pipeLimit.reason && <p className="text-red-700 text-xs font-semibold">{pipeLimit.reason}</p>}
                </div>
              </div>
            )}

            {tobaccoLimit && (
              <div>
                <h4 className="font-semibold mb-2 text-slate-900">Tobacco Creation Check</h4>
                <div className="space-y-1 font-mono bg-slate-50 p-2 rounded">
                  <StatusBadge label="Can Create" value={tobaccoLimit.canCreate} />
                  <p className="text-slate-900"><strong>Current:</strong> {tobaccoLimit.currentCount}</p>
                  <p className="text-slate-900"><strong>Limit:</strong> {tobaccoLimit.limit === null ? '∞' : tobaccoLimit.limit}</p>
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
              Refresh Limit Checks
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-700">{label}:</span>
      {value ? (
        <Badge className="bg-green-100 text-green-800 border-green-300 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Pass
        </Badge>
      ) : (
        <Badge className="bg-red-100 text-red-800 border-red-300 gap-1">
          <XCircle className="w-3 h-3" />
          Fail
        </Badge>
      )}
    </div>
  );
}