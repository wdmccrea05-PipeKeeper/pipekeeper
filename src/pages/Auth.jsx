import { useState } from "react";
import { supabase } from "@/components/utils/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
    }
  }

  async function handleReset() {
    if (!email) {
      alert("Enter your email first");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://pipekeeper.app/reset",
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Password reset email sent.");
    }
  }

  return (
    <div className="auth-container">
      <h1>PipeKeeper</h1>
      <p>Welcome back</p>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <button
        onClick={handleReset}
        style={{ marginTop: "12px", fontSize: "14px" }}
      >
        Forgot password?
      </button>
    </div>
  );
}