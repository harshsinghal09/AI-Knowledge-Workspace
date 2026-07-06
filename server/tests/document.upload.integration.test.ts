/**
 * Verifies the orphaned-file cleanup fix in document.controller.ts: Multer
 * writes the file to disk BEFORE the handler runs, so any failure after that
 * point (missing workspaceId, unauthorized workspace, empty file) must clean
 * up the file it already wrote. Uses real Express + real disk I/O, with the
 * DB-touching services mocked so no live MongoDB connection is required.
 */

jest.mock("../src/modules/workspaces/workspace.service", () => ({
  getWorkspaceOrThrow: jest.fn()
}));

jest.mock("../src/modules/documents/document.service", () => ({
  createDocument: jest.fn()
}));

import express from "express";
import request from "supertest";
import fs from "fs";
import path from "path";
import "express-async-errors";
import { errorHandler } from "../src/middleware/error.middleware";
import { uploadDocument } from "../src/middleware/upload.middleware";
import { uploadHandler } from "../src/modules/documents/document.controller";
import { getWorkspaceOrThrow } from "../src/modules/workspaces/workspace.service";
import { createDocument } from "../src/modules/documents/document.service";
import { AppError } from "../src/utils/AppError";

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

function buildApp() {
  const app = express();
  app.use((req: any, _res, next) => {
    req.user = { userId: "user1", email: "user1@example.com" };
    next();
  });
  app.post("/documents", uploadDocument, uploadHandler);
  app.use(errorHandler);
  return app;
}

function filesInUploadDir(): string[] {
  return fs.readdirSync(UPLOAD_DIR).filter((f) => f !== ".gitkeep");
}

describe("document upload — orphaned file cleanup", () => {
  afterEach(() => {
    jest.clearAllMocks();
    for (const f of filesInUploadDir()) {
      fs.unlinkSync(path.join(UPLOAD_DIR, f));
    }
  });

  it("deletes the saved file when the workspace is not owned by the caller", async () => {
    (getWorkspaceOrThrow as jest.Mock).mockRejectedValue(new AppError("Workspace not found", 404));

    const res = await request(buildApp())
      .post("/documents")
      .field("workspaceId", "someone-elses-workspace")
      .attach("file", Buffer.from("hello world"), "notes.txt");

    expect(res.status).toBe(404);
    expect(filesInUploadDir()).toHaveLength(0); // no orphaned file left behind
    expect(createDocument).not.toHaveBeenCalled();
  });

  it("deletes the saved file when workspaceId is missing from the form body", async () => {
    const res = await request(buildApp())
      .post("/documents")
      .attach("file", Buffer.from("hello world"), "notes.txt");

    expect(res.status).toBe(400);
    expect(filesInUploadDir()).toHaveLength(0);
  });

  it("deletes the saved file when it is empty", async () => {
    (getWorkspaceOrThrow as jest.Mock).mockResolvedValue({ id: "ws1" });

    const res = await request(buildApp())
      .post("/documents")
      .field("workspaceId", "ws1")
      .attach("file", Buffer.from(""), "empty.txt");

    expect(res.status).toBe(400);
    expect(filesInUploadDir()).toHaveLength(0);
  });

  it("keeps the file and creates a document record on success", async () => {
    (getWorkspaceOrThrow as jest.Mock).mockResolvedValue({ id: "ws1" });
    (createDocument as jest.Mock).mockResolvedValue({ id: "doc1", status: "processing" });

    const res = await request(buildApp())
      .post("/documents")
      .field("workspaceId", "ws1")
      .attach("file", Buffer.from("real content here"), "notes.txt");

    expect(res.status).toBe(202);
    expect(filesInUploadDir()).toHaveLength(1); // file kept — createDocument owns cleanup on later failures
    expect(createDocument).toHaveBeenCalledTimes(1);
  });
});
