import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { SUPABASE_CONFIG, pingAuthSettings, pingRest } from "@/components/utils/supabaseClient";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { PK_THEME } from "@/components/utils/pkTheme";

export default function DebugPage() {
  const [healthCheck, setHealthCheck] = useState(null);
  const [copied, setCopied] = useState(false);
  const { user, isLoading, entitlementTier } = useCurrentUser();
  
  const runHealthCheck = async () => {
    setHealthCheck({ loading: true });
    
    const authResult = await pingAuthSettings();
    const restResult = await pingRest();
    
    setHealthCheck({
      loading: false,
      auth: authResult,
      rest: restResult,
      timestamp: new Date().toISOString()
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const debugData = {
    supabase: {
      source: SUPABASE_CONFIG.source,
      host: SUPABASE_CONFIG.host,
      ref: SUPABASE_CONFIG.ref,
      keyPrefix: SUPABASE_CONFIG.keyPrefix,
      keyLength: SUPABASE_CONFIG.keyLength,
      validated: SUPABASE_CONFIG.validated
    },
    user: user ? {
      email: user.email,
      role: user.role,
      entitlementTier,
      hasUser: true
    } : { hasUser: false },
    env: {
      hasViteUrl: !!import.meta.env.VITE_SUPABASE_URL,
      hasViteKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      hasBase44Data: typeof window !== "undefined" && !!window.__BASE44_DATA__,
    },
    healthCheck
  };

  return (
    <div className={`min-h-screen ${PK_THEME.pageBg} p-4 sm:p-6`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className={PK_THEME.card}>
          <CardHeader>
            <CardTitle className={PK_THEME.title}>🔧 PipeKeeper Debug Console</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Supabase Config */}
            <div>
              <h3 className={`${PK_THEME.heading} mb-3 flex items-center gap-2`}>
                {SUPABASE_CONFIG.validated ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                Supabase Configuration
              </h3>
              <div className="bg-[#0B1320] rounded-lg p-4 font-mono text-xs space-y-2">
                <div><span className="text-gray-400">Source:</span> <span className="text-emerald-400">{SUPABASE_CONFIG.source}</span></div>
                <div><span className="text-gray-400">Host:</span> <span className="text-blue-400">{SUPABASE_CONFIG.host}</span></div>
                <div><span className="text-gray-400">Project Ref:</span> <span className="text-purple-400">{SUPABASE_CONFIG.ref}</span></div>
                <div><span className="text-gray-400">Key Prefix:</span> <span className="text-amber-400">{SUPABASE_CONFIG.keyPrefix}...</span></div>
                <div><span className="text-gray-400">Key Length:</span> <span className="text-pink-400">{SUPABASE_CONFIG.keyLength} chars</span></div>
                <div><span className="text-gray-400">Validated:</span> <span className={SUPABASE_CONFIG.validated ? "text-green-400" : "text-red-400"}>{SUPABASE_CONFIG.validated ? "✓" : "✗"}</span></div>
              </div>
            </div>

            {/* User Info */}
            <div>
              <h3 className={`${PK_THEME.heading} mb-3`}>User & Entitlement</h3>
              <div className="bg-[#0B1320] rounded-lg p-4 font-mono text-xs space-y-2">
                {isLoading ? (
                  <div className="text-gray-400">Loading...</div>
                ) : user ? (
                  <>
                    <div><span className="text-gray-400">Email:</span> <span className="text-blue-400">{user.email}</span></div>
                    <div><span className="text-gray-400">Role:</span> <span className="text-purple-400">{user.role || "user"}</span></div>
                    <div><span className="text-gray-400">Entitlement:</span> <span className="text-emerald-400">{entitlementTier}</span></div>
                  </>
                ) : (
                  <div className="text-red-400">Not authenticated</div>
                )}
              </div>
            </div>

            {/* Environment */}
            <div>
              <h3 className={`${PK_THEME.heading} mb-3`}>Environment Detection</h3>
              <div className="bg-[#0B1320] rounded-lg p-4 font-mono text-xs space-y-2">
                <div><span className="text-gray-400">VITE_SUPABASE_URL:</span> <span className={import.meta.env.VITE_SUPABASE_URL ? "text-green-400" : "text-red-400"}>{import.meta.env.VITE_SUPABASE_URL ? "✓ Present" : "✗ Missing"}</span></div>
                <div><span className="text-gray-400">VITE_SUPABASE_ANON_KEY:</span> <span className={import.meta.env.VITE_SUPABASE_ANON_KEY ? "text-green-400" : "text-red-400"}>{import.meta.env.VITE_SUPABASE_ANON_KEY ? "✓ Present" : "✗ Missing"}</span></div>
                <div><span className="text-gray-400">Base44 Injection:</span> <span className={typeof window !== "undefined" && window.__BASE44_DATA__ ? "text-green-400" : "text-gray-400"}>{typeof window !== "undefined" && window.__BASE44_DATA__ ? "✓ Available" : "Not detected"}</span></div>
              </div>
            </div>

            {/* Health Check */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={PK_THEME.heading}>Supabase Health Check</h3>
                <Button onClick={runHealthCheck} disabled={healthCheck?.loading} size="sm">
                  {healthCheck?.loading ? "Running..." : "Run Test"}
                </Button>
              </div>
              
              {healthCheck && !healthCheck.loading && (
                <div className="bg-[#0B1320] rounded-lg p-4 font-mono text-xs space-y-3">
                  <div>
                    <div className="text-gray-400 mb-1">Auth Settings Endpoint:</div>
                    <div className="pl-4">
                      <div>Status: <span className={healthCheck.auth.status === 200 ? "text-green-400" : "text-red-400"}>{healthCheck.auth.status}</span></div>
                      <div className="text-gray-500 mt-1 break-all">{healthCheck.auth.body}</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 mb-1">REST API Endpoint:</div>
                    <div className="pl-4">
                      <div>Status: <span className={healthCheck.rest.status === 200 ? "text-green-400" : "text-red-400"}>{healthCheck.rest.status}</span></div>
                      <div className="text-gray-500 mt-1 break-all">{healthCheck.rest.body}</div>
                    </div>
                  </div>
                  
                  <div className="text-gray-400 text-xs">
                    Tested at: {new Date(healthCheck.timestamp).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* Copy Debug JSON */}
            <div className="flex gap-2">
              <Button 
                onClick={() => copyToClipboard(JSON.stringify(debugData, null, 2))}
                variant="outline"
                className="flex-1"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied!" : "Copy Full Debug Info"}
              </Button>
            </div>

          </CardContent>
        </Card>

        {/* Admin Override Instructions */}
        <Card className={PK_THEME.card}>
          <CardHeader>
            <CardTitle className={PK_THEME.heading}>Admin Override (Emergency)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`${PK_THEME.textBody} mb-3`}>
              To manually override Supabase config (use only for debugging), open browser console and run:
            </p>
            <pre className="bg-[#0B1320] text-amber-400 p-3 rounded text-xs overflow-x-auto">
{`localStorage.setItem('pk_supabase_url', 'https://your-project.supabase.co');
localStorage.setItem('pk_supabase_anon_key', 'your-anon-key');
window.location.reload();`}
            </pre>
            <p className={`${PK_THEME.textSubtle} text-xs mt-2`}>
              Clear override: <code className="text-red-400">localStorage.removeItem('pk_supabase_url'); localStorage.removeItem('pk_supabase_anon_key');</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}