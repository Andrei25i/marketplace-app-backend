import { Request } from "express";
import rateLimit from "express-rate-limit";
import { chatConfig } from "../config/chat.config";

export const messageLimiter = rateLimit({
  windowMs: chatConfig.messageRateWindowMs,
  max: chatConfig.messageRateMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.user?.id ?? "anonymous",
  message: {
    error: "Trimiți mesaje prea repede. Așteaptă câteva momente.",
  },
});
