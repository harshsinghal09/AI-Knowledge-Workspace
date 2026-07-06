import mongoose, { Schema, Document } from "mongoose";

export interface WorkspaceDocument extends Document {
  name: string;
  ownerId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const workspaceSchema = new Schema<WorkspaceDocument>({
  name: { type: String, required: true, trim: true },
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

export const WorkspaceModel = mongoose.model<WorkspaceDocument>("Workspace", workspaceSchema);
