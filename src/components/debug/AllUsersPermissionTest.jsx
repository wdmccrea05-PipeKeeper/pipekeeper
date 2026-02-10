import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Loader2, User } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { 
  getEntitlementTier, 
  hasPaidAccess, 
  hasProAccess,
  getPlanLabel 
} from "@/components/utils/premiumAccess";

/**
 * Tests all active paid users to verify they receive correct permissions
 */
export default function AllUsersPermissionTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState({ pass: 0, fail: 0, warning: 0 });

  const runTest = async () => {
    setTesting(true);
    const testResults = [];

    try {
      // Fetch all active subscriptions
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ 
        status: "active" 
      });

      console.log(`[AllUsersPermissionTest] Testing ${subscriptions.length} active subscriptions`);

      for (const sub of subscriptions) {
        const userEmail = sub.user_email;
        const userId = sub.user_id;

        // Fetch user entity
        let user = null;
        try {
          if (userId) {
            const users = await base44.asServiceRole.entities.User.filter({ id: userId });
            user = users[0];
          }
          if (!user && userEmail) {
            const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
            user = users[0];
          }
        } catch (err) {
          console.warn(`Failed to fetch user for ${userEmail}:`, err);
        }

        // Test canonical resolver
        const tier = getEntitlementTier(user, sub);
        const hasPaid = hasPaidAccess(user, sub);
        const hasPro = hasProAccess(user, sub);
        const label = getPlanLabel(user, sub);

        // Expected values based on subscription
        const expectedTier = (sub.tier || '').toLowerCase();
        const expectedPaid = true; // All active subs should have paid access
        const expectedPro = expectedTier === 'pro';

        // Determine test status
        const tierMatch = tier === expectedTier;
        const paidMatch = hasPaid === expectedPaid;
        const proMatch = hasPro === expectedPro;

        const allPass = tierMatch && paidMatch && proMatch;

        testResults.push({
          email: userEmail,
          userId: userId || 'N/A',
          provider: sub.provider,
          subTier: sub.tier,
          subStatus: sub.status,
          // Results
          tier,
          hasPaid,
          hasPro,
          label,
          // Expected
          expectedTier,
          expectedPaid,
          expectedPro,
          // Pass/Fail
          tierMatch,
          paidMatch,
          proMatch,
          status: allPass ? 'pass' : (hasPaid ? 'warning' : 'fail'),
          issues: [
            !tierMatch && `Tier mismatch: got ${tier}, expected ${expectedTier}`,
            !paidMatch && `Paid access: got ${hasPaid}, expected ${expectedPaid}`,
            !proMatch && `Pro access: got ${hasPro}, expected ${expectedPro}`,
          ].filter(Boolean)
        });
      }

      // Calculate summary
      const pass = testResults.filter(r => r.status === 'pass').length;
      const fail = testResults.filter(r => r.status === 'fail').length;
      const warning = testResults.filter(r => r.status === 'warning').length;

      setSummary({ pass, fail, warning });
      setResults(testResults);

      console.log('[AllUsersPermissionTest] Complete:', { pass, fail, warning });

    } catch (error) {
      console.error('[AllUsersPermissionTest] Error:', error);
      testResults.push({
        email: 'ERROR',
        status: 'fail',
        issues: [`Test failed: ${error.message}`]
      });
      setResults(testResults);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
            <User className="w-5 h-5" />
            All Paid Users Test
            {testing && <Loader2 className="w-4 h-4 animate-spin" />}
          </CardTitle>
          <div className="flex gap-2">
            <Badge className="bg-green-100 text-green-800 border-green-300">{summary.pass} Pass</Badge>
            <Badge className="bg-red-100 text-red-800 border-red-300">{summary.fail} Fail</Badge>
            {summary.warning > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">{summary.warning} Warning</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-700">
            Tests all active subscriptions to verify canonical resolver grants correct access
          </p>
          <Button 
            onClick={runTest} 
            disabled={testing}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {results.map((result, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg border-2 ${
                  result.status === 'pass' 
                    ? 'bg-green-50 border-green-200' 
                    : result.status === 'warning'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {result.status === 'pass' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      ) : result.status === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <p className="font-semibold text-slate-900 text-sm truncate">{result.email}</p>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">{result.provider}</Badge>
                      <Badge className={`text-xs ${
                        result.subTier === 'pro' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {result.subTier}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{result.label}</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono bg-white/50 p-2 rounded">
                  <div className={result.tierMatch ? 'text-green-700' : 'text-red-700'}>
                    Tier: {result.tier} {result.tierMatch ? '✓' : '✗'}
                  </div>
                  <div className={result.paidMatch ? 'text-green-700' : 'text-red-700'}>
                    Paid: {String(result.hasPaid)} {result.paidMatch ? '✓' : '✗'}
                  </div>
                  <div className={result.proMatch ? 'text-green-700' : 'text-red-700'}>
                    Pro: {String(result.hasPro)} {result.proMatch ? '✓' : '✗'}
                  </div>
                </div>

                {result.issues?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {result.issues.map((issue, i) => (
                      <p key={i} className="text-xs text-red-700 font-semibold">
                        ⚠️ {issue}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-slate-800 text-white rounded-lg p-4 text-xs">
            <p className="font-semibold mb-2">Overall Results:</p>
            <p>✅ {summary.pass} users with correct permissions</p>
            {summary.warning > 0 && <p>⚠️ {summary.warning} warnings (minor issues)</p>}
            {summary.fail > 0 && <p>❌ {summary.fail} users FAILED (critical issue)</p>}
            {summary.fail === 0 && summary.warning === 0 && (
              <p className="text-green-400 mt-2 font-semibold">🎉 All paid users have correct access!</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}