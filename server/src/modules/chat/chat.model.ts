import mongoose, { Schema, Document } from "mongoose";

export interface CitationSubdoc {
  documentId: string;
  filename: string;
  chunkId: string;
  pageNumber: number | null;
  excerpt: string;
}

export interface ChatDocument extends Document {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  question: string;
  answer: string;
  citations: CitationSubdoc[];
  responseTimeMs: number;
  createdAt: Date;
}

const citationSchema = new Schema<CitationSubdoc>(
  {
    documentId: { type: String, required: true },
    filename: { type: String, required: true },
    chunkId: { type: String, required: true },
    pageNumber: { type: Number, default: null },
    excerpt: { type: String, required: true }
  },
  { _id: false }
);

const chatSchema = new Schema<ChatDocument>({
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  citations: { type: [citationSchema], default: [] },
  responseTimeMs: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

export const ChatModel = mongoose.model<ChatDocument>("Chat", chatSchema);
