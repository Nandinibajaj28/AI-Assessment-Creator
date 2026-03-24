"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useAssignmentStore } from "@/store/useAssignmentStore";

type SidebarItem = {
  label: string;
  icon: ReactNode;
  badge?: string;
  href?: string;
};

const primaryItems: SidebarItem[] = [
  { label: "Home", icon: <HomeIcon />, href: "/" },
  { label: "Assignments", icon: <AssignmentsIcon />, href: "/assignments" },
  { label: "Create Assignment", icon: <PlusSparkleIcon />, href: "/create" },
];

export function AssignmentSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const resetAssignments = useAssignmentStore((state) => state.resetAssignments);

  function handleLogout() {
    clearAuth();
    resetAssignments();

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("veda-auth-token");
    }

    router.replace("/login");
  }

  return (
    <aside className="w-full max-w-[236px] rounded-[14px] bg-white px-4 pb-4 pt-5 shadow-[0_14px_36px_rgba(15,23,42,0.12)]">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-xl bg-[radial-gradient(circle_at_30%_25%,#ffd7a0_0%,#d86d40_34%,#6f1d13_100%)] shadow-[0_10px_20px_rgba(172,75,35,0.35)]">
          <span className="text-[28px] font-black tracking-[-0.08em] text-white">V</span>
        </div>
        <span className="text-[19px] font-semibold tracking-[-0.04em] text-[#2a2a2a]">VedaAI</span>
      </div>

      <Link href="/create" className="mt-12 block w-full">
        <button
          type="button"
          className="flex h-[38px] w-full items-center justify-center gap-2 rounded-full border border-[#ff7a45] bg-[#363636] text-[14px] font-medium text-white shadow-[0_0_0_2px_rgba(255,122,69,0.28),0_10px_18px_rgba(255,122,69,0.12)] transition-transform hover:scale-[1.01]"
        >
          <PlusSparkleIcon />
          <span>Create Assignment</span>
        </button>
      </Link>

      <nav className="mt-[35px] space-y-1.5">
        {primaryItems.map((item) => (
          <SidebarNavItem
            key={item.label}
            item={item}
            active={item.href ? (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) : false}
          />
        ))}
      </nav>

      <div className="mt-[220px]">
        <SidebarNavItem item={{ label: "Logout", icon: <SettingsIcon /> }} active={false} onClick={handleLogout} />

        <div className="mt-3 rounded-[2px] border-[3px] border-[#7287b1] bg-[#f5f2ec] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#f2d7bd] text-[24px]">
              <span>{(user?.name || "U").slice(0, 1).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-5 text-[#2f2f2f]">
                {user?.name || "Teacher"}
              </p>
              <p className="truncate text-[13px] leading-5 text-[#686868]">{user?.email || "Signed in"}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarNavItem({ item, active, onClick }: { item: SidebarItem; active: boolean; onClick?: () => void }) {
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-[9px]">
        <span className={active ? "text-[#3a3a3a]" : "text-[#7b7b7b]"}>{item.icon}</span>
        <span
          className={[
            "truncate text-[13.5px] leading-none",
            active ? "font-medium text-[#323232]" : "font-normal text-[#747474]",
          ].join(" ")}
        >
          {item.label}
        </span>
      </span>

      {item.badge ? (
        <span className="rounded-full bg-[#f1f1f1] px-2 py-[2px] text-[11px] font-medium text-[#666]">
          {item.badge}
        </span>
      ) : null}
    </>
  );

  const className = [
    "flex h-7 w-full items-center justify-between rounded-[6px] px-[9px] text-left transition-colors",
    active ? "bg-[#efefef]" : "hover:bg-[#f6f6f6]",
  ].join(" ");

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function HomeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 2.25H6V6.25H2V2.25Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 2.25H12V6.25H8V2.25Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 8.25H6V12.25H2V8.25Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 8.25H12V12.25H8V8.25Z" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function AssignmentsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M4 1.75H10L12 3.75V12.25H4V1.75Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 1.75V3.75H12" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 6H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M6 8.5H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 4.85C5.81259 4.85 4.85 5.81259 4.85 7C4.85 8.18741 5.81259 9.15 7 9.15C8.18741 9.15 9.15 8.18741 9.15 7C9.15 5.81259 8.18741 4.85 7 4.85Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M11.05 7C11.05 6.71341 11.0177 6.43435 10.9565 6.16621L12.05 5.32553L11.1 3.67917L9.77346 4.1522C9.36086 3.82425 8.88264 3.57598 8.36069 3.42775L8.15 2H5.85L5.63931 3.42775C5.11736 3.57598 4.63914 3.82425 4.22654 4.1522L2.9 3.67917L1.95 5.32553L3.0435 6.16621C2.98234 6.43435 2.95 6.71341 2.95 7C2.95 7.28659 2.98234 7.56565 3.0435 7.83379L1.95 8.67447L2.9 10.3208L4.22654 9.8478C4.63914 10.1758 5.11736 10.424 5.63931 10.5722L5.85 12H8.15L8.36069 10.5722C8.88264 10.424 9.36086 10.1758 9.77346 9.8478L11.1 10.3208L12.05 8.67447L10.9565 7.83379C11.0177 7.56565 11.05 7.28659 11.05 7Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

function PlusSparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 3.2V10.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3.2 7H10.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2.35 2.1L2.65 2.95L3.5 3.25L2.65 3.55L2.35 4.4L2.05 3.55L1.2 3.25L2.05 2.95L2.35 2.1Z" fill="currentColor" />
      <path d="M10.75 1.7L11 2.4L11.7 2.65L11 2.9L10.75 3.6L10.5 2.9L9.8 2.65L10.5 2.4L10.75 1.7Z" fill="currentColor" />
    </svg>
  );
}
