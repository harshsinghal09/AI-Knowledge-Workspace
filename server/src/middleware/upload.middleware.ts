import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "text/plain"
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

function fileFilter(_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  const extAllowed = /\.(pdf|docx|md|txt)$/i.test(file.originalname);
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) && !extAllowed) {
    cb(new AppError("Unsupported file type. Allowed: pdf, docx, md, txt", 400));
    return;
  }
  cb(null, true);
}

export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024 }
}).single("file");

export const UPLOAD_DIR_PATH = UPLOAD_DIR;
