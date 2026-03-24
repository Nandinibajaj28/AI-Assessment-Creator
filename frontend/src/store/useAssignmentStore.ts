"use client";

import { create } from "zustand";
import { AssignmentResult, DashboardAssignment } from "@/types/assignment";

type AssignmentState = {
  assignmentId: string | null;
  result: AssignmentResult | null;
  assignments: DashboardAssignment[];
  schoolName: string;
  subjectName: string;
  className: string;
  timeAllowed: string;
  setAssignmentId: (id: string | null) => void;
  setResult: (result: AssignmentResult | null) => void;
  setAssignments: (assignments: DashboardAssignment[]) => void;
  addAssignment: (assignment: DashboardAssignment) => void;
  removeAssignment: (id: string) => void;
  resetAssignments: () => void;
  setHeader: (header: { schoolName: string; subjectName: string; className: string; timeAllowed: string }) => void;
};

export const useAssignmentStore = create<AssignmentState>((set) => ({
  assignmentId: null,
  result: null,
  assignments: [],
  schoolName: "",
  subjectName: "",
  className: "",
  timeAllowed: "",
  setAssignmentId: (id) => set({ assignmentId: id }),
  setResult: (result) => set({ result }),
  setAssignments: (assignments) => set({ assignments }),
  addAssignment: (assignment) =>
    set((state) => ({
      assignments: state.assignments.some((item) => item.id === assignment.id)
        ? state.assignments
        : [assignment, ...state.assignments],
    })),
  removeAssignment: (id) =>
    set((state) => ({
      assignments: state.assignments.filter((assignment) => assignment.id !== id),
    })),
  resetAssignments: () =>
    set({
      assignmentId: null,
      result: null,
      assignments: [],
      schoolName: "",
      subjectName: "",
      className: "",
      timeAllowed: "",
    }),
  setHeader: (header) => set({ ...header }),
}));
