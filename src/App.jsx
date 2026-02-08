import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import NavigationTracker from "@/lib/NavigationTracker";
import { pagesConfig } from "./pages.config";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import React, { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import Layout from "@/Layout";
import NotFound from "@/pages/NotFound";

function AuthenticatedApp() {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    retrySession,
    isAuthenticated,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  // IMPORTANT: Your Pages config maps Auth -> "/Auth" (capital A)
  const AUTH_PATH = "/Auth";

  useEffect(() => {
    // Only react after initial loads complete
    if (isLoadingAuth || isLoadingPublicSettings) return;

    if (authError?.type === "auth_required") {
      // Avoid looping if we're already on the Auth route
      if (location.pathname !== AUTH_PATH) {
        navigate(AUTH_PATH, { replace: true, state: { from: location } });
      }
    }
  }, [
    authError,
    isLoadingAuth,
    isLoadingPublicSettings,
    location,
    navigate,
  ]);

  // Initial loading state
  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a2c42]">
        <div className="text-white text-lg">Loading…</div>
      </div>
    );
  }

  // If auth required, we let the router render so "/Auth" can display.
  // For other routes, the effect above will push to "/Auth".
  if (authError?.type === "user_not_registered") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a2c42] p-4">
        <div className="max-w-md w-full bg-white/10 border border-white/20 rounded-lg p-6 text-white">
          <h1 className="text-xl font-semibold mb-2">Account not registered</h1>
          <p className="text-white/80 mb-4">
            Your account is not registered for this app yet.
          </p>
          <button
            className="px-4 py-2 rounded bg-white/20 hover:bg-white/30 transition"
            onClick={retrySession}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Normal app routing
  return (
    <>
      <NavigationTracker />
      <Routes>
        <Route path="/" element={<Layout />}>
          {Object.entries(pagesConfig).map(([path, config]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={config.element}
            />
          ))}
          {/* Default route: send to Home if exists */}
          <Route
            index
            element={
              pagesConfig?.Home?.element ?? (
                <div className="p-6 text-white">Home not configured.</div>
              )
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthenticatedApp />
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}