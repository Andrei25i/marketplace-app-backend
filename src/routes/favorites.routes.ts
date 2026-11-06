import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { FavoritesController } from "../controllers/favorites.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  favoriteAdParams,
  getFavoritesQuery,
} from "../schemas/favorites.schema";

const router = Router();
const favoritesController = new FavoritesController();

router.get(
  "/",
  authMiddleware,
  validate({ query: getFavoritesQuery }),
  favoritesController.getAll,
);
router.post(
  "/:adId",
  authMiddleware,
  validate({ params: favoriteAdParams }),
  favoritesController.add,
);
router.delete(
  "/:adId",
  authMiddleware,
  validate({ params: favoriteAdParams }),
  favoritesController.delete,
);

export default router;
