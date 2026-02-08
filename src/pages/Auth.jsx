import React, { useState } from "react";
import { supabase, SUPABASE_READY } from "@/components/utils/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const PIPEKEEPER_LOGO =
  "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/6be04be36_Screenshot2025-12-22at33829PM.png";

const SUPABASE_URL = "https://qtrypzzcjebvfcihiynt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cnlwenpjamVidmZjaWhpeW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MjMxNjEsImV4cCI6MjA1MjA5OTE2MX0.gE-8W18qPFyqCLsVE7O8SfuVCzT-_yZmLR_kRUa8x9M";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [testResult, setTestResult] = useState("");
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
        if (error) throw error;
        navigate("/Home");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenTest = async () => {
    setTestResult("Testing...");
    try {
      const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
      const key = SUPABASE_KEY.trim();
      
      console.log("[TOKEN_TEST_HEADERS]", {
        hasApiKey: !!key,
        hasAuth: !!key,
        keyLen: key.length,
        urlMatches: url.includes("qtrypzzcjebvfcihiynt")
      });
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "apikey": key,
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });
      
      const text = await response.text();
      console.log("[TOKEN_TEST_RESULT]", { status: response.status, body: text.slice(0, 200) });
      
      let result = `Status: ${response.status}\nBody: ${text.slice(0, 200)}`;
      if (response.status === 401) {
        result += "\n\n401 = invalid API key (key mismatch/truncated/swapped).";
      }
      setTestResult(result);
    } catch (err) {
      console.log("[TOKEN_TEST_ERROR]", err);
      setTestResult(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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

          <div className="mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleTokenTest} 
              className="w-full text-xs"
            >
              Run Token Test
            </Button>
            {testResult && (
              <div className="mt-2 p-2 rounded bg-gray-800 text-xs text-gray-300 whitespace-pre-wrap break-all">
                {testResult}
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