import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSupabase } from "@/components/utils/supabaseClient";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, authError, retrySession } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  // Where to go after auth
  const fromPath = useMemo(() => {
    const from = location.state?.from;
    return typeof from?.pathname === "string"
      ? (from.pathname === "/Auth" ? "/" : from.pathname)
      : "/";
  }, [location.state]);

  // If already authenticated, go back where they were headed
  useEffect(() => {
    if (isAuthenticated) {
      navigate(fromPath, { replace: true });
    }
  }, [isAuthenticated, fromPath, navigate]);

  // NOTE: Supabase config being missing in Base44 preview can happen.
  // Don't block login UI because of it; just show a warning.
  const supabaseConfigWarning = useMemo(() => {
    try {
      // This returns null if not ready; that's fine.
      const sb = getSupabase();
      return sb ? "" : "Backend configuration is still loading (Supabase not ready yet).";
    } catch {
      return "Backend configuration is still loading (Supabase not ready yet).";
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setBusy(true);

    try {
      if (!email || !password) {
        setLocalError("Please enter your email and password.");
        return;
      }

      if (mode === "login") {
        const res = await login(email.trim(), password);
        if (!res?.ok) {
          setLocalError(res?.message || "Login failed.");
          return;
        }
      } else {
        const res = await register(email.trim(), password);
        if (!res?.ok) {
          setLocalError(res?.message || "Registration failed.");
          return;
        }
      }

      // Session refresh; then redirect
      await retrySession();
      navigate(fromPath, { replace: true });
    } catch (err) {
      setLocalError(err?.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

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

        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            {supabaseConfigWarning && (
              <Alert className="bg-yellow-500/10 border-yellow-500/30">
                <AlertDescription className="text-yellow-200 text-sm">
                  {supabaseConfigWarning}
                </AlertDescription>
              </Alert>
            )}

            {(localError || authError) && (
              <Alert className="bg-red-500/10 border-red-500/30">
                <AlertDescription className="text-red-200 text-sm">
                  {localError || authError?.message}
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
              {busy
                ? "Please wait…"
                : mode === "login"
                ? "Sign In"
                : "Create Account"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setLocalError("");
              }}
              disabled={busy}
              className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-colors disabled:opacity-50"
            >
              {mode === "login"
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}