import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { env } from "../config/env";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: `File exceeds the ${env.maxUploadSizeMb}MB upload limit` });
      return;
    }
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}: ${err.stack ?? err.message}`);
  res.status(500).json({ error: "Internal server error" });
}
