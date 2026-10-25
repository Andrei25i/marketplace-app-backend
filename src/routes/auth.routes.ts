import { Router } from "express";
import { authLimiter, sessionLimiter } from "../middlewares/authLimiter";
import { authMiddleware } from "../middlewares/auth.middleware";
import { AuthController } from "../controllers/auth.controller";

const router = Router();
const authController = new AuthController();

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password", authLimiter, authController.resetPassword);

router.post("/refresh", sessionLimiter, authController.refresh);
router.post("/logout", sessionLimiter, authController.logout);

router.post(
  "/change-password",
  authLimiter,
  authMiddleware,
  authController.changePassword,
);

router.get(
  "/sessions",
  sessionLimiter,
  authMiddleware,
  authController.listSessions,
);
router.delete(
  "/sessions",
  sessionLimiter,
  authMiddleware,
  authController.revokeOtherSessions,
);
router.delete(
  "/sessions/:id",
  sessionLimiter,
  authMiddleware,
  authController.revokeSession,
);

export default router;
