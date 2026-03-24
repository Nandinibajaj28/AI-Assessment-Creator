import axios from "axios";
import { CreateAssignmentPayload, DashboardAssignment } from "@/types/assignment";
import { AuthResponse } from "@/types/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { useAssignmentStore } from "@/store/useAssignmentStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

type CreateAssignmentResponse = {
  id: string;
  message: string;
};

type RawAssignment = {
  _id?: string;
  id?: string | number;
  title?: string;
  name?: string;
  assignedOn?: string;
  assigned_at?: string;
  createdAt?: string;
  dueDate?: string;
  due_date?: string;
  dueAt?: string;
  status?: string;
  subjectName?: string;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token =
    useAuthStore.getState().token ||
    (typeof window !== "undefined" ? window.localStorage.getItem("veda-auth-token") : null);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      useAuthStore.getState().clearAuth();
      useAssignmentStore.getState().resetAssignments();
      window.localStorage.removeItem("veda-auth-token");

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

function normalizeAssignment(item: RawAssignment, index: number): DashboardAssignment {
  const subjectName = item.subjectName?.trim();

  return {
    id: String(item._id ?? item.id ?? index),
    title: item.title?.trim() || item.name?.trim() || (subjectName ? `Quiz on ${subjectName}` : "Quiz on Electricity"),
    assignedOn: item.assignedOn ?? item.assigned_at ?? item.createdAt ?? "",
    dueDate: item.dueDate ?? item.due_date ?? item.dueAt ?? "",
    status: item.status,
  };
}

export async function getAssignments(): Promise<DashboardAssignment[]> {
  const response = await api.get("/api/assignment");
  const payload = response.data;
  const records = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];

  return records.map(normalizeAssignment);
}

export async function createAssignment(
  payload: CreateAssignmentPayload
): Promise<CreateAssignmentResponse> {
  const response = await api.post<CreateAssignmentResponse>("/api/assignment", payload);

  return response.data;
}

export async function deleteAssignment(id: string) {
  await api.delete(`/api/assignment/${id}`);
}

export async function regenerateAssignment(id: string): Promise<CreateAssignmentResponse> {
  const response = await api.post<CreateAssignmentResponse>(`/api/assignment/${id}/regenerate`);

  return response.data;
}

export async function getAssignment(id: string): Promise<any> {
  const response = await api.get(`/api/assignment/${id}`);
  return response.data;
}

export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/api/auth/login", payload);
  return response.data;
}

export async function signup(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/api/auth/signup", payload);
  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get<{ user: AuthResponse["user"] }>("/api/auth/me");
  return response.data.user;
}
