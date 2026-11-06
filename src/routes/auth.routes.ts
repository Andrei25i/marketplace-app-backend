import { Router } from "express";
import { authLimiter, sessionLimiter } from "../middlewares/authLimiter";
import { authMiddleware } from "../middlewares/auth.middleware";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  changePasswordBody,
  forgotPasswordBody,
  loginBody,
  registerBody,
  resetPasswordBody,
  sessionIdParams,
} from "../schemas/auth.schema";

const router = Router();
const authController = new AuthController();

router.post(
  "/register",
  authLimiter,
  validate({ body: registerBody }),
  authController.register,
);
router.post(
  "/login",
  authLimiter,
  validate({ body: loginBody }),
  authController.login,
);
router.post(
  "/forgot-password",
  authLimiter,
  validate({ body: forgotPasswordBody }),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  authLimiter,
  validate({ body: resetPasswordBody }),
  authController.resetPassword,
);

router.post("/refresh", sessionLimiter, authController.refresh);
router.post("/logout", sessionLimiter, authController.logout);

router.post(
  "/change-password",
  authLimiter,
  authMiddleware,
  validate({ body: changePasswordBody }),
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
  validate({ params: sessionIdParams }),
  authController.revokeSession,
);

export default router;
