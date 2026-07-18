import type { Role } from "@/lib/role-context";

import { apiGet, apiPost } from "./api-client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: Role;
};

export type AuthSession = {
  user: AuthUser;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export const authService = {
  async getSession(): Promise<AuthSession | null> {
    try {
      return await apiGet<AuthSession>("/api/auth/me");
    } catch {
      return null;
    }
  },

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const email = credentials.email.trim();
    const password = credentials.password.trim();

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    return apiPost<AuthSession, LoginCredentials>("/api/auth/login", { email, password });
  },

  async logout() {
    await apiPost<void>("/api/auth/logout");
  },
};
