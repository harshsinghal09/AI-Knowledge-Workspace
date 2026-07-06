import { apiRequest } from "./client";

export interface Workspace {
  _id: string;
  name: string;
  createdAt: string;
}

export function listWorkspaces(): Promise<Workspace[]> {
  return apiRequest<Workspace[]>("/workspaces");
}

export function createWorkspace(name: string): Promise<Workspace> {
  return apiRequest<Workspace>("/workspaces", { method: "POST", body: { name } });
}

export function getWorkspace(id: string): Promise<Workspace> {
  return apiRequest<Workspace>(`/workspaces/${id}`);
}

export function deleteWorkspace(id: string): Promise<void> {
  return apiRequest<void>(`/workspaces/${id}`, { method: "DELETE" });
}
