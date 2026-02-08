import { useState, useEffect } from "react";
import { requireSupabase, SUPABASE_CONFIG_OK } from "@/components/utils/supabaseClient";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { AlertCircle } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in (only if config is OK)
    if (!SUPABASE_CONFIG_OK) return;
    
    const { data: sub } = requireSupabase().auth.onAuthStateChange((event, session) => {
      if (session?.user && event === "SIGNED_IN") {
        navigate(createPageUrl("Home"));
      }
    });

    return () => sub?.subscription?.unsubscribe?.();
  }, [navigate]);

  // Show config error if Supabase not configured
  if (!SUPABASE_CONFIG_OK) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a2c42] p-4">
        <div className="bg-[#243548] rounded-xl w-full max-w-sm p-8 border border-red-500/40">
          <div className="flex gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <h1 className="text-xl font-bold text-red-400">Configuration Error</h1>
          </div>
          
          <p className="text-[#E0D8C8] mb-4">
            Missing Supabase configuration. The app cannot function without the required environment variables.
          </p>
          
          <div className="bg-[#1a2c42] rounded-lg p-4 mb-4 space-y-2 text-sm">
            <p className="text-[#E0D8C8]/80">
              <span className="font-mono text-yellow-400">VITE_SUPABASE_URL</span>
              <span className="text-[#E0D8C8]/60"> is {!import.meta.env.VITE_SUPABASE_URL ? "missing" : "invalid"}</span>
            </p>
            <p className="text-[#E0D8C8]/80">
              <span className="font-mono text-yellow-400">VITE_SUPABASE_ANON_KEY</span>
              <span className="text-[#E0D8C8]/60"> is {!import.meta.env.VITE_SUPABASE_ANON_KEY ? "missing" : "invalid"}</span>
            </p>
          </div>
          
          <p className="text-[#E0D8C8]/70 text-sm">
            Please set both <span className="font-mono text-blue-400">VITE_SUPABASE_URL</span> and{" "}
            <span className="font-mono text-blue-400">VITE_SUPABASE_ANON_KEY</span> in the Base44 environment variables and redeploy the app.
          </p>
        </div>
      </div>
    );
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    const { error } = await requireSupabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (!error) {
      // Auth state change handler will redirect
      return;
    }

    // 🚨 MIGRATED USERS → FORCE RESET
    if (
      error.message.includes("Invalid login credentials") ||
      error.message.includes("Invalid email or password")
    ) {
      try {
        await requireSupabase().auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          { redirectTo: window.location.origin + "/ResetPassword" }
        );

        setStatus(
          "Your account was migrated. We emailed you a password reset link."
        );
      } catch (e) {
        setStatus("Could not send reset email: " + e.message);
      }
    } else {
      setStatus(error.message || "Login failed");
    }

    setLoading(false);
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!email.trim()) {
      setStatus("Please enter your email address.");
      return;
    }

    try {
      await requireSupabase().auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: window.location.origin + "/ResetPassword" }
      );
      setStatus("Password reset email sent. Check your inbox.");
    } catch (e) {
      setStatus("Could not send reset email: " + e.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a2c42]">
      <form
        onSubmit={handleLogin}
        className="bg-[#243548] p-6 rounded-xl w-full max-w-sm space-y-3"
      >
        <h1 className="text-white text-xl font-bold">PipeKeeper Login</h1>

        <input
          className="w-full p-2 rounded bg-[#1a2c42] text-white border border-gray-600"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full p-2 rounded bg-[#1a2c42] text-white border border-gray-600"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-medium disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>

        <button
          type="button"
          onClick={handleForgotPassword}
          className="w-full text-blue-400 hover:text-blue-300 text-sm"
        >
          Forgot password?
        </button>

        {status && (
          <p className="text-sm text-yellow-300">{status}</p>
        )}
      </form>
    </div>
  );
}