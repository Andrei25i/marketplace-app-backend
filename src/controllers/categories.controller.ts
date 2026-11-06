import { Request, Response } from "express";
import { CategoriesService } from "../services/categories.service";
import { getValidated } from "../middlewares/validate.middleware";
import type {
  CategoryIdParams,
  GetCategoriesFilters,
} from "../types/categories.type";

export class CategoriesController {
  private categoriesService = new CategoriesService();

  getAllCategories = async (req: Request, res: Response) => {
    const { sort } = getValidated<GetCategoriesFilters>(req, "query");

    try {
      const categories = await this.categoriesService.getAllCategories(sort);
      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Eroare la preluarea categoriilor" });
    }
  };

  getCategoryById = async (req: Request, res: Response) => {
    const { id } = getValidated<CategoryIdParams>(req, "params");

    try {
      const category = await this.categoriesService.getCategoryById(id);

      if (!category) {
        return res.status(404).json({ error: "Categoria nu a fost găsită" });
      }

      res.json(category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Eroare la preluarea categoriei" });
    }
  };
}
