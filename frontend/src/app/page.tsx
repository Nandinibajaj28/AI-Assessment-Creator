"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";

export default function HomePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <section className="min-h-[calc(100vh-20px)] overflow-hidden rounded-[18px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.94)_0%,_rgba(237,237,237,0.96)_38%,_#d9d9d9_100%)] shadow-[0_18px_40px_rgba(0,0,0,0.08)]">
      <div className="flex h-full min-h-[calc(100vh-20px)] flex-col justify-center px-6 py-12 sm:px-10">
        <div className="max-w-[560px]">
          <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-[#808080]">
            AI Assignment Creator
          </p>
          <h1 className="mt-4 text-[40px] font-semibold tracking-[-0.06em] text-[#262626] sm:text-[56px]">
            Welcome back{user?.name ? `, ${user.name}` : ""}. Build, generate, and manage assignments in one clean workflow.
          </h1>
          <p className="mt-4 max-w-[500px] text-[15px] leading-[1.7] text-[#666666]">
            Start from your assignments dashboard, create a new assignment, review the generated paper, and return to an updated list instantly.
          </p>
          <Link
            href="/assignments"
            className="mt-8 inline-flex h-[46px] items-center justify-center rounded-full bg-[#1f1f1f] px-6 text-[14px] font-medium text-white shadow-[0_16px_30px_rgba(0,0,0,0.16)]"
          >
            Go to Assignments
          </Link>
        </div>
      </div>
    </section>
  );
}
