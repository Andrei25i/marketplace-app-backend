import { Request, Response } from "express";
import { CategoriesService } from "../services/categories.service";

export class CategoriesController {
  private categoriesService = new CategoriesService();

  getAllCategories = async (req: Request, res: Response) => {
    try {
      const sort = typeof req.query.sort === "string" ? req.query.sort : "id";

      const categories = await this.categoriesService.getAllCategories(sort);

      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Eroare la preluarea categoriilor" });
    }
  };

  getCategoryById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);

      if (isNaN(id)) {
        return res
          .status(400)
          .json({ error: "ID-ul trebuie să fie un număr valid" });
      }

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
