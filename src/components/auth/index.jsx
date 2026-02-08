// Compatibility re-export for legacy imports
// Note: useCurrentUser does not require AuthProvider

export function AuthProvider({ children }) {
  return children;
}

export function useAuth() {
  return { user: null, loading: false };
}