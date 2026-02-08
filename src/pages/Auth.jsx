import React, { useState } from "react";
import { supabase, SUPABASE_READY, SUPABASE_URL, buildSupabaseHeaders, pingAuthSettings, pingRest } from "@/components/utils/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const PIPEKEEPER_LOGO =
  "https://uulcpkiwqeoiwbjgidwp.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6be04be36_Screenshot2025-12-22at33829PM.png";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [healthCheck, setHealthCheck] = useState(null);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email for the confirmation link!");
      } else {
        console.log("[AUTH_ATTEMPT]", { email });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        console.log("[AUTH_RESULT]", { error, hasSession: !!data?.session });
        if (error) {
          console.error("[AUTH_FULL_ERROR]", { message: error.message, status: error.status, name: error.name });
          throw error;
        }
        navigate("/Home");
      }
    } catch (err) {
      setError(`${err.message} (status: ${err.status || "unknown"})`);
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setHealthCheck({ loading: true });
    
    const authSettingsResult = await pingAuthSettings();
    const restResult = await pingRest();
    
    let tokenResult = { status: 0, body: "Not tested" };
    if (email && password) {
      try {
        const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
        const headers = buildSupabaseHeaders();
        
        console.log("[OUTGOING_HEADERS_KEYS]", Array.from(headers.keys()));
        console.log("[OUTGOING_APIKEY_LEN]", headers.get("apikey")?.length || 0);
        
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ email, password })
        });
        
        const text = await response.text();
        console.log("[TOKEN_TEST_RESULT]", { status: response.status, body: text.slice(0, 400) });
        tokenResult = { status: response.status, body: text.slice(0, 400) };
      } catch (e) {
        console.error("[TOKEN_TEST_ERROR]", e);
        tokenResult = { status: 0, body: `Error: ${e.message}` };
      }
    }
    
    setHealthCheck({
      loading: false,
      authSettings: authSettingsResult,
      rest: restResult,
      token: tokenResult
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <img src={PIPEKEEPER_LOGO} alt="PipeKeeper" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold text-[#E0D8C8] mb-2">PipeKeeper</h1>
          <p className="text-[#E0D8C8]/70">{isSignUp ? "Create your account" : "Welcome back"}</p>
        </div>

        {!SUPABASE_READY && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-sm text-yellow-400">Warning: Supabase validation failed</p>
          </div>
        )}

        <div className="bg-[#1A2B3A]/95 rounded-2xl shadow-xl p-8 border border-[#A35C5C]/30">
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#E0D8C8] mb-2">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#E0D8C8] mb-2">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {message && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-sm text-green-400">{message}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 space-y-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={runHealthCheck} 
              className="w-full text-xs"
              disabled={healthCheck?.loading}
            >
              {healthCheck?.loading ? "Running..." : "RUN SUPABASE HEALTH CHECK"}
            </Button>
            
            {healthCheck && !healthCheck.loading && (
              <div className="mt-3 p-4 rounded-lg bg-gray-900 border border-gray-700 space-y-3 text-xs">
                <div>
                  <div className="font-semibold text-[#E0D8C8] mb-1">Auth Settings:</div>
                  <div className="text-gray-300">
                    Status: <span className={healthCheck.authSettings.status === 200 ? "text-green-400" : "text-red-400"}>
                      {healthCheck.authSettings.status}
                    </span>
                  </div>
                  <div className="text-gray-400 break-all mt-1">{healthCheck.authSettings.body}</div>
                </div>
                
                <div>
                  <div className="font-semibold text-[#E0D8C8] mb-1">REST Ping:</div>
                  <div className="text-gray-300">
                    Status: <span className={healthCheck.rest.status === 200 ? "text-green-400" : "text-red-400"}>
                      {healthCheck.rest.status}
                    </span>
                  </div>
                  <div className="text-gray-400 break-all mt-1">{healthCheck.rest.body}</div>
                </div>
                
                <div>
                  <div className="font-semibold text-[#E0D8C8] mb-1">Token Test:</div>
                  <div className="text-gray-300">
                    Status: <span className={healthCheck.token.status === 200 ? "text-green-400" : healthCheck.token.status === 400 ? "text-yellow-400" : "text-red-400"}>
                      {healthCheck.token.status}
                    </span>
                    {healthCheck.token.status === 401 && (
                      <span className="text-red-400 ml-2">← Headers missing/stripped</span>
                    )}
                  </div>
                  <div className="text-gray-400 break-all mt-1">{healthCheck.token.body}</div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-colors"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}