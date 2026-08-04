import { Router } from "express";
import { CategoriesController } from "../controllers/categories.controller";

const router = Router();
const categoriesController = new CategoriesController();

router.get("/", categoriesController.getAllCategories);
router.get("/:id", categoriesController.getCategoryById);

export default router;
