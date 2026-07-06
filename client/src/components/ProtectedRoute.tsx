import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../lib/auth-context";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <div className="p-8 text-sm text-ink/50 font-mono">Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
