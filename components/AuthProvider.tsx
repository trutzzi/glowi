"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import useSWR, { SWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { invalidateCurrentUser } from "@/app/actions/session";
import type { Role, User } from "@/lib/auth";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string, role: Role) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthState({ children }: { children: React.ReactNode }) {
  // A 401 from /api/auth/me means "logged out", so don't retry it.
  const { data, isLoading, mutate } = useSWR<User>("/api/auth/me", fetcher, {
    shouldRetryOnError: false,
  });

  const login = useCallback(
    async (identifier: string, password: string, role: Role) => {
      const user = await fetcher<User>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, role }),
      });
      await invalidateCurrentUser();
      await mutate(user, { revalidate: false });
      return user;
    },
    [mutate]
  );

  const logout = useCallback(async () => {
    await fetcher("/api/auth/logout", { method: "POST" });
    await invalidateCurrentUser();
    await mutate(undefined, { revalidate: false });
  }, [mutate]);

  const value = useMemo(
    () => ({ user: data ?? null, isLoading, login, logout }),
    [data, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: false }}>
      <AuthState>{children}</AuthState>
    </SWRConfig>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
