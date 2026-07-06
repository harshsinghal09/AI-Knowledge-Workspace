import { Request, Response } from "express";
import * as authService from "./auth.service";
import { signupSchema, loginSchema } from "./auth.validation";
import { AppError } from "../../utils/AppError";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000
};

export async function signupHandler(req: Request, res: Response): Promise<void> {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const { email, password } = parsed.data;
  const { accessToken, refreshToken } = await authService.signup(email, password);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(201).json({ accessToken });
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const { email, password } = parsed.data;
  const { accessToken, refreshToken } = await authService.login(email, password);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({ accessToken });
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    throw new AppError("No refresh token provided", 401);
  }

  const { accessToken, refreshToken } = await authService.refresh(token);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({ accessToken });
}

export async function logoutHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (req.user) {
    await authService.logout(req.user.userId);
  }
  res.clearCookie(REFRESH_COOKIE_NAME);
  res.status(204).send();
}
