import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import "express-async-errors";

import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { checkPythonHealth } from "./services/pythonClient";

import authRoutes from "./modules/auth/auth.routes";
import workspaceRoutes from "./modules/workspaces/workspace.routes";
import documentRoutes from "./modules/documents/document.routes";
import chatRoutes from "./modules/chat/chat.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  if (env.nodeEnv !== "test") {
    app.use(morgan("dev"));
  }

  app.get("/health", async (_req, res) => {
    const pythonHealthy = await checkPythonHealth();
    res.status(200).json({ status: "ok", pythonAiService: pythonHealthy ? "up" : "unreachable" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/workspaces", workspaceRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
