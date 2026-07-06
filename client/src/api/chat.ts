import { apiRequest } from "./client";

export interface Citation {
  documentId: string;
  filename: string;
  chunkId: string;
  pageNumber: number | null;
  excerpt: string;
}

export interface ChatMessage {
  _id: string;
  workspaceId: string;
  question: string;
  answer: string;
  citations: Citation[];
  responseTimeMs: number;
  createdAt: string;
}

export function askQuestion(workspaceId: string, question: string): Promise<ChatMessage> {
  return apiRequest<ChatMessage>("/chat", { method: "POST", body: { workspaceId, question } });
}

export function getChatHistory(workspaceId: string): Promise<ChatMessage[]> {
  return apiRequest<ChatMessage[]>(`/chat?workspaceId=${workspaceId}`);
}
