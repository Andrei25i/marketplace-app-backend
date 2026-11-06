import { Router } from "express";
import { AdsController } from "../controllers/ads.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  adBody,
  adIdParams,
  deleteImagesBody,
  getAdsQuery,
} from "../schemas/ads.schema";

const router = Router();
const adsController = new AdsController();

router.get("/", validate({ query: getAdsQuery }), adsController.getAll);
router.get("/:id", validate({ params: adIdParams }), adsController.getById);
router.post(
  "/",
  authMiddleware,
  validate({ body: adBody }),
  adsController.create,
);
router.post(
  "/photos",
  authMiddleware,
  upload.array("images", 10),
  adsController.uploadImages,
);
router.delete(
  "/photos",
  authMiddleware,
  validate({ body: deleteImagesBody }),
  adsController.deleteImages,
);
router.delete(
  "/:id",
  authMiddleware,
  validate({ params: adIdParams }),
  adsController.delete,
);
router.put(
  "/:id",
  authMiddleware,
  validate({ params: adIdParams, body: adBody }),
  adsController.update,
);

export default router;
