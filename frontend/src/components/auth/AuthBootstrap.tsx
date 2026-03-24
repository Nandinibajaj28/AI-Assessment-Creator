"use client";

import { useEffect } from "react";
import { getCurrentUser } from "@/services/api";
import { useAuthStore } from "@/store/useAuthStore";

export function AuthBootstrap() {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (typeof window !== "undefined") {
      if (token) {
        window.localStorage.setItem("veda-auth-token", token);
      } else {
        window.localStorage.removeItem("veda-auth-token");
      }
    }
  }, [hasHydrated, token]);

  useEffect(() => {
    if (!hasHydrated || !token) {
      return;
    }

    const activeToken = token;
    let ignore = false;

    async function syncUser() {
      try {
        const user = await getCurrentUser();
        if (!ignore) {
          setAuth({ user, token: activeToken });
        }
      } catch {
        if (!ignore) {
          clearAuth();
        }
      }
    }

    void syncUser();

    return () => {
      ignore = true;
    };
  }, [clearAuth, hasHydrated, setAuth, token]);

  return null;
}
