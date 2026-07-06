import { Response } from "express";
import { z } from "zod";
import * as chatService from "./chat.service";
import { AppError } from "../../utils/AppError";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { getWorkspaceOrThrow } from "../workspaces/workspace.service";

const askSchema = z.object({
  workspaceId: z.string().min(1),
  question: z.string().min(1).max(2000)
});

export async function askHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const { workspaceId, question } = parsed.data;
  await getWorkspaceOrThrow(workspaceId, req.user!.userId);

  const chat = await chatService.askQuestion(workspaceId, req.user!.userId, question);
  res.status(200).json(chat);
}

export async function historyHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { workspaceId } = req.query;
  if (!workspaceId || typeof workspaceId !== "string") {
    throw new AppError("workspaceId query parameter is required", 400);
  }

  await getWorkspaceOrThrow(workspaceId, req.user!.userId);
  const history = await chatService.getChatHistory(workspaceId);
  res.status(200).json(history);
}
