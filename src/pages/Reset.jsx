import { supabase } from "@/components/utils/supabaseClient";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Reset() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Verify user is in recovery session
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        setError("Invalid or expired reset link. Please request a new one.");
      }
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!password.trim()) {
      setError("Password cannot be empty");
      return;
    }

    setLoading(true);
    setError("");

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => navigate("/Home"), 2000);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a2c42] text-white">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">✅ Password updated</p>
          <p className="text-gray-400">Redirecting to home…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a2c42]">
      <form onSubmit={submit} className="bg-[#243548] p-6 rounded-xl w-full max-w-sm space-y-3">
        <h1 className="text-white font-bold text-xl">Set New Password</h1>

        <input
          type="password"
          className="p-2 rounded w-full bg-[#1a2c42] text-white border border-gray-600"
          placeholder="New password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white p-2 w-full rounded font-medium disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save Password"}
        </button>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </form>
    </div>
  );
}