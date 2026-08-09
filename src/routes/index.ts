import { Router } from "express";
import categoriesRouter from "./categories.routes";
import authRouter from "./auth.routes";
import adsRouter from "./ads.routes";
import favoritesRouter from "./favorites.routes";
import userRouter from "./user.routes";

const router = Router();

router.use("/ads", adsRouter);
router.use("/user", userRouter);
router.use("/categories", categoriesRouter);
router.use("/auth", authRouter);
router.use("/favorites", favoritesRouter);

export default router;
