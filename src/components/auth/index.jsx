
// Compatibility layer ONLY.
// Base44 auth is removed. Nothing in the app should require AuthProvider.
// Keep these exports so legacy imports do not crash builds.

export const AuthProvider = ({ children }) => children;

export const useAuth = () => ({
  user: null,
  session: null,
  loading: false,
  signIn: async () => {
    throw new Error("Auth removed: use Supabase directly.");
  },
  signOut: async () => {
    throw new Error("Auth removed: use Supabase directly.");
  },
});
