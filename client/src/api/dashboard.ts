import { apiRequest } from "./client";

export interface DashboardStats {
  totalWorkspaces: number;
  totalDocuments: number;
  totalQuestions: number;
  avgResponseTimeMs: number;
}

export function getDashboardStats(): Promise<DashboardStats> {
  return apiRequest<DashboardStats>("/dashboard/stats");
}
