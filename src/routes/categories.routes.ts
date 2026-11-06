import { Router } from "express";
import { CategoriesController } from "../controllers/categories.controller";
import { validate } from "../middlewares/validate.middleware";
import {
  categoryIdParams,
  getCategoriesQuery,
} from "../schemas/categories.schema";

const router = Router();
const categoriesController = new CategoriesController();

router.get(
  "/",
  validate({ query: getCategoriesQuery }),
  categoriesController.getAllCategories,
);
router.get(
  "/:id",
  validate({ params: categoryIdParams }),
  categoriesController.getCategoryById,
);

export default router;
