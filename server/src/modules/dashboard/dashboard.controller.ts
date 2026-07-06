import { Response } from "express";
import { WorkspaceModel } from "../workspaces/workspace.model";
import { DocumentModel } from "../documents/document.model";
import { ChatModel } from "../chat/chat.model";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";

export async function statsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const ownerId = req.user!.userId;

  const workspaces = await WorkspaceModel.find({ ownerId }).select("_id");
  const workspaceIds = workspaces.map((w) => w._id);

  const [totalWorkspaces, totalDocuments, chatStats] = await Promise.all([
    Promise.resolve(workspaces.length),
    DocumentModel.countDocuments({ workspaceId: { $in: workspaceIds } }),
    ChatModel.aggregate([
      { $match: { workspaceId: { $in: workspaceIds } } },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          avgResponseTimeMs: { $avg: "$responseTimeMs" }
        }
      }
    ])
  ]);

  const totalQuestions = chatStats[0]?.totalQuestions ?? 0;
  const avgResponseTimeMs = Math.round(chatStats[0]?.avgResponseTimeMs ?? 0);

  res.status(200).json({
    totalWorkspaces,
    totalDocuments,
    totalQuestions,
    avgResponseTimeMs
  });
}
