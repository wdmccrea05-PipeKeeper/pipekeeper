import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";

import NavigationTracker from "@/lib/NavigationTracker";
import Layout from "@/Layout";
import NotFound from "@/pages/NotFound";

import { pagesConfig } from "./pages.config";
import { AuthProvider, useAuth } from "@/lib/AuthContext";

function AuthenticatedApp() {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  // Your router path is based on pages.config.js key "Auth" -> "/Auth" (capital A)
  const AUTH_PATH = "/Auth";

  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings) return;

    // Only redirect when auth is required, and never if we're already on Auth.
    if (authError?.type === "auth_required" && location.pathname !== AUTH_PATH) {
      navigate(AUTH_PATH, { replace: true, state: { from: location } });
    }
  }, [authError, isLoadingAuth, isLoadingPublicSettings, location, navigate]);

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a2c42]">
        <div className="text-white text-lg">Loading…</div>
      </div>
    );
  }

  return (
    <>
      <NavigationTracker />
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Pages */}
          {Object.entries(pagesConfig).map(([path, config]) => (
            <Route key={path} path={`/${path}`} element={config.element} />
          ))}

          {/* Index: prefer Home if it exists */}
          <Route index element={pagesConfig?.Home?.element ?? <NotFound />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}