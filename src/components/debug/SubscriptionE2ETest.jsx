import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useEntitlements } from "@/components/hooks/useEntitlements";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Loader2, Users } from "lucide-react";
import AllUsersPermissionTest from "@/components/debug/AllUsersPermissionTest";
import { canCreatePipe, canCreateTobacco } from "@/components/utils/limitChecks";
import { 
  getEntitlementTier, 
  hasPaidAccess, 
  hasProAccess, 
  hasPremiumAccess,
  isTrialingAccess,
  getPlanLabel 
} from "@/components/utils/premiumAccess";

/**
 * End-to-End Subscription & Feature Unlocking Test
 * Tests all paid features for access and reports pass/fail
 */
export default function SubscriptionE2ETest() {
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);
  
  const { user, subscription, hasPaid, hasPro, isTrial, provider, tier, planLabel, isLoading } = useCurrentUser();
  const entitlements = useEntitlements();

  const runTests = async () => {
    setTesting(true);
    const results = [];

    // Test 1: Hook returns correct data
    results.push({
      category: 'Hook Data',
      test: 'useCurrentUser returns user object',
      status: !!user?.email ? 'pass' : 'fail',
      details: user?.email || 'No user'
    });

    results.push({
      category: 'Hook Data',
      test: 'useCurrentUser returns subscription',
      status: (hasPaid && subscription) || !hasPaid ? 'pass' : 'warning',
      details: subscription?.tier || 'No subscription (may be okay for free users)'
    });

    // Test 2: Canonical tier resolution
    const canonicalTier = getEntitlementTier(user, subscription);
    results.push({
      category: 'Canonical Resolver',
      test: 'getEntitlementTier returns correct tier',
      status: canonicalTier ? 'pass' : 'fail',
      details: `Tier: ${canonicalTier}`
    });

    results.push({
      category: 'Canonical Resolver',
      test: 'Tier matches hook tier',
      status: canonicalTier === tier ? 'pass' : 'fail',
      details: `Canonical: ${canonicalTier}, Hook: ${tier}`
    });

    // Test 3: Paid access flags
    const canonicalPaid = hasPaidAccess(user, subscription);
    results.push({
      category: 'Access Flags',
      test: 'hasPaidAccess function matches hook',
      status: canonicalPaid === hasPaid ? 'pass' : 'fail',
      details: `Function: ${canonicalPaid}, Hook: ${hasPaid}`
    });

    const canonicalPro = hasProAccess(user, subscription);
    results.push({
      category: 'Access Flags',
      test: 'hasProAccess function matches hook',
      status: canonicalPro === hasPro ? 'pass' : 'fail',
      details: `Function: ${canonicalPro}, Hook: ${hasPro}`
    });

    const canonicalTrial = isTrialingAccess(user, subscription);
    results.push({
      category: 'Access Flags',
      test: 'isTrialingAccess function matches hook',
      status: canonicalTrial === isTrial ? 'pass' : 'fail',
      details: `Function: ${canonicalTrial}, Hook: ${isTrial}`
    });

    // Test 4: Entitlements system
    results.push({
      category: 'Entitlements',
      test: 'useEntitlements returns correct tier',
      status: entitlements.tier === tier ? 'pass' : 'fail',
      details: `Entitlements: ${entitlements.tier}, Expected: ${tier}`
    });

    // Test 5: Limit checks receive correct parameters
    if (user?.email) {
      const pipeLimit = await canCreatePipe(user.email, hasPaid, isTrial);
      results.push({
        category: 'Limit Checks',
        test: 'canCreatePipe processes correctly',
        status: typeof pipeLimit.canCreate === 'boolean' ? 'pass' : 'fail',
        details: hasPaid 
          ? `Unlimited (paid): ${pipeLimit.canCreate}` 
          : `${pipeLimit.currentCount}/${pipeLimit.limit}`
      });

      const tobaccoLimit = await canCreateTobacco(user.email, hasPaid, isTrial);
      results.push({
        category: 'Limit Checks',
        test: 'canCreateTobacco processes correctly',
        status: typeof tobaccoLimit.canCreate === 'boolean' ? 'pass' : 'fail',
        details: hasPaid 
          ? `Unlimited (paid): ${tobaccoLimit.canCreate}` 
          : `${tobaccoLimit.currentCount}/${tobaccoLimit.limit}`
      });
    }

    // Test 6: Feature gates
    const premiumFeatures = [
      'UNLIMITED_COLLECTION',
      'PAIRING_BASIC',
      'MATCHING_ENGINE',
      'MESSAGING'
    ];

    const proFeatures = [
      'AI_IDENTIFY',
      'AI_VALUE_LOOKUP',
      'COLLECTION_OPTIMIZATION',
      'EXPORT_REPORTS',
      'BULK_EDIT'
    ];

    if (hasPaid) {
      // Test premium features for paid users
      premiumFeatures.forEach(feature => {
        const hasAccess = entitlements.canUse(feature);
        results.push({
          category: 'Premium Features',
          test: feature,
          status: hasAccess ? 'pass' : 'fail',
          details: hasAccess ? 'Access granted' : 'Access denied'
        });
      });

      // Test pro features
      if (hasPro) {
        proFeatures.forEach(feature => {
          const hasAccess = entitlements.canUse(feature);
          results.push({
            category: 'Pro Features',
            test: feature,
            status: hasAccess ? 'pass' : 'fail',
            details: hasAccess ? 'Access granted' : 'Access denied'
          });
        });
      }
    }

    // Test 7: Provider detection
    results.push({
      category: 'Provider Detection',
      test: 'Provider correctly identified',
      status: provider ? 'pass' : (hasPaid ? 'warning' : 'pass'),
      details: provider || 'No provider (free user)'
    });

    // Test 8: Plan label consistency
    const canonicalLabel = getPlanLabel(user, subscription);
    results.push({
      category: 'Plan Label',
      test: 'Plan label matches tier',
      status: canonicalLabel === planLabel ? 'pass' : 'fail',
      details: `Hook: ${planLabel}, Function: ${canonicalLabel}`
    });

    setTestResults(results);
    setTesting(false);
  };

  // Auto-run on mount
  useEffect(() => {
    if (!isLoading && user?.email) {
      runTests();
    }
  }, [isLoading, user?.email]);

  const passCount = testResults.filter(r => r.status === 'pass').length;
  const failCount = testResults.filter(r => r.status === 'fail').length;
  const warningCount = testResults.filter(r => r.status === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Current User Test */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
              🧪 Current User E2E Test
              {testing && <Loader2 className="w-4 h-4 animate-spin" />}
            </CardTitle>
          <div className="flex gap-2">
            <Badge className="bg-green-100 text-green-800">{passCount} Pass</Badge>
            <Badge className="bg-red-100 text-red-800">{failCount} Fail</Badge>
            {warningCount > 0 && (
              <Badge className="bg-amber-100 text-amber-800">{warningCount} Warning</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Summary */}
        <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-xs font-mono">
          <p className="text-slate-900"><strong>Email:</strong> {user?.email || 'N/A'}</p>
          <p className="text-slate-900"><strong>Tier:</strong> {tier}</p>
          <p className="text-slate-900"><strong>Plan Label:</strong> {planLabel}</p>
          <p className="text-slate-900"><strong>Provider:</strong> {provider || 'None'}</p>
          <p className="text-slate-900"><strong>Flags:</strong> hasPaid={String(hasPaid)}, hasPro={String(hasPro)}, isTrial={String(isTrial)}</p>
        </div>

        <Button 
          onClick={runTests} 
          disabled={testing || isLoading}
          className="w-full bg-purple-600 hover:bg-purple-700"
          size="sm"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-run Tests
            </>
          )}
        </Button>

        {/* Results by category */}
        {testResults.length > 0 && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {['Hook Data', 'Canonical Resolver', 'Access Flags', 'Entitlements', 'Limit Checks', 'Premium Features', 'Pro Features', 'Provider Detection', 'Plan Label'].map(category => {
              const categoryTests = testResults.filter(r => r.category === category);
              if (categoryTests.length === 0) return null;

              return (
                <div key={category} className="space-y-2">
                  <h4 className="font-semibold text-sm text-slate-700 border-b pb-1">
                    {category}
                  </h4>
                  {categoryTests.map((result, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-start gap-2 p-2 rounded text-xs ${
                        result.status === 'pass' 
                          ? 'bg-green-50 border border-green-200' 
                          : result.status === 'warning'
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      {result.status === 'pass' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      ) : result.status === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${
                          result.status === 'pass' 
                            ? 'text-green-800' 
                            : result.status === 'warning'
                            ? 'text-amber-800'
                            : 'text-red-800'
                        }`}>
                          {result.test}
                        </p>
                        <p className="text-slate-600 text-[11px] break-all">{result.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {testResults.length > 0 && (
          <div className="bg-slate-800 text-white rounded-lg p-3 text-xs">
            <p className="font-semibold mb-1">Test Summary:</p>
            <p>✅ {passCount} tests passed</p>
            {warningCount > 0 && <p>⚠️ {warningCount} warnings</p>}
            {failCount > 0 && <p>❌ {failCount} tests FAILED</p>}
            {failCount === 0 && warningCount === 0 && (
              <p className="text-green-400 mt-2 font-semibold">🎉 All tests passed!</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>

    {/* All Users Test */}
    <AllUsersPermissionTest />
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