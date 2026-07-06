import fs from "fs";
import { WorkspaceModel, WorkspaceDocument } from "./workspace.model";
import { DocumentModel } from "../documents/document.model";
import { ChatModel } from "../chat/chat.model";
import { deleteChunksForWorkspace } from "../documents/document.service";
import { AppError } from "../../utils/AppError";

export async function createWorkspace(ownerId: string, name: string): Promise<WorkspaceDocument> {
  return WorkspaceModel.create({ ownerId, name });
}

export async function listWorkspaces(ownerId: string): Promise<WorkspaceDocument[]> {
  return WorkspaceModel.find({ ownerId }).sort({ createdAt: -1 });
}

export async function getWorkspaceOrThrow(id: string, ownerId: string): Promise<WorkspaceDocument> {
  const workspace = await WorkspaceModel.findOne({ _id: id, ownerId });
  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }
  return workspace;
}

/**
 * Cascades the delete: a workspace's documents (metadata, files on disk, and
 * their indexed vector chunks) and chat history are all scoped to it, so
 * leaving them behind after the workspace itself is gone would strand
 * unreachable data indefinitely.
 */
export async function deleteWorkspace(id: string, ownerId: string): Promise<void> {
  const workspace = await WorkspaceModel.findOne({ _id: id, ownerId });
  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }

  const documents = await DocumentModel.find({ workspaceId: id });
  for (const doc of documents) {
    if (fs.existsSync(doc.storedPath)) {
      fs.unlinkSync(doc.storedPath);
    }
  }

  await Promise.all([
    DocumentModel.deleteMany({ workspaceId: id }),
    ChatModel.deleteMany({ workspaceId: id }),
    deleteChunksForWorkspace(id),
    WorkspaceModel.deleteOne({ _id: id, ownerId })
  ]);
}
