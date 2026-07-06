import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { statsHandler } from "./dashboard.controller";

const router = Router();

router.use(requireAuth);
router.get("/stats", statsHandler);

export default router;
