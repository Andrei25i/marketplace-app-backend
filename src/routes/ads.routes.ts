import { Router } from "express";
import { AdsController } from "../controllers/ads.controller";

const router = Router();
const adsController = new AdsController();

router.get("/", adsController.getAll);
router.get("/:id", adsController.getById);

export default router;
