import crypto from "crypto"
import { ChatModel, ChatDocument } from "./chat.model";
import { AppError } from "../../utils/AppError";
import { hasReadyDocuments } from "../documents/document.service";
import { queryWorkspace } from "../../services/pythonClient";
import { cacheGet, cacheSet } from "../../config/redis";

function cacheKeyFor(workspaceId: string, question: string): string {
  const hash = crypto.createHash("sha256").update(question.trim().toLowerCase()).digest("hex");
  return `chat:${workspaceId}:${hash}`;
}

export async function askQuestion(
  workspaceId: string,
  userId: string,
  question: string
): Promise<ChatDocument> {
  const ready = await hasReadyDocuments(workspaceId);
  if (!ready) {
    throw new AppError(
      "No documents in this workspace are ready yet. Wait for indexing to complete before asking questions.",
      409
    );
  }

  const cacheKey = cacheKeyFor(workspaceId, question);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    return ChatModel.create({
      workspaceId,
      userId,
      question,
      answer: parsed.answer,
      citations: parsed.citations,
      responseTimeMs: 0
    });
  }

  const start = Date.now();
  const result = await queryWorkspace({ workspaceId, question });
  const responseTimeMs = Date.now() - start;

  await cacheSet(cacheKey, JSON.stringify(result), 600);

  return ChatModel.create({
    workspaceId,
    userId,
    question,
    answer: result.answer,
    citations: result.citations,
    responseTimeMs
  });
}

export async function getChatHistory(workspaceId: string): Promise<ChatDocument[]> {
  return ChatModel.find({ workspaceId }).sort({ createdAt: -1 }).limit(100);
}
