import { Router } from "express";
import { signupHandler, loginHandler, refreshHandler, logoutHandler } from "./auth.controller";
import { requireAuth } from "../../middleware/auth.middleware";

const router = Router();

router.post("/signup", signupHandler);
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", requireAuth, logoutHandler);

export default router;
