import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { FavoritesController } from "../controllers/favorites.controller";

const router = Router();
const favoritesController = new FavoritesController();

router.get("/", authMiddleware, favoritesController.getAll);
router.post("/:adId", authMiddleware, favoritesController.add);
router.delete("/:adId", authMiddleware, favoritesController.delete);

export default router;
