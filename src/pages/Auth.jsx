import { useState, useEffect } from "react";
import { supabase } from "@/components/utils/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && event === "SIGNED_IN") {
        navigate("/Home");
      }
    });
  }, [navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    const { error } = await supabase.auth.signInWithPassword({
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
        await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          { redirectTo: window.location.origin + "/Reset" }
        );

        setStatus(
          "Account migrated. Password reset email sent."
        );
      } catch (e) {
        setStatus("Could not send reset email: " + e.message);
      }
    } else {
      setStatus(error.message || "Login failed");
    }

    setLoading(false);
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

        {status && (
          <p className="text-sm text-yellow-300">{status}</p>
        )}
      </form>
    </div>
  );
}