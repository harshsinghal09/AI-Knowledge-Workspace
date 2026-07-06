import fetch from "node-fetch";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export interface IndexDocumentRequest {
  documentId: string;
  workspaceId: string;
  filePath: string;
  mimeType: string;
}

export interface QueryRequest {
  workspaceId: string;
  question: string;
}

export interface QueryCitation {
  documentId: string;
  filename: string;
  chunkId: string;
  pageNumber: number | null;
  excerpt: string;
}

export interface QueryResponse {
  answer: string;
  citations: QueryCitation[];
}

const TIMEOUT_MS = 30000;

async function postJson<T>(path: string, body: unknown, timeoutMs = TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${env.pythonAiUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal as any
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Python AI service responded ${response.status}: ${text}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fire-and-forget trigger: Node does NOT await indexing completion.
 * The Python service acknowledges receipt immediately and indexes in the background.
 */
export async function triggerIndexing(req: IndexDocumentRequest): Promise<void> {
  try {
    await postJson<{ accepted: boolean }>("/index-document", req, 5000);
  } catch (err) {
    // If we can't even reach the AI service, mark this synchronously so the
    // frontend doesn't poll a document stuck in "processing" forever.
    logger.error(`Failed to trigger indexing for document ${req.documentId}: ${(err as Error).message}`);
    throw err;
  }
}

export async function queryWorkspace(req: QueryRequest): Promise<QueryResponse> {
  return postJson<QueryResponse>("/query", req, TIMEOUT_MS);
}

export async function checkPythonHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${env.pythonAiUrl}/health`, { signal: controller.signal as any });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}
