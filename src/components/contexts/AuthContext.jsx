/**
 * Thin re-export — canonical AuthContext lives at @/lib/AuthContext.
 * All new imports must use @/lib/AuthContext directly.
 */
export { AuthProvider, useAuth } from "@/lib/AuthContext";
