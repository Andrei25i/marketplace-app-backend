import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  deleteAccountBody,
  updateProfileBody,
  userIdParams,
} from "../schemas/user.schema";

const router = Router();
const userController = new UserController();

router.get("/me", authMiddleware, userController.getMe);
router.get(
  "/:id",
  validate({ params: userIdParams }),
  userController.getPublicUser,
);
router.delete(
  "/",
  authMiddleware,
  validate({ body: deleteAccountBody }),
  userController.deleteAccount,
);
router.put(
  "/",
  authMiddleware,
  validate({ body: updateProfileBody }),
  userController.updateProfile,
);

export default router;
