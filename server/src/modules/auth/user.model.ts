import mongoose, { Schema, Document } from "mongoose";

export interface UserDocument extends Document {
  email: string;
  passwordHash: string;
  refreshTokenHash: string | null;
  createdAt: Date;
}

const userSchema = new Schema<UserDocument>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  refreshTokenHash: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

export const UserModel = mongoose.model<UserDocument>("User", userSchema);
