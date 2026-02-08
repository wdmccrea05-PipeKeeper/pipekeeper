import { useState } from "react";
import { supabase } from "@/components/utils/supabaseClient";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setStatus("Checking account…");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (!error) return;

    // 🚨 MIGRATED USERS → FORCE RESET
    if (
      error.message.includes("Invalid login credentials") ||
      error.message.includes("Invalid email or password")
    ) {
      await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: "https://pipekeeper.app/reset" }
      );

      setStatus(
        "Your account was migrated. A password reset email has been sent."
      );
      return;
    }

    setStatus(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a2c42]">
      <form
        onSubmit={handleLogin}
        className="bg-[#243548] p-6 rounded-xl w-full max-w-sm"
      >
        <h1 className="text-white text-xl mb-4">PipeKeeper Login</h1>

        <input
          className="w-full mb-3 p-2 rounded"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full mb-3 p-2 rounded"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full bg-blue-600 text-white p-2 rounded">
          Sign In
        </button>

        {status && (
          <p className="text-sm text-yellow-300 mt-3">{status}</p>
        )}
      </form>
    </div>
  );
}