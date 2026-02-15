import React, { createContext, useState, useContext, useEffect } from "react";
import { getSupabaseAsync } from "@/components/utils/supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};
    let mounted = true;

    const initialize = async () => {
      try {
        setIsLoadingAuth(true);
        const supabase = await getSupabaseAsync();
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) throw error;

        const sessionUser = data?.session?.user || null;
        if (sessionUser?.email) {
          setUser(sessionUser);
          setIsAuthenticated(true);
          setAuthError(null);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setAuthError({
            type: "auth_required",
            message: "Authentication required",
          });
        }

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          const authUser = session?.user || null;
          if (authUser?.email) {
            setUser(authUser);
            setIsAuthenticated(true);
            setAuthError(null);
          } else {
            setUser(null);
            setIsAuthenticated(false);
            setAuthError({
              type: "auth_required",
              message: "Authentication required",
            });
          }
        });

        unsubscribe = () => sub?.subscription?.unsubscribe?.();
      } catch (error) {
        if (!mounted) return;
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({
          type: "auth_required",
          message: error?.message || "Authentication required",
        });
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }
    };

    initialize();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const supabase = await getSupabaseAsync();
      const { data, error } = await supabase.auth.getSession();

      if (error) throw error;

      const sessionUser = data?.session?.user || null;
      if (sessionUser?.email) {
        setUser(sessionUser);
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({
          type: "auth_required",
          message: "Authentication required",
        });
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: "auth_required",
        message: error?.message || "Authentication required",
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const checkAppState = async () => {
    setIsLoadingPublicSettings(false);
    setAppPublicSettings(null);
    await checkUserAuth();
  };

  const logout = async (shouldRedirect = true) => {
    try {
      const supabase = await getSupabaseAsync();
      await supabase.auth.signOut();
    } catch {
      // Keep logout resilient
    }

    setUser(null);
    setIsAuthenticated(false);
    setAuthError({
      type: "auth_required",
      message: "Authentication required",
    });

    if (shouldRedirect && typeof window !== "undefined") {
      window.location.href = "/Auth";
    }
  };

  const navigateToLogin = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/Auth";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
