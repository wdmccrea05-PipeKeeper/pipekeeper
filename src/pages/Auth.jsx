import { useState } from "react";
import { supabase } from "@/components/utils/supabaseClient";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      // 🔒 MIGRATED USER PATH — force password reset
      if (
        error.message.includes("Invalid login credentials") ||
        error.message.includes("Invalid email or password")
      ) {
        await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/Auth`,
        });

        setMessage(
          "Your account was migrated. Check your email to set a new password."
        );
        setLoading(false);
        return;
      }

      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data?.session) {
      navigate(createPageUrl("Home"), { replace: true });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] p-4">
      <form
        onSubmit={handleLogin}
        className="bg-black/40 backdrop-blur p-6 rounded-xl w-full max-w-sm text-white"
      >
        <h1 className="text-2xl font-bold mb-4 text-center">PipeKeeper Login</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded bg-white/10"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded bg-white/10"
          required
        />

        {message && (
          <p className="text-sm text-yellow-300 mb-3 text-center">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-600 hover:bg-amber-700 py-2 rounded font-semibold"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}