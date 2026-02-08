import { useState } from "react";
import { supabase, pingAuthSettings } from "@/components/utils/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      navigate("/Home");
    }
  }

  async function handleReset() {
    let resetEmail = email;
    if (!resetEmail) {
      resetEmail = window.prompt("Please enter your email address for password reset:");
    }
    
    if (!resetEmail) return;

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: "https://pipekeeper.app/reset",
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Password reset email sent. Check your inbox.");
    }
  }

  async function runHealthCheck() {
    console.log("Running Supabase Health Check...");
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log("URL Configured:", !!url);
    console.log("Key Configured:", !!key);
    
    if (!url || !key) {
      alert("Supabase configuration missing!");
      return;
    }

    try {
      const { status, body } = await pingAuthSettings();
      console.log("Auth Endpoint Status:", status);
      if (status === 200) {
        alert("Health Check Passed: Supabase reachable.");
      } else {
        alert(`Health Check Failed: Status ${status}`);
      }
    } catch (e) {
      console.error("Health Check Error:", e);
      alert("Health Check Error: " + e.message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1A2B3A]/95 rounded-2xl shadow-xl p-8 border border-[#A35C5C]/30 text-[#E0D8C8]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">PipeKeeper</h1>
          <p className="opacity-70">Welcome back</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#112133] border border-[#46546E] rounded-lg p-2 text-white focus:border-[#D1A75D] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#112133] border border-[#46546E] rounded-lg p-2 text-white focus:border-[#D1A75D] outline-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#A35C5C] hover:bg-[#8F4E4E] text-[#F3EBDD] font-medium py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={handleReset}
            className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8] hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-[#A35C5C]/20 text-center">
          <button 
            onClick={runHealthCheck}
            className="text-xs text-[#E0D8C8]/30 hover:text-[#E0D8C8]/50 uppercase tracking-widest"
          >
            Run System Health Check
          </button>
        </div>
      </div>
    </div>
  );
}