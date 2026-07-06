import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { createHandler, listHandler, getHandler, deleteHandler } from "./workspace.controller";

const router = Router();

router.use(requireAuth);
router.post("/", createHandler);
router.get("/", listHandler);
router.get("/:id", getHandler);
router.delete("/:id", deleteHandler);

export default router;
