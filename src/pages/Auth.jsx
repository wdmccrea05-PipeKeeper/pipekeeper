import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.log('Auth check:', err?.message);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = async () => {
    try {
      // Redirect to Base44's login page
      await base44.auth.redirectToLogin(window.location.pathname);
    } catch (err) {
      console.error('Login redirect failed:', err);
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