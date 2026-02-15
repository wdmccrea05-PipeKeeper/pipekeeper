import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();
const isDev = import.meta?.env?.DEV;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    checkAppState();
    return () => {
      isMountedRef.current = false;
    };
  }, [checkAppState]);

  const setIfMounted = useCallback((setter, value) => {
    if (isMountedRef.current) {
      setter(value);
    }
  }, []);

  const checkUserAuth = useCallback(async () => {
    try {
      setIfMounted(setIsLoadingAuth, true);
      const currentUser = await base44.auth.me();
      setIfMounted(setUser, currentUser);
      setIfMounted(setIsAuthenticated, true);
      setIfMounted(setAuthError, null);
    } catch (error) {
      setIfMounted(setUser, null);
      setIfMounted(setIsAuthenticated, false);

      // Expected for expired/invalid tokens.
      if (error?.status === 401 || error?.status === 403) {
        setIfMounted(setAuthError, {
          type: 'auth_required',
          message: 'Authentication required',
        });
      } else {
        if (isDev) {
          console.warn('[AuthContext] User auth check failed:', error);
        }
        setIfMounted(setAuthError, {
          type: 'unknown',
          message: error?.message || 'An unexpected error occurred',
        });
      }
    } finally {
      setIfMounted(setIsLoadingAuth, false);
    }
  }, [setIfMounted]);

  const checkAppState = useCallback(async () => {
    try {
      setIfMounted(setIsLoadingPublicSettings, true);
      setIfMounted(setAuthError, null);

      const appClient = createAxiosClient({
        baseURL: '/api/apps/public',
        headers: {
          'X-App-Id': appParams.appId,
        },
        token: appParams.token,
        interceptResponses: true,
      });

      const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
      setIfMounted(setAppPublicSettings, publicSettings);

      if (appParams.token) {
        await checkUserAuth();
      } else {
        setIfMounted(setIsAuthenticated, false);
        setIfMounted(setIsLoadingAuth, false);
      }
    } catch (appError) {
      const reason = appError?.data?.extra_data?.reason;
      const status = appError?.status;

      if ((status === 401 || status === 403) && reason) {
        if (reason === 'auth_required') {
          setIfMounted(setAuthError, {
            type: 'auth_required',
            message: 'Authentication required',
          });
        } else if (reason === 'user_not_registered') {
          setIfMounted(setAuthError, {
            type: 'user_not_registered',
            message: 'User not registered for this app',
          });
        } else {
          setIfMounted(setAuthError, {
            type: reason,
            message: appError?.message || 'App access denied',
          });
        }
      } else {
        if (isDev) {
          console.warn('[AuthContext] App state check failed:', appError);
        }
        setIfMounted(setAuthError, {
          type: 'unknown',
          message: appError?.message || 'Failed to load app',
        });
      }
      setIfMounted(setIsLoadingAuth, false);
      setIfMounted(setIsAuthenticated, false);
    } finally {
      setIfMounted(setIsLoadingPublicSettings, false);
    }
  }, [checkUserAuth, setIfMounted]);

  const logout = useCallback((shouldRedirect = true) => {
    setIfMounted(setUser, null);
    setIfMounted(setIsAuthenticated, false);
    setIfMounted(setAuthError, null);
    
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  }, [setIfMounted]);

  const navigateToLogin = useCallback(() => {
    base44.auth.redirectToLogin(window.location.href);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
