import { Request, Response } from "express";
import { AdsService } from "../services/ads.service";
import { MediaService, UploadedMedia } from "../services/media.service";
import { UpdateAdDTO } from "../types/ads.type";
import { adImagePublicId, isOwnedBy, userTag } from "../utils/mediaPaths";

const MAX_AD_IMAGES = 10;

function validateAdImages(images: unknown, userId: string): string | null {
  if (!Array.isArray(images) || images.length === 0) {
    return "Trebuie să existe cel puțin o imagine.";
  }
  if (images.length > MAX_AD_IMAGES) {
    return `Poți folosi maximum ${MAX_AD_IMAGES} imagini.`;
  }

  const urlPrefix = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;
  const allValid = images.every(
    (img) =>
      img &&
      typeof img === "object" &&
      isOwnedBy(img.public_id, userId) &&
      typeof img.url === "string" &&
      img.url.startsWith(urlPrefix) &&
      img.url.includes(img.public_id),
  );
  if (!allValid) {
    return "Structura imaginilor este invalidă.";
  }

  const ids = images.map((img) => img.public_id);
  if (new Set(ids).size !== ids.length) {
    return "Aceeași imagine apare de mai multe ori.";
  }

  return null;
}

export class AdsController {
  private adsService = new AdsService();
  private mediaService = new MediaService();

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

    const {
      title,
      description,
      price,
      phone_number,
      currency,
      images,
      category_id,
      city,
    } = req.body;

    const imagesError = validateAdImages(images, loggedUserId);
    if (imagesError) {
      return res.status(400).json({ error: imagesError });
    }

    if (
      !title ||
      !description ||
      !price ||
      !phone_number ||
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
        phone_number,
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
      !body.phone_number ||
      !body.category_id ||
      !body.city
    ) {
      return res.status(400).json({
        error:
          "Toate câmpurile sunt obligatorii și trebuie să existe cel puțin o imagine.",
      });
    }

    const imagesError = validateAdImages(body.images, loggedUserId);
    if (imagesError) {
      return res.status(400).json({ error: imagesError });
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

  uploadImages = async (req: Request, res: Response) => {
    const loggedUserId = req.user?.id;
    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Nicio imagine validă trimisă." });
    }

    const results = await Promise.allSettled(
      files.map((file) =>
        this.mediaService.uploadBuffer({
          buffer: file.buffer,
          publicId: adImagePublicId(loggedUserId),
          tags: [userTag(loggedUserId), "ads"],
        }),
      ),
    );

    const uploaded = results
      .filter(
        (r): r is PromiseFulfilledResult<UploadedMedia> =>
          r.status === "fulfilled",
      )
      .map((r) => r.value);

    if (uploaded.length !== files.length) {
      results
        .filter((r) => r.status === "rejected")
        .forEach((r) =>
          console.error("Upload eșuat:", (r as PromiseRejectedResult).reason),
        );
      await this.mediaService.deleteByPublicIds(
        uploaded.map((u) => u.public_id),
      );
      return res
        .status(500)
        .json({ error: "Imaginile nu au putut fi încărcate." });
    }

    return res
      .status(201)
      .json(uploaded.map(({ url, public_id }) => ({ url, public_id })));
  };

  deleteImages = async (req: Request, res: Response) => {
    const loggedUserId = req.user?.id;
    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    const { publicIds } = req.body;
    if (
      !Array.isArray(publicIds) ||
      publicIds.length > 100 ||
      !publicIds.every((id) => typeof id === "string")
    ) {
      return res.status(400).json({ error: "Lista public_id este invalidă" });
    }

    if (!publicIds.every((id) => isOwnedBy(id, loggedUserId))) {
      return res.status(403).json({
        error: "Nu ai permisiunea să ștergi aceste imagini.",
      });
    }

    await this.mediaService.deleteByPublicIds(publicIds);
    return res.status(204).send();
  };
}
