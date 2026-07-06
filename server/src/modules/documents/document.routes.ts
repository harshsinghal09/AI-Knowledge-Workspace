import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { uploadDocument } from "../../middleware/upload.middleware";
import {
  uploadHandler,
  listHandler,
  statusHandler,
  deleteHandler,
  indexCallbackHandler
} from "./document.controller";

const router = Router();

// Internal callback from the Python service — must be registered before requireAuth.
router.post("/index-callback", indexCallbackHandler);

router.use(requireAuth);
router.post("/", uploadDocument, uploadHandler);
router.get("/", listHandler);
router.get("/:id/status", statusHandler);
router.delete("/:id", deleteHandler);

export default router
