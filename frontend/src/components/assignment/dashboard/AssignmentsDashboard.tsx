"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDisplayDate } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { deleteAssignment, getAssignments } from "@/services/api";
import { useAssignmentStore } from "@/store/useAssignmentStore";
import { useAuthStore } from "@/store/useAuthStore";
import AssignmentGrid from "@/components/assignment/dashboard/AssignmentGrid";
import EmptyState from "@/components/assignment/dashboard/EmptyState";
import FloatingButton from "@/components/assignment/dashboard/FloatingButton";

export default function AssignmentsDashboard() {
  const router = useRouter();
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const { assignments, setAssignments, removeAssignment } = useAssignmentStore();
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadAssignments() {
      try {
        setIsLoading(true);
        const data = await getAssignments();
        if (isActive) {
          setAssignments(data);
        }
      } catch {
        if (isActive) {
          setAssignments([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadAssignments();

    const socket = getSocket();
    socket.connect();

    const onDone = () => {
      void loadAssignments();
    };

    socket.on("assignment_done", onDone);

    return () => {
      isActive = false;
      socket.off("assignment_done", onDone);
    };
  }, [setAssignments]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return assignments;

    return assignments.filter((assignment) => {
      const assignedOn = formatDisplayDate(assignment.assignedOn).toLowerCase();
      const dueDate = formatDisplayDate(assignment.dueDate).toLowerCase();

      return (
        assignment.title.toLowerCase().includes(query) ||
        assignedOn.includes(query) ||
        dueDate.includes(query)
      );
    });
  }, [assignments, search]);

  async function handleDelete(id: string) {
    const previousAssignments = assignments;
    removeAssignment(id);
    setOpenMenuId(null);

    try {
      await deleteAssignment(id);
    } catch {
      setAssignments(previousAssignments);
    }
  }

  return (
    <section className="relative min-h-[calc(100vh-20px)] overflow-hidden rounded-[18px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95)_0%,_rgba(238,238,238,0.98)_35%,_#d8d8d8_100%)] px-[10px] pb-[88px] pt-[8px] shadow-[0_18px_40px_rgba(0,0,0,0.08)]">
      <header className="flex h-[40px] items-center justify-between rounded-[14px] bg-white/82 px-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm">
        <div className="flex items-center gap-3 text-[#a3a3a3]">
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.push("/")}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#2e2e2e]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M9.75 3.5L5.25 8L9.75 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex items-center gap-[5px] text-[12px] font-medium tracking-[-0.02em] text-[#9a9a9a]">
            <GridIcon />
            <span>Assignment</span>
          </div>
        </div>

        <div className="flex items-center gap-5 text-[#2d2d2d]">
          <button type="button" aria-label="Notifications" className="relative flex h-5 w-5 items-center justify-center">
            <BellIcon />
            <span className="absolute -right-[1px] top-0 h-[6px] w-[6px] rounded-full bg-[#ff5c2d]" />
          </button>

          <button type="button" className="flex items-center gap-[10px] text-[13px] font-medium">
            <span className="flex h-[25px] w-[25px] items-center justify-center overflow-hidden rounded-full bg-[#f4d9be] text-[14px]">
              {(user?.name || "U").slice(0, 1).toUpperCase()}
            </span>
            <span>{user?.name || "User"}</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 pt-6 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-[102px] animate-pulse rounded-[18px] bg-white/75 shadow-[0_10px_24px_rgba(0,0,0,0.06)]" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
          <EmptyState onCreate={() => router.push("/create")} />
        </div>
      ) : (
        <div className="pt-[14px]">
          <div className="flex items-center gap-[8px]">
            <span className="h-[10px] w-[10px] rounded-full bg-[#60d98a] shadow-[0_0_0_3px_rgba(96,217,138,0.16)]" />
            <div>
              <h1 className="text-[15px] font-semibold leading-none text-[#2a2a2a]">Assignments</h1>
              <p className="mt-[4px] text-[11px] leading-none text-[#adadad]">
                Manage and create assignments for your classes.
              </p>
            </div>
          </div>

          <div className="mt-[14px] flex flex-col gap-3 rounded-[16px] bg-[#f7f7f7]/90 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] md:flex-row md:items-center md:justify-between">
            <button type="button" className="flex h-[32px] items-center gap-[7px] rounded-full border border-[#ececec] bg-white px-3 text-[12px] text-[#7c7c7c]">
              <FilterIcon />
              Filter By
            </button>

            <label className="flex h-[34px] w-full items-center gap-2 rounded-full border border-[#d8d8d8] bg-white px-4 md:max-w-[242px]">
              <SearchIcon />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Assignment"
                className="w-full border-none bg-transparent text-[12px] text-[#363636] outline-none placeholder:text-[#a7a7a7]"
              />
            </label>
          </div>

          <div ref={menuContainerRef} className="mt-3">
            <AssignmentGrid
              assignments={filteredAssignments}
              openMenuId={openMenuId}
              onToggleMenu={setOpenMenuId}
              onDelete={handleDelete}
              formatDate={formatDisplayDate}
            />
          </div>
        </div>
      )}

      {assignments.length > 0 ? (
        <FloatingButton label="Create Assignment" onClick={() => router.push("/create")} />
      ) : null}
    </section>
  );
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.75" y="1.75" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
      <rect x="8.25" y="1.75" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
      <rect x="1.75" y="8.25" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
      <rect x="8.25" y="8.25" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3.25C7.92893 3.25 6.25 4.92893 6.25 7V8.81258C6.25 9.5667 5.95662 10.2912 5.43198 10.8352L4.75 11.5427V12.25H15.25V11.5427L14.568 10.8352C14.0434 10.2912 13.75 9.5667 13.75 8.81258V7C13.75 4.92893 12.0711 3.25 10 3.25Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8.25 14.25C8.47009 14.876 9.07006 15.325 9.775 15.325H10.225C10.9299 15.325 11.5299 14.876 11.75 14.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4.167 5H15.833L11.667 9.792V14.167L8.333 15V9.792L4.167 5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.75" cy="8.75" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12.5 12.5L16.25 16.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
