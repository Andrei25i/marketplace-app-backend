import { Router } from "express";
import { AdsController } from "../controllers/ads.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const adsController = new AdsController();

router.get("/", adsController.getAll);
router.get("/:id", adsController.getById);
router.post("/", authMiddleware, adsController.create);
router.delete("/:id", authMiddleware, adsController.delete);
router.put("/:id", authMiddleware, adsController.update);

export default router;
