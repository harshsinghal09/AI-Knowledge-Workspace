import { apiRequest, setAccessToken } from "./client";

export interface AuthResponse {
  accessToken: string;
}

export async function signup(email: string, password: string): Promise<void> {
  const res = await apiRequest<AuthResponse>("/auth/signup", {
    method: "POST",
    body: { email, password }
  });
  setAccessToken(res.accessToken);
}

export async function login(email: string, password: string): Promise<void> {
  const res = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password }
  });
  setAccessToken(res.accessToken);
}

export async function logout(): Promise<void> {
  await apiRequest("/auth/logout", { method: "POST" });
  setAccessToken(null);
}
