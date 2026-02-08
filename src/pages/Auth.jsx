import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
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
import { getSupabase } from "@/components/utils/supabaseClient";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, authError, retrySession } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  // Where to go after auth
  const fromPath = useMemo(() => {
    const from = location.state?.from;
    return typeof from?.pathname === "string"
      ? (from.pathname === "/Auth" ? "/" : from.pathname)
      : "/";
  }, [location.state]);

  // If already authenticated, go back where they were headed
  useEffect(() => {
    if (isAuthenticated) {
      navigate(fromPath, { replace: true });
    }
  }, [isAuthenticated, fromPath, navigate]);

  // NOTE: Supabase config being missing in Base44 preview can happen.
  // Don't block login UI because of it; just show a warning.
  const supabaseConfigWarning = useMemo(() => {
    try {
      // This returns null if not ready; that's fine.
      const sb = getSupabase();
      return sb ? "" : "Backend configuration is still loading (Supabase not ready yet).";
    } catch {
      return "Backend configuration is still loading (Supabase not ready yet).";
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setBusy(true);

    try {
      if (!email || !password) {
        setLocalError("Please enter your email and password.");
        return;
      }

      if (mode === "login") {
        const res = await login(email.trim(), password);
        if (!res?.ok) {
          setLocalError(res?.message || "Login failed.");
          return;
        }
      } else {
        const res = await register(email.trim(), password);
        if (!res?.ok) {
          setLocalError(res?.message || "Registration failed.");
          return;
        }
      }

      // Session refresh; then redirect
      await retrySession();
      navigate(fromPath, { replace: true });
    } catch (err) {
      setLocalError(err?.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }