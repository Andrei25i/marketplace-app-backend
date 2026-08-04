import { Router } from "express";
import categoriesRouter from "./categories.routes";
import authRouter from "./auth.routes";

const router = Router();

// router.use("/ads", adsRouter);
// router.use("/user", userRouter);
router.use("/categories", categoriesRouter);
router.use("/auth", authRouter);
// router.use("/favorites", favoritesRouter);

export default router;
