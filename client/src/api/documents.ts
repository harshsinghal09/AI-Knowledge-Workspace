import { apiRequest, apiUpload } from "./client";

export type DocumentStatus = "processing" | "ready" | "failed";

export interface WorkspaceDocument {
  _id: string;
  workspaceId: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  status: DocumentStatus;
  errorMessage: string | null;
  uploadedAt: string;
  readyAt: string | null;
}

export function listDocuments(workspaceId: string): Promise<WorkspaceDocument[]> {
  return apiRequest<WorkspaceDocument[]>(`/documents?workspaceId=${workspaceId}`);
}

export async function uploadDocument(workspaceId: string, file: File): Promise<{ document: WorkspaceDocument }> {
  const formData = new FormData();
  formData.append("workspaceId", workspaceId);
  formData.append("file", file);
  return apiUpload(`/documents`, formData);
}

export function getDocumentStatus(id: string): Promise<{ id: string; status: DocumentStatus; errorMessage: string | null }> {
  return apiRequest(`/documents/${id}/status`);
}

export function deleteDocument(id: string): Promise<void> {
  return apiRequest<void>(`/documents/${id}`, { method: "DELETE" });
}
