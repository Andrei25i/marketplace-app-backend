import { Request, Response } from "express";
import { AdsService } from "../services/ads.service";

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
}
