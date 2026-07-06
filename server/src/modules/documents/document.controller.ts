import { Response } from "express";
import fs from "fs";
import { DocumentModel } from "./document.model";
import * as documentService from "./document.service";
import { AppError } from "../../utils/AppError";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { getWorkspaceOrThrow } from "../workspaces/workspace.service";
import { env } from "../../config/env";

export async function uploadHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      throw new AppError("workspaceId is required", 400);
    }
    if (!req.file) {
      throw new AppError("No file uploaded", 400);
    }
    if (req.file.size === 0) {
      throw new AppError("Uploaded file is empty", 400);
    }

    // Ensures the workspace exists and belongs to this user before accepting the file.
    await getWorkspaceOrThrow(workspaceId, req.user!.userId);

    const doc = await documentService.createDocument({
      workspaceId,
      ownerId: req.user!.userId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      storedPath: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype
    });

    res.status(202).json({
      message: "Document accepted. Indexing in progress.",
      document: doc
    });
  } catch (err) {
    // Multer has already written the file to disk by the time this handler runs,
    // so any failure past that point (missing workspaceId, unauthorized workspace,
    // empty file, DB error) must clean up the orphaned file before rethrowing.
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    throw err;
  }
}

export async function listHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { workspaceId } = req.query;
  if (!workspaceId || typeof workspaceId !== "string") {
    throw new AppError("workspaceId query parameter is required", 400);
  }

  await getWorkspaceOrThrow(workspaceId, req.user!.userId);
  const docs = await documentService.listDocuments(workspaceId, req.user!.userId);
  res.status(200).json(docs);
}

export async function statusHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const doc = await documentService.getDocumentOrThrow(req.params.id, req.user!.userId);
  res.status(200).json({
    id: doc.id,
    status: doc.status,
    errorMessage: doc.errorMessage,
    readyAt: doc.readyAt
  });
}

export async function deleteHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const doc = await documentService.getDocumentOrThrow(req.params.id, req.user!.userId);
  await documentService.deleteDocument(req.params.id, req.user!.userId);

  if (fs.existsSync(doc.storedPath)) {
    fs.unlinkSync(doc.storedPath);
  }

  res.status(204).send();
}

/**
 * Internal callback used ONLY by the Python AI service (same Docker network)
 * to report indexing completion or failure. Not exposed to the browser client.
 */
export async function indexCallbackHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const internalSecret = req.headers["x-internal-secret"];
  if (internalSecret !== env.internalServiceSecret) {
    throw new AppError("Forbidden", 403);
  }

  const { documentId, status, errorMessage } = req.body;
  if (!documentId || !["ready", "failed"].includes(status)) {
    throw new AppError("Invalid callback payload", 400);
  }

  const doc = await DocumentModel.findById(documentId);
  if (!doc) {
    throw new AppError("Document not found", 404);
  }

  await documentService.updateStatus(documentId, status, errorMessage);
  res.status(200).json({ acknowledged: true });
}
