import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseAsync, SUPABASE_CONFIG_OK } from "@/components/utils/supabaseClient";
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
    if (e?.preventDefault) {
      e.preventDefault();
    }
    console.log("[Auth] handleSubmit FIRED - mode:", mode, "email:", email, "password:", password.length);
    setError("");
    setBusy(true);
    console.log("[Auth] About to validate - email:", email, "password length:", password.length);

    try {
      if (!email || !password) {
        setError("Please enter email and password.");
        setBusy(false);
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        setBusy(false);
        return;
      }

      console.log("[Auth] Getting Supabase client...");
      const supabase = await getSupabaseAsync();
      console.log("[Auth] Supabase client obtained:", !!supabase);
      
      if (!supabase) {
        throw new Error("Supabase not initialized");
      }

      const emailTrimmed = email.trim().toLowerCase();

      if (mode === "login") {
        console.log("[Auth] Attempting login for:", emailTrimmed);
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email: emailTrimmed,
          password,
        });
        console.log("[Auth] Login response received, error:", !!err, "data:", !!data);
        
        if (err) {
          console.error("[Auth] Login error:", err);
          setError(err.message || "Login failed. Check your email and password.");
          setBusy(false);
          return;
        }
        if (!data.session) {
          setError("Login succeeded but no session created. Please try again.");
          setBusy(false);
          return;
        }
        console.log("[Auth] Login successful, navigating...");
        await new Promise(r => setTimeout(r, 300));
        navigate("/", { replace: true });
      } else {
        console.log("[Auth] Attempting signup for:", emailTrimmed);
        const { data, error: err } = await supabase.auth.signUp({
          email: emailTrimmed,
          password,
        });
        console.log("[Auth] Signup response received, error:", !!err, "data:", !!data);
        
        if (err) {
          console.error("[Auth] Signup error:", err);
          setError(err.message || "Signup failed. Please try again.");
          setBusy(false);
          return;
        }
        if (!data.user) {
          setError("Signup succeeded but user not created. Please try again.");
          setBusy(false);
          return;
        }
        console.log("[Auth] Signup successful");
        setError("");
        setMode("login");
        setPassword("");
        setEmail(emailTrimmed);
        if (!data.session) {
          setTimeout(() => {
            setError("Account created! Please log in.");
          }, 500);
        }
        setBusy(false);
      }
    } catch (err) {
      console.error("[Auth] Exception:", err?.message, err);
      setError(err?.message || "Authentication failed. Please refresh and try again.");
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a2c42] p-4">
        <div className="text-center">
          <div className="text-[#E0D8C8] text-lg font-semibold">Initializing...</div>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a2c42] p-4">
        <div className="text-center">
          <div className="text-[#E0D8C8] text-lg font-semibold mb-4">Authentication Setup Error</div>
          <div className="text-[#E0D8C8]/70 text-sm mb-6">{initError}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#A35C5C] text-[#F3EBDD] rounded-lg hover:bg-[#8F4E4E] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  console.log("[Auth] Component rendering, ready:", ready);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a2c42] p-4" onClick={() => console.log("[Auth] div clicked")}>
      <Card className="w-full max-w-sm bg-[#243548] border-[#E0D8C8]/20" onClick={() => console.log("[Auth] Card clicked")}>
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

        <form onSubmit={(e) => { 
          console.log("[Auth] Form onSubmit fired!");
          e.preventDefault(); 
          handleSubmit(e); 
        }}>
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
            <button
              type="button"
              onClick={(e) => {
                console.log("[Auth] Button onClick fired!", e);
                e.preventDefault();
                handleSubmit(e);
              }}
              disabled={busy}
              style={{ position: 'relative', zIndex: 10 }}
              className="w-full h-10 px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-medium transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {busy ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>

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