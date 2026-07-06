import mongoose from "mongoose";
import { DocumentModel, DocumentRecord, DocumentStatus } from "./document.model";
import { AppError } from "../../utils/AppError";
import { triggerIndexing } from "../../services/pythonClient";
import { logger } from "../../utils/logger";

export interface CreateDocumentInput {
  workspaceId: string;
  ownerId: string;
  filename: string;
  originalName: string;
  storedPath: string;
  size: number;
  mimeType: string;
}

export async function createDocument(input: CreateDocumentInput): Promise<DocumentRecord> {
  const doc = await DocumentModel.create({ ...input, status: "processing" });

  // Fire-and-forget: we do not block the HTTP response on indexing completion.
  triggerIndexing({
    documentId: doc.id,
    workspaceId: input.workspaceId,
    filePath: input.storedPath,
    mimeType: input.mimeType
    originalName: input.originalName
  }).catch(async (err) => {
    logger.error(`Indexing trigger failed for ${doc.id}: ${err.message}`);
    await DocumentModel.findByIdAndUpdate(doc.id, {
      status: "failed",
      errorMessage: "Could not reach the AI indexing service"
    });
  });

  return doc;
}

export async function listDocuments(workspaceId: string, ownerId: string): Promise<DocumentRecord[]> {
  return DocumentModel.find({ workspaceId, ownerId }).sort({ uploadedAt: -1 });
}

export async function getDocumentOrThrow(id: string, ownerId: string): Promise<DocumentRecord> {
  const doc = await DocumentModel.findOne({ _id: id, ownerId });
  if (!doc) {
    throw new AppError("Document not found", 404);
  }
  return doc;
}

export async function updateStatus(
  id: string,
  status: DocumentStatus,
  errorMessage?: string
): Promise<void> {
  await DocumentModel.findByIdAndUpdate(id, {
    status,
    errorMessage: errorMessage ?? null,
    readyAt: status === "ready" ? new Date() : null
  });
}

/**
 * `document_chunks` is populated and queried by the Python service, but it lives
 * in the same MongoDB instance Node already connects to. Deleting the rows tied
 * to a document that Node is deleting is lifecycle cleanup (same category as
 * deleting the file from disk below) rather than RAG logic, so Node performing
 * it directly here avoids adding a new Python-side deletion endpoint for a
 * single housekeeping operation.
 */
async function deleteChunksForDocument(documentId: string): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;
  await db.collection("document_chunks").deleteMany({ documentId });
}

async function deleteChunksForWorkspace(workspaceId: string): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;
  await db.collection("document_chunks").deleteMany({ workspaceId });
}

export async function deleteDocument(id: string, ownerId: string): Promise<void> {
  const result = await DocumentModel.deleteOne({ _id: id, ownerId });
  if (result.deletedCount === 0) {
    throw new AppError("Document not found", 404);
  }
  await deleteChunksForDocument(id);
}

export async function hasReadyDocuments(workspaceId: string): Promise<boolean> {
  const count = await DocumentModel.countDocuments({ workspaceId, status: "ready" });
  return count > 0;
}

export { deleteChunksForWorkspace };
