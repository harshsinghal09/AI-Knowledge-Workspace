import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { askHandler, historyHandler } from "./chat.controller";

const router = Router();

router.use(requireAuth);
router.post("/", askHandler);
router.get("/", historyHandler);

export default router;
