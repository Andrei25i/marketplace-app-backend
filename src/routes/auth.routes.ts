import { Router } from "express";
import { authLimiter } from "../middlewares/authLimiter";
import { AuthController } from "../controllers/auth.controller";

const router = Router();
const authController = new AuthController();

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
// forgot password
// reset password

export default router;
