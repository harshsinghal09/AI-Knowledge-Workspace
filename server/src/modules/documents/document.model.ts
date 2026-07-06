import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export type DocumentStatus = "processing" | "ready" | "failed";

export interface DocumentRecord extends MongooseDocument {
  workspaceId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  storedPath: string;
  size: number;
  mimeType: string;
  status: DocumentStatus;
  errorMessage: string | null;
  uploadedAt: Date;
  readyAt: Date | null;
}

const documentSchema = new Schema<DocumentRecord>({
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  storedPath: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true },
  status: { type: String, enum: ["processing", "ready", "failed"], default: "processing", index: true },
  errorMessage: { type: String, default: null },
  uploadedAt: { type: Date, default: Date.now },
  readyAt: { type: Date, default: null }
});

export const DocumentModel = mongoose.model<DocumentRecord>("Document", documentSchema);
