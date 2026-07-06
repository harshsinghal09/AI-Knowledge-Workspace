import bcrypt from "bcryptjs";
import { UserModel } from "./user.model";
import { AppError } from "../../utils/AppError";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";

const SALT_ROUNDS = 10;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function signup(email: string, password: string): Promise<AuthTokens> {
  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError("An account with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await UserModel.create({ email: email.toLowerCase(), passwordHash });

  return issueTokens(user.id, user.email);
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError("Invalid email or password", 401);
  }

  return issueTokens(user.id, user.email);
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Refresh token expired or invalid", 401);
  }

  const user = await UserModel.findById(payload.userId);
  if (!user || !user.refreshTokenHash) {
    throw new AppError("Refresh token has been revoked", 401);
  }

  const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!matches) {
    // Possible token reuse/leak: invalidate the stored token defensively.
    user.refreshTokenHash = null;
    await user.save();
    throw new AppError("Refresh token has been revoked", 401);
  }

  // Rotate: issue a brand new pair, invalidate the old one.
  return issueTokens(user.id, user.email);
}

export async function logout(userId: string): Promise<void> {
  await UserModel.findByIdAndUpdate(userId, { refreshTokenHash: null });
}

async function issueTokens(userId: string, email: string): Promise<AuthTokens> {
  const accessToken = signAccessToken({ userId, email });
  const refreshToken = signRefreshToken({ userId, email });

  const refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  await UserModel.findByIdAndUpdate(userId, { refreshTokenHash });

  return { accessToken, refreshToken };
}
