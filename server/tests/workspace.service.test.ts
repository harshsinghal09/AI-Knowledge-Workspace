import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as workspaceService from "../src/modules/workspaces/workspace.service";
import { WorkspaceModel } from "../src/modules/workspaces/workspace.model";
import { DocumentModel } from "../src/modules/documents/document.model";
import { ChatModel } from "../src/modules/chat/chat.model";

let mongod: MongoMemoryServer;
const ownerId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await WorkspaceModel.deleteMany({});
  await DocumentModel.deleteMany({});
  await ChatModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("workspace.service", () => {
  it("creates and lists workspaces scoped to an owner", async () => {
    await workspaceService.createWorkspace(ownerId, "College");
    await workspaceService.createWorkspace(ownerId, "Placement");
    const otherOwner = new mongoose.Types.ObjectId().toString();
    await workspaceService.createWorkspace(otherOwner, "Not Mine");

    const list = await workspaceService.listWorkspaces(ownerId);
    expect(list).toHaveLength(2);
    expect(list.map((w) => w.name).sort()).toEqual(["College", "Placement"]);
  });

  it("throws when accessing a workspace owned by someone else", async () => {
    const workspace = await workspaceService.createWorkspace(ownerId, "Research");
    const otherOwner = new mongoose.Types.ObjectId().toString();
    await expect(workspaceService.getWorkspaceOrThrow(workspace.id, otherOwner)).rejects.toThrow(
      "Workspace not found"
    );
  });

  it("cascades delete to documents and chat history", async () => {
    const workspace = await workspaceService.createWorkspace(ownerId, "Cascade Test");

    await DocumentModel.create({
      workspaceId: workspace.id,
      ownerId,
      filename: "abc.pdf",
      originalName: "abc.pdf",
      storedPath: "/tmp/nonexistent-file-for-test.pdf",
      size: 100,
      mimeType: "application/pdf",
      status: "ready"
    });

    await ChatModel.create({
      workspaceId: workspace.id,
      userId: ownerId,
      question: "What is this?",
      answer: "Some answer",
      citations: [],
      responseTimeMs: 10
    });

    await workspaceService.deleteWorkspace(workspace.id, ownerId);

    const remainingDocs = await DocumentModel.countDocuments({ workspaceId: workspace.id });
    const remainingChats = await ChatModel.countDocuments({ workspaceId: workspace.id });
    const remainingWorkspace = await WorkspaceModel.findById(workspace.id);

    expect(remainingDocs).toBe(0);
    expect(remainingChats).toBe(0);
    expect(remainingWorkspace).toBeNull();
  });
});
