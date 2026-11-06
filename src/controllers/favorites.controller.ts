import { Request, Response } from "express";
import { FavoritesService } from "../services/favorites.service";
import { getValidated } from "../middlewares/validate.middleware";
import type {
  FavoriteAdParams,
  GetFavoritesFilters,
} from "../types/favorites.type";

export class FavoritesController {
  private favoritesService = new FavoritesService();

  getAll = async (req: Request, res: Response) => {
    const loggedUserId = req.user?.id;
    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    const filters = getValidated<GetFavoritesFilters>(req, "query");

    try {
      const favorites = await this.favoritesService.getFavoriteAds(
        loggedUserId,
        filters,
      );

      return res.status(200).json(favorites);
    } catch (error) {
      console.error("Eroare la preluarea anunțurilor favorite:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  add = async (req: Request, res: Response) => {
    const loggedUserId = req.user?.id;
    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    const { adId } = getValidated<FavoriteAdParams>(req, "params");

    try {
      const favorite = await this.favoritesService.addFavorite(
        adId,
        loggedUserId,
      );

      return res.status(201).json({
        message: "Anunț adăugat la favorite cu succes.",
        favorite,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "NOT_FOUND") {
        return res
          .status(404)
          .json({ error: "Anunțul nu există sau a fost șters." });
      }

      if (error instanceof Error && error.message === "ALREADY_FAVORITED") {
        return res
          .status(400)
          .json({ error: "Anunțul este deja în lista de favorite." });
      }

      console.error("Eroare la adăugarea la favorite:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  delete = async (req: Request, res: Response) => {
    const loggedUserId = req.user?.id;
    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    const { adId } = getValidated<FavoriteAdParams>(req, "params");

    try {
      const deletedFavorite = await this.favoritesService.deleteFavorite(
        adId,
        loggedUserId,
      );

      return res.status(200).json({
        message: "Anunțul a fost șters de la favorite cu succes.",
        deletedFavorite,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "FAVORITE_NOT_FOUND") {
        return res
          .status(404)
          .json({ error: "Anunțul de la favorite nu a fost găsit." });
      }

      console.error("Eroare la ștergerea de la favorite:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };
}
