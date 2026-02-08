import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseAsync, SUPABASE_CONFIG_OK } from "@/components/utils/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState("");

  useEffect(() => {
    // Check if already authenticated and wait for Supabase to load
    const checkAuth = async () => {
      try {
        const supabase = await getSupabaseAsync();
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/", { replace: true });
        }
        
        setReady(true);
      } catch (err) {
        console.error('[Auth] Critical init error:', err?.message);
        setInitError(err?.message || "Failed to initialize authentication");
        setReady(true); // Mark ready even if error, to allow manual retry
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const supabase = await getSupabaseAsync();

      if (!email || !password) {
        setError("Please enter email and password.");
        setBusy(false);
        return;
      }

      if (mode === "login") {
        console.log("[Auth] Attempting login for:", email);
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (err) {
          console.error("[Auth] Login error:", err);
          setError(err.message);
          setBusy(false);
          return;
        }
        console.log("[Auth] Login successful");
        navigate("/", { replace: true });
      } else {
        console.log("[Auth] Attempting signup for:", email);
        const { error: err } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });
        if (err) {
          console.error("[Auth] Signup error:", err);
          setError(err.message);
          setBusy(false);
          return;
        }
        console.log("[Auth] Signup successful");
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("[Auth] Exception:", err);
      setError(err?.message || "Authentication failed. Please refresh and try again.");
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a2c42] p-4">
        <div className="text-center">
          <div className="text-[#E0D8C8] text-lg font-semibold">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a2c42] p-4">
      <Card className="w-full max-w-sm bg-[#243548] border-[#E0D8C8]/20">
        <CardHeader>
          <CardTitle className="text-[#E0D8C8]">
            {mode === "login" ? "Sign In" : "Create Account"}
          </CardTitle>
          <CardDescription className="text-[#E0D8C8]/70">
            {mode === "login"
              ? "Sign in to your PipeKeeper account"
              : "Create a new PipeKeeper account"}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert className="bg-red-500/10 border-red-500/30">
                <AlertDescription className="text-red-200 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label className="text-sm text-[#E0D8C8]">Email</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                className="bg-[#1a2c42] border-[#E0D8C8]/20 text-[#E0D8C8]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[#E0D8C8]">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className="bg-[#1a2c42] border-[#E0D8C8]/20 text-[#E0D8C8]"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-amber-700 hover:bg-amber-800"
            >
              {busy ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              disabled={busy}
              className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-colors disabled:opacity-50"
            >
              {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}