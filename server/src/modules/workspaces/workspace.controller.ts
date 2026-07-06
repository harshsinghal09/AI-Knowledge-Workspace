import { Response } from "express";
import { z } from "zod";
import * as workspaceService from "./workspace.service";
import { AppError } from "../../utils/AppError";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";

const createWorkspaceSchema = z.object({ name: z.string().min(1).max(100) });

export async function createHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = createWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const workspace = await workspaceService.createWorkspace(req.user!.userId, parsed.data.name);
  res.status(201).json(workspace);
}

export async function listHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const workspaces = await workspaceService.listWorkspaces(req.user!.userId);
  res.status(200).json(workspaces);
}

export async function getHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const workspace = await workspaceService.getWorkspaceOrThrow(req.params.id, req.user!.userId);
  res.status(200).json(workspace);
}

export async function deleteHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  await workspaceService.deleteWorkspace(req.params.id, req.user!.userId);
  res.status(204).send();
}
