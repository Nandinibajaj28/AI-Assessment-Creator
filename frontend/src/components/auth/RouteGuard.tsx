"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

const PUBLIC_ROUTES = new Set(["/login", "/signup"]);

function isProtectedRoute(pathname: string) {
  return !PUBLIC_ROUTES.has(pathname);
}

export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!token && isProtectedRoute(pathname)) {
      router.replace("/login");
      return;
    }

    if (token && PUBLIC_ROUTES.has(pathname)) {
      router.replace("/");
    }
  }, [hasHydrated, pathname, router, token]);

  if (!hasHydrated) {
    return <FullscreenLoader />;
  }

  if (!token && isProtectedRoute(pathname)) {
    return <FullscreenLoader />;
  }

  if (token && PUBLIC_ROUTES.has(pathname)) {
    return <FullscreenLoader />;
  }

  return <>{children}</>;
}

function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#efefef]">
      <div className="rounded-full border border-[#d6d6d6] bg-white px-4 py-2 text-sm text-[#4b4b4b] shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
        Loading...
      </div>
    </div>
  );
}
