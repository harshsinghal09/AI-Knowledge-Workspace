import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAccessToken, setAccessToken } from "../api/client";
import * as authApi from "../api/auth";

interface AuthContextValue {
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAccessToken());
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    setIsInitializing(false);
  }, []);

  async function login(email: string, password: string) {
    await authApi.login(email, password);
    setIsAuthenticated(true);
  }

  async function signup(email: string, password: string) {
    await authApi.signup(email, password);
    setIsAuthenticated(true);
  }

  async function logout() {
    await authApi.logout();
    setAccessToken(null);
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isInitializing, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
