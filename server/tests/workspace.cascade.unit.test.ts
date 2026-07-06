/**
 * Unit-level test for the cascade-delete logic in workspace.service.ts.
 * Uses mocked models instead of a live MongoDB connection so it can run
 * without network access to download a mongod binary (see the integration
 * tests in workspace.service.test.ts for the full-stack version).
 */

jest.mock("../src/modules/workspaces/workspace.model", () => ({
  WorkspaceModel: {
    findOne: jest.fn(),
    deleteOne: jest.fn()
  }
}));

jest.mock("../src/modules/documents/document.model", () => ({
  DocumentModel: {
    find: jest.fn(),
    deleteMany: jest.fn()
  }
}));

jest.mock("../src/modules/chat/chat.model", () => ({
  ChatModel: {
    deleteMany: jest.fn()
  }
}));

jest.mock("../src/modules/documents/document.service", () => ({
  deleteChunksForWorkspace: jest.fn()
}));

jest.mock("fs", () => ({
  existsSync: jest.fn().mockReturnValue(false),
  unlinkSync: jest.fn()
}));

import { WorkspaceModel } from "../src/modules/workspaces/workspace.model";
import { DocumentModel } from "../src/modules/documents/document.model";
import { ChatModel } from "../src/modules/chat/chat.model";
import { deleteChunksForWorkspace } from "../src/modules/documents/document.service";
import fs from "fs";
import * as workspaceService from "../src/modules/workspaces/workspace.service";

describe("workspace.service deleteWorkspace (mocked, no DB needed)", () => {
  const workspaceId = "ws1";
  const ownerId = "owner1";

  beforeEach(() => {
    jest.clearAllMocks();
    (WorkspaceModel.findOne as jest.Mock).mockResolvedValue({ _id: workspaceId, ownerId });
    (DocumentModel.find as jest.Mock).mockResolvedValue([
      { storedPath: "/tmp/a.pdf" },
      { storedPath: "/tmp/b.pdf" }
    ]);
    (DocumentModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 2 });
    (ChatModel.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 3 });
    (deleteChunksForWorkspace as jest.Mock).mockResolvedValue(undefined);
    (WorkspaceModel.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });
  });

  it("throws 404 if the workspace doesn't exist or isn't owned by the caller", async () => {
    (WorkspaceModel.findOne as jest.Mock).mockResolvedValue(null);
    await expect(workspaceService.deleteWorkspace(workspaceId, ownerId)).rejects.toThrow(
      "Workspace not found"
    );
    expect(DocumentModel.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes documents, chats, vector chunks, and the workspace itself", async () => {
    await workspaceService.deleteWorkspace(workspaceId, ownerId);

    expect(DocumentModel.find).toHaveBeenCalledWith({ workspaceId });
    expect(DocumentModel.deleteMany).toHaveBeenCalledWith({ workspaceId });
    expect(ChatModel.deleteMany).toHaveBeenCalledWith({ workspaceId });
    expect(deleteChunksForWorkspace).toHaveBeenCalledWith(workspaceId);
    expect(WorkspaceModel.deleteOne).toHaveBeenCalledWith({ _id: workspaceId, ownerId });
  });

  it("removes each document's file from disk when it exists", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    await workspaceService.deleteWorkspace(workspaceId, ownerId);

    expect(fs.unlinkSync).toHaveBeenCalledWith("/tmp/a.pdf");
    expect(fs.unlinkSync).toHaveBeenCalledWith("/tmp/b.pdf");
    expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
  });

  it("skips unlinking files that no longer exist on disk", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await workspaceService.deleteWorkspace(workspaceId, ownerId);

    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});
