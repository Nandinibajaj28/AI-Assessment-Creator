"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AssignmentSidebar } from "@/components/assignment/shared/AssignmentSidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const showSidebar =
    !isAuthRoute &&
    (pathname === "/" ||
      pathname.startsWith("/assignments") ||
      pathname.startsWith("/create") ||
      pathname.startsWith("/assignment/"));

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-[#efefef] p-[8px] md:p-[10px]">
      <div className="mx-auto flex max-w-[1380px] gap-[10px] md:min-h-[calc(100vh-20px)]">
        <aside className="hidden md:block md:shrink-0">
          <div className="sticky top-[10px]">
            <AssignmentSidebar />
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}
