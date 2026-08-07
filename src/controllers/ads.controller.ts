import { Request, Response } from "express";
import { AdsService } from "../services/ads.service";
import { UpdateAdDTO } from "../types/ads.types";

export class AdsController {
  private adsService = new AdsService();

  getAll = async (req: Request, res: Response) => {
    try {
      const ads = await this.adsService.getAllAds(req.query);

      return res.status(200).json(ads);
    } catch (error) {
      console.error("Eroare la preluarea anunțurilor:", error);
      return res
        .status(500)
        .json({ error: "Eroare la preluarea anunțurilor." });
    }
  };

  getById = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res
        .status(400)
        .json({ error: "ID-ul anunțului este invalid sau lipsește." });
    }

    try {
      const ad = await this.adsService.getAdById(id);

      if (!ad) {
        return res.status(404).json({ error: "Anunțul nu a fost găsit." });
      }

      return res.status(200).json(ad);
    } catch (error) {
      console.error(`Eroare la preluarea anunțului cu ID ${id}:`, error);
      return res.status(500).json({ error: "Eroare la preluarea anunțului." });
    }
  };

  create = async (req: Request, res: Response) => {
    const loggedUserId = req.user?.id;

    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    const { title, description, price, currency, images, category_id, city } =
      req.body;

    if (
      !title ||
      !description ||
      !price ||
      !images ||
      !Array.isArray(images) ||
      images.length === 0 ||
      !category_id ||
      !city
    ) {
      return res.status(400).json({
        error: "Toate câmpurile și cel puțin o imagine sunt obligatorii.",
      });
    }

    try {
      const newAd = await this.adsService.createAd({
        title,
        description,
        price: parseFloat(price),
        currency,
        images,
        category_id: parseInt(category_id),
        city,
        user_id: loggedUserId,
      });

      return res.status(201).json(newAd);
    } catch (error) {
      console.error("Eroare la crearea anunțului:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    const loggedUserId = req.user?.id;

    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "ID-ul anunțului este invalid." });
    }

    try {
      await this.adsService.deleteAd(id, loggedUserId);

      return res
        .status(200)
        .json({ message: "Anunțul a fost șters cu succes." });
    } catch (error) {
      if (error instanceof Error && error.message === "NOT_FOUND") {
        return res.status(404).json({ error: "Anunțul nu a fost găsit." });
      }

      if (error instanceof Error && error.message === "FORBIDDEN") {
        return res.status(403).json({
          error:
            "Acțiune interzisă. Nu aveți permisiunea să ștergeți acest anunț.",
        });
      }

      console.error("Eroare la ștergerea anunțului:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const loggedUserId = req.user?.id;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "ID-ul anunțului este invalid." });
    }

    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    const body: UpdateAdDTO = req.body;
    if (
      !body.title ||
      !body.description ||
      !body.price ||
      !body.images ||
      !Array.isArray(body.images) ||
      body.images.length === 0 ||
      !body.category_id ||
      !body.city
    ) {
      return res.status(400).json({
        error:
          "Toate câmpurile sunt obligatorii și trebuie să existe cel puțin o imagine.",
      });
    }

    const isValidImages = body.images.every((img) => img.url && img.public_id);
    if (!isValidImages) {
      return res
        .status(400)
        .json({ error: "Structura imaginilor este invalidă." });
    }

    try {
      body.price = parseFloat(body.price.toString());
      const updatedAd = await this.adsService.updateAd(id, loggedUserId, body);
      return res.status(200).json(updatedAd);
    } catch (error) {
      if (error instanceof Error && error.message === "NOT_FOUND") {
        return res.status(404).json({ error: "Anunțul nu a fost găsit." });
      }

      if (error instanceof Error && error.message === "FORBIDDEN") {
        return res.status(403).json({
          error:
            "Acțiune interzisă. Nu aveți permisiunea să editați acest anunț.",
        });
      }

      console.error("Eroare la actualizarea anunțului:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };
}
