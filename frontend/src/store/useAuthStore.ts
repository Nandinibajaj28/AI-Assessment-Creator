"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { AuthUser } from "@/types/auth";

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  hasHydrated: boolean;
  setAuth: (payload: { user: AuthUser; token: string }) => void;
  clearAuth: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hasHydrated: false,
      setAuth: ({ user, token }) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "veda-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
