import { Request } from "express";
import rateLimit from "express-rate-limit";
import { reviewsConfig } from "../config/reviews.config";

export const reviewWriteLimiter = rateLimit({
  windowMs: reviewsConfig.writeRateWindowMs,
  max: reviewsConfig.writeRateMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id ?? "anonymous",
  message: {
    error:
      "Ai modificat recenziile prea des. Încearcă din nou în câteva minute.",
  },
});
