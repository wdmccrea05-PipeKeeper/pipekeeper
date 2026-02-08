import React, { useState } from "react";
import { supabase } from "@/components/utils/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";

const PIPEKEEPER_LOGO = "/assets/pipekeeper-logo.png";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [healthCheck, setHealthCheck] = useState(null);
  const navigate = useNavigate();
  const isDebugMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1";

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
          console.error("[AUTH_ERROR]", { message: error.message, status: error.status });
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
    // Health check only available in debug mode
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") !== "1") {
      alert("Debug mode not enabled. Add ?debug=1 to URL to enable.");
      return;
    }
    
    setHealthCheck({ loading: true });
    
    let tokenResult = { status: 0, body: "Enter email/password and try again" };
    if (email && password) {
      try {
        console.log("[TOKEN_TEST] calling signInWithPassword");
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
          tokenResult = { 
            status: error.status || 400, 
            body: `Error: ${error.message}` 
          };
        } else if (data?.session) {
          tokenResult = { 
            status: 200, 
            body: "Success - session created" 
          };
        } else {
          tokenResult = { 
            status: 200, 
            body: "Success but no session returned" 
          };
        }
      } catch (e) {
        console.error("[TOKEN_TEST_ERROR]", e);
        tokenResult = { status: 0, body: `Exception: ${e.message}` };
      }
    }
    
    setHealthCheck({
      loading: false,
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

          {isDebugMode && (
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
                    <div className="font-semibold text-[#E0D8C8] mb-1">Sign In Test:</div>
                    <div className="text-gray-300">
                      Status: <span className={healthCheck.token.status === 200 ? "text-green-400" : healthCheck.token.status === 400 ? "text-yellow-400" : "text-red-400"}>
                        {healthCheck.token.status}
                      </span>
                    </div>
                    <div className="text-gray-400 break-all mt-1">{healthCheck.token.body}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 text-center space-y-2">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-colors block w-full"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
            {isDebugMode && (
              <Link
                to={createPageUrl("Debug")}
                className="text-xs text-[#E0D8C8]/50 hover:text-[#E0D8C8]/70 transition-colors block"
              >
                🔧 Debug Console
              </Link>
            )}
          </div>
          </div>

          </div>
          </div>
          );
          }