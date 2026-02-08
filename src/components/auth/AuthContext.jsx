import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase } from '@/components/utils/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setIsLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setAuthError(null);
      const supabase = getSupabase();
      
      if (!supabase) {
        return { ok: false, message: 'Backend not ready' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setAuthError(error);
        return { ok: false, message: error.message };
      }

      setIsAuthenticated(true);
      return { ok: true };
    } catch (err) {
      console.error('Login error:', err);
      setAuthError(err);
      return { ok: false, message: err.message };
    }
  };

  const register = async (email, password) => {
    try {
      setAuthError(null);
      const supabase = getSupabase();
      
      if (!supabase) {
        return { ok: false, message: 'Backend not ready' };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setAuthError(error);
        return { ok: false, message: error.message };
      }

      // Auto-login after registration
      setIsAuthenticated(true);
      return { ok: true };
    } catch (err) {
      console.error('Register error:', err);
      setAuthError(err);
      return { ok: false, message: err.message };
    }
  };

  const retrySession = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    } catch (err) {
      console.error('Session retry error:', err);
    }
  };

  const logout = async () => {
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.auth.signOut();
      }
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      authError,
      isLoading,
      login,
      register,
      retrySession,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}