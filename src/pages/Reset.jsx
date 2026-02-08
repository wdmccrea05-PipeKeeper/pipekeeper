import { supabase } from "@/components/utils/supabaseClient";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Verify user is in recovery session
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        setError("Invalid or expired reset link. Request a new password reset.");
      }
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("Password cannot be empty");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setTimeout(() => navigate(createPageUrl("Auth")), 2000);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a2c42] text-white">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">✅ Password updated</p>
          <p className="text-gray-400">Returning to login…</p>
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
        />

        <input
          type="password"
          className="p-2 rounded w-full bg-[#1a2c42] text-white border border-gray-600"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 w-full rounded font-medium disabled:opacity-50"
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