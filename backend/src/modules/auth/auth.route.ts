import { Router } from "express";
import {
  loginController,
  meController,
  registerController,
} from "./auth.controller";
import { authMiddleware } from "../../common/middleware/auth.middleware";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.get("/me", authMiddleware, meController);

export default router;