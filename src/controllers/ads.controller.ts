import { Request, Response } from "express";
import { AdsService } from "../services/ads.service";
import { MediaService, UploadedMedia } from "../services/media.service";
import { adImagePublicId, isOwnedBy, userTag } from "../utils/mediaPaths";
import { getValidated } from "../middlewares/validate.middleware";
import type {
  AdIdParams,
  AdImage,
  AdInput,
  DeleteImagesInput,
  GetAdsFilters,
} from "../types/ads.type";

const FORBIDDEN_IMAGES = "Nu ai permisiunea să folosești aceste imagini.";

const ownsAllImages = (images: AdImage[], userId: string) =>
  images.every((img) => isOwnedBy(img.public_id, userId));

export class AdsController {
  private adsService = new AdsService();
  private mediaService = new MediaService();

  getAll = async (req: Request, res: Response) => {
    const filters = getValidated<GetAdsFilters>(req, "query");

    try {
      const ads = await this.adsService.getAllAds(filters);
      return res.status(200).json(ads);
    } catch (error) {
      console.error("Eroare la preluarea anunțurilor:", error);
      return res
        .status(500)
        .json({ error: "Eroare la preluarea anunțurilor." });
    }
  };

  getById = async (req: Request, res: Response) => {
    const { id } = getValidated<AdIdParams>(req, "params");

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

    const body = req.body as AdInput;
    if (!ownsAllImages(body.images, loggedUserId)) {
      return res.status(403).json({ error: FORBIDDEN_IMAGES });
    }

    try {
      const newAd = await this.adsService.createAd({
        ...body,
        user_id: loggedUserId,
      });
      return res.status(201).json(newAd);
    } catch (error) {
      console.error("Eroare la crearea anunțului:", error);
      return res.status(500).json({ error: "Eroare internă a serverului." });
    }
  };

  delete = async (req: Request, res: Response) => {
    const loggedUserId = req.user?.id;
    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    const { id } = getValidated<AdIdParams>(req, "params");

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
    const loggedUserId = req.user?.id;
    if (!loggedUserId) {
      return res.status(401).json({ error: "Neautorizat." });
    }

    const { id } = getValidated<AdIdParams>(req, "params");
    const body = req.body as AdInput;

    if (!ownsAllImages(body.images, loggedUserId)) {
      return res.status(403).json({ error: FORBIDDEN_IMAGES });
    }

    try {
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

    const { publicIds } = req.body as DeleteImagesInput;

    if (!publicIds.every((id) => isOwnedBy(id, loggedUserId))) {
      return res.status(403).json({
        error: "Nu ai permisiunea să ștergi aceste imagini.",
      });
    }

    await this.mediaService.deleteByPublicIds(publicIds);
    return res.status(204).send();
  };
}
